#!/usr/bin/env python3
"""Pre-renders the DataLink Rover 3D views as still pictures, for browsers that can't draw WebGL.

Some browsers can't create a WebGL context: WebGL switched off, blocked by a policy, no usable GPU, or an AI agent's
headless browser. Without these stills the rover page is empty for them. This script opens the site in headless Chromium
(SwiftShader draws WebGL on the CPU), puts the real 3D view in every pose the page uses and saves each frame:

  card               the rover as it rests on the Projects card (also the picture shown while the 3D view loads)
  select layers      floor, pads, controller, link and rover of the pick screen, one picture each (hover lifts one)
  rover / remote     hero, taken apart and each of the eight parts of both stories
  + the label positions (pick buttons, part labels) for each picture

for a wide screen (1600 x 1000) and a tall one (400 x 866). Everything goes to site/assets/stills/ and
assets/js/datalink-stills.js shows it. Run it again after a model changes:

  python3 -m venv .venv && . .venv/bin/activate
  pip install -r tools/requirements-stills.txt && playwright install chromium
  python3 tools/bake_stills.py            (about 3 minutes)
"""
import argparse, base64, functools, http.server, io, json, pathlib, shutil, socketserver, threading, time
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = ROOT / 'site'
OUT = SITE / 'assets' / 'stills'
# rendered at dpr, saved at out (pixels per CSS pixel): a 2x render scaled down is cleaner than the GPU's own antialiasing
LAYOUTS = {'wide': dict(vw=1600, vh=1000, dpr=2, out=1.25), 'tall': dict(vw=400, vh=866, dpr=2, out=2)}
CARD = dict(w=1100, h=803, sizes=(1400, 700))      # the card window is about 1.37 : 1 on every screen
STORY = ['hero', 'explode'] + [f'p{k}' for k in range(8)]
# the dimmed parts are see-through, so the alpha channel carries real detail; at 60 it is half the size and looks the same
# (mean difference 0.3 / 255 over the page's dark background)
WEBP = dict(quality=78, alpha_quality=60, method=6)
GL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']

# one exact frame: the pose the page would ease to, without the idle sway, the spin (the card keeps its start angle) or any hover, only the chosen layers
JS_SHOT = r"""async ({mode, story, layers, hot, spin}) => {
  const d = DL3D, B = d._bake();
  if (d._dbg().LOD.watch) d._dbg().LOD.watch = null;           // a slow software frame must not swap the light models back
  d.go(mode, {dur: 0}); if (story) d.story(story);
  for (const k of ['r','m','l','rT','mT','lT','cx','cy','cxT','cyT']) B.hov[k] = 0;
  Object.assign(B.cur, d.pose()); B.cur.rSway = B.cur.mSway = 0; B.setSpin(spin ? B.cardYaw : 0); B.apply(0);
  const groups = {rover: [B.rover.root, B.rover.shadow], remote: [B.remote.root, B.remote.shadow], link: [B.link && B.link.g],
                  padR: [B.padR], padM: [B.padM], floor: [B.floorM]};
  if (layers) for (const [k, list] of Object.entries(groups)) if (!layers.includes(k)) list.forEach(o => o && (o.visible = false));
  if (hot) for (const p of [B.padR, B.padM]) p.material.uniforms.uHot.value = 1;
  B.ren.render(B.scene, B.cam);
  const url = B.ren.domElement.toDataURL('image/png');
  for (const p of [B.padR, B.padM]) p.material.uniforms.uHot.value = 0;
  const anchors = {};
  const names = mode === 'select' ? ['rover', 'roverTop', 'remote', 'remoteTop', 'link']
              : story && story.type === 'explode' ? d.stops(mode).map(k => mode + ':' + k) : [];
  for (const n of names) { const a = d.anchor(n); if (a) anchors[n] = [a.x, a.y]; }
  B.apply(0);
  return {url, anchors, size: d.size, lod: d.lod};
}"""

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

def serve():
    h = functools.partial(Quiet, directory=str(SITE))
    srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), h)
    srv.daemon_threads = True
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f'http://127.0.0.1:{srv.server_address[1]}/?season=none'

def png(url):
    return Image.open(io.BytesIO(base64.b64decode(url.split(',', 1)[1]))).convert('RGBA')

def crop(im, pad=4):
    """the picture trimmed to what is drawn (plus a margin) and where that sits in the frame, in fractions of it"""
    a = im.getchannel('A').point(lambda v: 255 if v > 2 else 0)
    box = a.getbbox()
    if not box: return None, None
    x0, y0, x1, y1 = max(0, box[0] - pad), max(0, box[1] - pad), min(im.width, box[2] + pad), min(im.height, box[3] + pad)
    return im.crop((x0, y0, x1, y1)), [round(x0 / im.width, 5), round(y0 / im.height, 5), round((x1 - x0) / im.width, 5), round((y1 - y0) / im.height, 5)]

def save(im, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, 'WEBP', **WEBP)
    return path.stat().st_size

def ready(page, timeout=240):
    """the 3D view is up with both detailed models in"""
    page.wait_for_function('window.DL3D && DL3D.ok && DL3D.remoteReady', timeout=timeout * 1000)
    page.evaluate('(() => { const L = DL3D._dbg().LOD; if (!L.started) { L.started = true; DL3D.loadHi(); } })()')
    page.wait_for_function("DL3D.lod === 'hi' && DL3D._dbg().LOD.hi.rover && DL3D._dbg().LOD.hi.remote", timeout=timeout * 1000, polling=500)
    page.evaluate('DL3D._dbg().LOD.watch = null')
    # from here on every frame is drawn by hand: the live loop would keep redrawing a 2x frame in software and stall the page
    page.evaluate('DL3D.setVis(false); DL3D.setVis = () => {}; DL3D.keep = () => {}')

