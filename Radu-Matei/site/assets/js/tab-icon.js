/* Tab icon: a small prism, the same one as on the island.
   - While the page is open and focused, its edge slowly runs through the six page colours.
   - When you switch away, the colours stop and the prism turns. Browsers wake background tabs about once a second,
     so there it turns in steps, like a clock hand; in a visible but unfocused window it turns smoothly.
   - With "reduce motion" switched on, or where the browser ignores icon changes, the static favicon.svg stays.
   It redraws a 64 px canvas a few times a second at most, which costs next to nothing.
   The frames are drawn in a worker (this same file, on an OffscreenCanvas) and only the finished picture comes back: reading
   a canvas back on the page (toDataURL) makes the page wait for the graphics card to finish everything queued before it, the
   3D view and the light included, which stutters them. Browsers without canvases in workers draw it on the page, as before. */
(() => {
  const S = 64;
  const COLS = ['#FF5A6A', '#FF9F43', '#FFE14D', '#5CF59A', '#4DC8FF', '#9B7BFF'].map(h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)));
  const R = 22, V = [[0, -R], [R * .866, R / 2], [-R * .866, R / 2]];          // triangle around its centre
  const col = k => { const n = COLS.length, i = Math.floor(k) % n, f = k - Math.floor(k), a = COLS[i], b = COLS[(i + 1) % n];
    return `rgb(${a.map((v, j) => Math.round(v + (b[j] - v) * f)).join(',')})` };

  /* one frame of the icon */
  function paint(g, hue, ang, on) {
    g.clearRect(0, 0, S, S);
    g.beginPath(); g.roundRect(2, 2, 60, 60, 15); g.fillStyle = '#0B0D14'; g.fill();
    g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.14)'; g.stroke();
    g.save(); g.translate(32, 34); g.rotate(ang);
    g.beginPath(); V.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath();
    const fill = g.createLinearGradient(0, -R, 0, R / 2); fill.addColorStop(0, 'rgba(255,255,255,.3)'); fill.addColorStop(1, 'rgba(185,197,255,.08)');
    g.fillStyle = fill; g.fill();
    const edge = g.createLinearGradient(-R, -R, R, R);
    edge.addColorStop(0, col(hue)); edge.addColorStop(.5, col(hue + 2)); edge.addColorStop(1, col(hue + 4));
    g.globalAlpha = on ? 1 : .8; g.lineWidth = 4.5; g.lineJoin = 'round'; g.strokeStyle = edge; g.stroke();
    g.restore();
  }

  /* in the worker: draw the frame it is sent, encode it there, send the picture back */
  if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
    const oc = new OffscreenCanvas(S, S), g = oc.getContext('2d');
    self.onmessage = e => { const m = e.data; paint(g, m.hue, m.ang, m.on);
      oc.convertToBlob({type: 'image/png'}).then(b => self.postMessage(b), () => self.postMessage(null)) };
    return;
  }

  const link = document.getElementById('tab-icon');
  if (!link || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const TURN = 45 * Math.PI / 180;                                              // 45 degrees a second: never a multiple of 120, so each step looks like a turn
  let hue = 0, ang = 0, last = performance.now(), timer = 0;
  const active = () => !document.hidden && document.hasFocus();

  /* where frames are drawn: in the worker when the browser can, on the page otherwise (or if the worker fails) */
  let worker = null, waiting = false, cv = null, g = null;
  const onPage = () => { if (worker) { try { worker.terminate() } catch (e) {} worker = null } waiting = false;
    if (!cv) { cv = document.createElement('canvas'); cv.width = cv.height = S; g = cv.getContext('2d') } };
  const src = document.currentScript && document.currentScript.src;
  try {
    if (src && typeof Worker === 'function' && typeof OffscreenCanvas === 'function' && OffscreenCanvas.prototype.convertToBlob) {
      worker = new Worker(src);
      worker.onmessage = e => { if (!e.data) { onPage(); return }
        const r = new FileReader(); r.onload = () => { link.href = r.result; waiting = false }; r.onerror = () => { waiting = false }; r.readAsDataURL(e.data) };
      worker.onerror = e => { e.preventDefault(); onPage() };
    }
  } catch (e) { worker = null }
  if (!worker) onPage();

  function draw(on) {
    if (worker) { if (!waiting) { waiting = true; worker.postMessage({hue, ang, on}) } return }   // a frame still on its way: this one is skipped
    if (!g) return;
    paint(g, hue, ang, on);
    link.href = cv.toDataURL('image/png');
  }
  function tick() {
    const now = performance.now(), dt = Math.min(now - last, 1500) / 1000, on = active(); last = now;
    if (on) hue = (hue + dt * .5) % COLS.length;                                // a new colour every two seconds
    else ang = (ang + dt * TURN) % (Math.PI * 2);
    draw(on);
    timer = setTimeout(tick, on ? 160 : 100);
  }
  const wake = () => { clearTimeout(timer); last = performance.now(); tick() };
  // start once the page has settled, so the icon never competes with the page's own start-up (light worker, 3D)
  const start = () => setTimeout(() => {
    addEventListener('focus', wake); addEventListener('blur', wake); document.addEventListener('visibilitychange', wake); wake() }, 6000);
  document.readyState === 'complete' ? start() : addEventListener('load', start, {once: true});
})();