def bake(only=None):
    srv, url = serve()
    meta = {'v': 1, 'made': time.strftime('%Y-%m-%d')}
    total = 0
    if OUT.exists() and not only: shutil.rmtree(OUT)
    with sync_playwright() as pw:
        br = pw.chromium.launch(args=GL_ARGS)
        for name, L in LAYOUTS.items():
            if only and name != only and not (only == 'card' and name == 'wide'): continue
            ctx = br.new_context(viewport={'width': L['vw'], 'height': L['vh']}, device_scale_factor=L['dpr'], reduced_motion='reduce')
            ctx.add_init_script("Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>8});Object.defineProperty(navigator,'deviceMemory',{get:()=>8})")
            page = ctx.new_page()
            page.on('pageerror', lambda e: print('  page error:', e))
            page.goto(url)
            page.wait_for_timeout(1200)
            page.evaluate("document.querySelector('[data-go=\"projects\"]').click()")
            ready(page)
            print(f'{name}: models ready')
            scale = L['out'] / L['dpr']
            M = {'w': L['vw'], 'h': L['vh'], 'img': {}, 'at': {}}
            if only != 'card': meta[name] = M

            def shot(key, mode, story=None, layers=None, hot=False):
                nonlocal total
                r = page.evaluate(JS_SHOT, {'mode': mode, 'story': story, 'layers': layers, 'hot': hot, 'spin': False})
                assert r['lod'] == 'hi', 'the detailed models were swapped out'
                im = png(r['url'])
                im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS) if scale != 1 else im
                c, rect = crop(im)
                if c is None: return
                total += save(c, OUT / name / f'{key}.webp')
                M['img'][key] = rect
                for k, (x, y) in r['anchors'].items(): M['at'][k] = [round(x / L['vw'], 5), round(y / L['vh'], 5)]

            if name == 'wide' and only in (None, 'card'):
                # the card: the canvas in a box of the card window's shape, the rover at rest at the angle the live view starts from.
                # Saved as the whole frame (the empty part costs next to nothing), so object-fit: contain places it exactly as the
                # live card camera places the model, at any window size; box = where the rover is in it, for the fly
                page.evaluate("""([w,h]) => {const b=document.createElement('div');b.id='bake-card';
                    Object.assign(b.style,{position:'fixed',left:'0',top:'0',width:w+'px',height:h+'px',zIndex:99});document.body.appendChild(b);
                    DL3D.mount(b);DL3D.go('card',{dur:0})}""", [CARD['w'], CARD['h']])
                page.wait_for_timeout(600)
                r = page.evaluate(JS_SHOT, {'mode': 'card', 'story': None, 'layers': ['rover'], 'hot': False, 'spin': True})
                full = png(r['url'])
                box = crop(full)[1]
                meta['card'] = {'w': CARD['w'], 'h': CARD['h'], 'box': box, 'sizes': list(CARD['sizes'])}
                for s in CARD['sizes']:
                    total += save(full.resize((s, round(s * CARD['h'] / CARD['w'])), Image.LANCZOS), OUT / f'card-{s}.webp')
                page.evaluate("document.getElementById('bake-card').remove()")
                print('  card')

            if only == 'card':
                ctx.close(); continue
            page.evaluate("DL.enter()")
            page.wait_for_function("DL.level === 1", timeout=20000)
            page.wait_for_timeout(800)
            for layer in ['floor', 'padM', 'padR', 'remote', 'link', 'rover']:
                shot(layer, 'select', layers=[layer], hot=layer.startswith('pad'))
            print('  pick screen')
            for mode in ['rover', 'remote']:
                page.evaluate(f"DL.pick('{mode}')")
                page.wait_for_function(f"DL.mode === '{mode}'", timeout=20000)
                page.wait_for_timeout(900)                     # the cards lay out; the page tells the 3D view where they start
                shot(f'{mode}-hero', mode, {'type': 'hero', 'k': 0, 't': 0}, layers=['rover' if mode == 'rover' else 'remote'])
                shot(f'{mode}-explode', mode, {'type': 'explode', 'k': 0, 't': 1}, layers=['rover' if mode == 'rover' else 'remote'])
                for k in range(8):
                    shot(f'{mode}-p{k}', mode, {'type': 'part', 'k': k, 't': 1}, layers=['rover' if mode == 'rover' else 'remote'])
                print(f'  {mode} story')
            ctx.close()
        br.close()
    srv.shutdown()
    js = OUT / 'stills.js'
    old = {}
    if only and js.exists():
        old = json.loads(js.read_text().split('=', 1)[1].split(';\n', 1)[0])
        old.update(meta); meta = old
    js.write_text('/* made by tools/bake_stills.py: where each pre-rendered picture sits in its frame and where its labels go */\n'
                  'window.DL_STILLS=' + json.dumps(meta, separators=(',', ':')) + ";\ndispatchEvent(new Event('dl-stills'));\n")
    print(f'done: {total / 1e6:.2f} MB of pictures in {OUT.relative_to(ROOT)}')

if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--only', choices=list(LAYOUTS) + ['card'], help='bake only this part and keep the rest')
    bake(ap.parse_args().only)
