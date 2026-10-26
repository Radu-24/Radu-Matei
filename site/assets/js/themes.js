/* The time of year: what the site wears for an event or the season (SEASON in index.html picks which, and when).
   Three sets of pieces, every one a picture drawn once (an SVG image) that only the compositor moves (transform, opacity):
   - the frame (#deco), fixed at the edges of the screen over the page: cobwebs in the corners, a string of lights, icicles,
     bunting, a blossom branch...
   - the scene, inside each page's ambient light (.abg) behind the content: the moon, bats and pumpkins, snowy hills and firs,
     fireworks, balloons, palms against a sunset...
   - the island: a spider hanging from it, a cap of snow, a party hat, a butterfly, a palm (it is an island, after all).
     They step aside while the menu is open, and opening it throws a handful of the season out of the island: bats, snow,
     confetti, sparks, petals or leaves.
   No script runs per frame: the pieces are placed once (the island's follow its width on its own spring, like the back
   button) and CSS animations do the rest; they pause with the ambient light (under the menu, in transitions, on pages not
   shown). A project's own page keeps its own look, so none of this shows there. On the lite tiers the pieces hold still and
   the flying ones stay home; with reduced motion only the still pictures are left. Nothing is stored. */
(() => {
  const root = document.documentElement, C6 = ['#FF5A6A', '#FF9F43', '#FFE14D', '#5CF59A', '#4DC8FF', '#9B7BFF'];
  let sd = 1;
  const rnd = () => (sd = sd * 16807 % 2147483647) / 2147483647, R = (a, b) => a + rnd() * (b - a), F = n => +n.toFixed(1);
  const img = (vb, body) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${body}</svg>`)}")`;
  const shade = (h, k) => '#' + [1, 3, 5].map(i => Math.round(Math.min(255, parseInt(h.slice(i, i + 2), 16) * k)).toString(16).padStart(2, '0')).join('');
  /* a piece: <i class> with its picture in --img and its own custom properties; kids go inside (b > u for nested motion) */
  const mk = (cls, vars = {}, ...kids) => { const e = document.createElement('i'); e.className = cls;
    for (const k in vars) e.style.setProperty(k.startsWith('--') ? k : '--' + k, vars[k]); kids.forEach(c => e.appendChild(c)); return e };

  /* ---------- the pictures ---------- */
  /* a cobweb in the top left corner: radial threads, and the spiral between them sagging towards the corner */
  function web(s) { sd = s; const A = [], L = [], P = (a, r) => `${F(Math.cos(a) * r)} ${F(Math.sin(a) * r)}`;
    for (let i = 0; i < 7; i++) { A.push((2 + i * 14.3 + R(-3, 3)) * Math.PI / 180); L.push(R(206, 238)) }
    let d = '', e = ''; A.forEach((a, i) => d += `M0 0L${P(a, L[i])}`);
    [18, 34, 52, 72, 94, 118, 144, 172, 202].forEach((r, j) => { for (let i = 0; i < 6; i++) { const r1 = r * R(.93, 1.07), r2 = r * R(.93, 1.07);
      if (r1 > L[i] - 8 || r2 > L[i + 1] - 8 || (j > 4 && rnd() < .2)) continue;
      e += `M${P(A[i], r1)}Q${P((A[i] + A[i + 1]) / 2, (r1 + r2) / 2 * .84)} ${P(A[i + 1], r2)}` } });
    e += `M${P(A[4], 150)}q5 22 -1 46`;                                                     // a broken thread hanging loose
    return img('0 0 240 240', `<g fill="none" stroke="#E6EBF8" stroke-linecap="round"><path d="${d}" stroke-width="1.2" stroke-opacity=".62"/><path d="${e}" stroke-width=".9" stroke-opacity=".5"/></g>`) }
  const SPIDER = img('-24 -24 48 48', `<path d="M-3-5L-10-12L-16-6M-3.5-2L-12-6L-19 1M-3.5 1L-12 3L-18 11M-3 4L-9 9L-12 17M3-5L10-12L16-6M3.5-2L12-6L19 1M3.5 1L12 3L18 11M3 4L9 9L12 17" fill="none" stroke="#A79DC2" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><g fill="#221B2E" stroke="#FFE6D8" stroke-opacity=".55" stroke-width=".9"><ellipse cy="5.5" rx="6.4" ry="7.8"/><circle cy="-4" r="4.3"/></g><circle cx="-1.6" cy="-4.7" r="1.05" fill="#FF9A3A"/><circle cx="1.6" cy="-4.7" r="1.05" fill="#FF9A3A"/>`);
  const BAT_D = 'M50 18L52.5 11L54.5 18Q60 15 66 12Q80 6 98 14Q90 18 88 27Q82 22 76 28Q70 23 64 31Q58 27 54 35L50 39L46 35Q42 27 36 31Q30 23 24 28Q18 22 12 27Q10 18 2 14Q20 6 34 12Q40 15 45.5 18L47.5 11Z';
  const BAT = img('0 0 100 44', `<path d="${BAT_D}" fill="#170F22" stroke="#FFB57A" stroke-opacity=".34" stroke-width=".9" stroke-linejoin="round"/>`);
  const BAT_LIT = img('-4 -4 108 52', `<g stroke-linejoin="round"><path d="${BAT_D}" fill="none" stroke="#FF8A2E" stroke-opacity=".28" stroke-width="5"/><path d="${BAT_D}" fill="#1E1229" stroke="#FFC08A" stroke-opacity=".85" stroke-width="1.1"/></g><circle cx="48.6" cy="17.6" r=".9" fill="#FFB24A"/><circle cx="51.4" cy="17.6" r=".9" fill="#FFB24A"/>`);   // lit at its rim (a wide faint stroke, no filter: cheap to draw)
  const MOON = img('-50 -50 100 100', `<defs><radialGradient id="g"><stop offset=".3" stop-color="#FFDDA6" stop-opacity=".34"/><stop offset=".55" stop-color="#FFB46A" stop-opacity=".11"/><stop offset="1" stop-color="#FF9A4A" stop-opacity="0"/></radialGradient><radialGradient id="d" cx=".38" cy=".34" r=".72"><stop offset="0" stop-color="#FFFAEE"/><stop offset=".65" stop-color="#F3E4C6"/><stop offset="1" stop-color="#D8C29C"/></radialGradient></defs><circle r="50" fill="url(#g)"/><circle r="17" fill="url(#d)"/><g fill="#BFA47A" fill-opacity=".32"><circle cx="-5.5" cy="-4" r="3.6"/><circle cx="5" cy="5" r="2.6"/><circle cx="6.5" cy="-7" r="1.7"/><circle cx="-3" cy="8" r="2"/><circle cx="10" r="1.2"/></g>`);
  const PUMPKIN = img('0 0 120 104', `<defs><radialGradient id="a" cx=".4" cy=".36" r=".72"><stop offset="0" stop-color="#F38E31"/><stop offset=".6" stop-color="#C9550F"/><stop offset="1" stop-color="#7C2D05"/></radialGradient><radialGradient id="f" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#FFF4C2"/><stop offset=".55" stop-color="#FFC94F"/><stop offset="1" stop-color="#FF8E1F"/></radialGradient></defs><path d="M58 26C57 17 60 10 67 5L71 8C66 13 64 19 65 27Z" fill="#56652A"/><g fill="url(#a)" stroke="#5E2003" stroke-opacity=".55"><ellipse cx="31" cy="64" rx="25" ry="35"/><ellipse cx="89" cy="64" rx="25" ry="35"/><ellipse cx="46" cy="64" rx="25" ry="38"/><ellipse cx="74" cy="64" rx="25" ry="38"/><ellipse cx="60" cy="64" rx="22" ry="39"/></g><g fill="url(#f)"><path d="M37 54L47 41L55 56Z"/><path d="M65 56L73 41L83 54Z"/><path d="M56 66L60 59L64 66Z"/><path d="M32 70Q60 96 88 70Q83 75 78 74L75 79L71 75Q60 78 49 75L45 79L42 74Q37 75 32 70Z"/></g>`);
  /* snowy hills along the bottom (stretched to the width), and a fir on them; the Christmas one wears lights and a star */
  const HILLS = img('0 0 1200 200', `<path d="M0 118C150 80 300 90 450 114C600 138 750 70 900 84C1020 96 1110 120 1200 104V200H0Z" fill="#C9D8F2" fill-opacity=".1"/><path d="M0 150C200 116 360 130 520 150C700 172 860 120 1020 132C1100 138 1160 150 1200 146V200H0Z" fill="#E4ECFA" fill-opacity=".19"/><path d="M0 150C200 116 360 130 520 150C700 172 860 120 1020 132C1100 138 1160 150 1200 146" fill="none" stroke="#fff" stroke-opacity=".34" stroke-width="1.6"/>`);
  function fir(star) { const L = star ? [[24, 40, 0], [37, 47, 2], [20, 62, 4], [41, 66, 3], [30, 55, 1], [26, 74, 5], [36, 77, 0], [31, 30, 4]].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="${C6[c]}"/>`).join('') : '';
    return img('0 -10 60 110', `<rect x="27" y="82" width="6" height="14" fill="#241914"/><path d="M30 6L45 31H38L51 54H42L57 82H3L18 54H9L22 31H15Z" fill="#11222A"/><path d="M15 31Q30 36 45 31M9 54Q30 60 51 54M3 82Q30 88 57 82" fill="none" stroke="#E7EFFA" stroke-opacity=".78" stroke-width="2.6" stroke-linecap="round"/><path d="M30 6L35 15Q30 13.5 25 15Z" fill="#E7EFFA" fill-opacity=".8"/>${L}` +
      (star ? '<path d="M30-6.5l2.4 4.9 5.4.7-3.9 3.7 1 5.3-4.9-2.6-4.9 2.6 1-5.3-3.9-3.7 5.4-.7z" fill="#FFE07A"/>' : '')) }
  /* an icicle tile (repeats along the top edge) */
  function icicles() { sd = 11; let p = '';
    for (let x = 8; x < 352; x += R(17, 34)) { const w = R(2.6, 5.6), l = R(14, 56) * (rnd() < .35 ? .45 : 1); p += `M${F(x - w)} 5Q${F(x - w * .35)} ${F(l * .62)} ${F(x)} ${F(l)}Q${F(x + w * .35)} ${F(l * .62)} ${F(x + w)} 5Z` }
    return img('0 0 360 64', `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#F2F8FF" stop-opacity=".75"/><stop offset=".5" stop-color="#C9E2FF" stop-opacity=".36"/><stop offset="1" stop-color="#A9D0FF" stop-opacity=".1"/></linearGradient></defs><path d="M0 0H360V6Q300 9 240 6T120 7T0 6Z" fill="#F4F9FF" fill-opacity=".6"/><path d="${p}" fill="url(#g)"/>`) }
  /* a firework: rays brightening outwards, a spark at each tip */
  function firework(c, s) { sd = s; let d = '', dots = '', inner = ''; const n = 24;
    for (let i = 0; i < n; i++) { const a = (i + R(-.25, .25)) / n * Math.PI * 2, r2 = R(33, 44), r1 = r2 - R(10, 17), x = Math.cos(a), y = Math.sin(a);
      d += `M${F(x * r1)} ${F(y * r1)}L${F(x * r2)} ${F(y * r2)}`; dots += `<circle cx="${F(x * (r2 + 2.4))}" cy="${F(y * (r2 + 2.4) + 1)}" r="${F(R(1.1, 1.8))}"/>` }
    for (let i = 0; i < 14; i++) { const a = R(0, Math.PI * 2), r = R(8, 24); inner += `<circle cx="${F(Math.cos(a) * r)}" cy="${F(Math.sin(a) * r)}" r="${F(R(.6, 1.1))}"/>` }
    return img('-50 -50 100 100', `<defs><radialGradient id="g"><stop offset="0" stop-color="${c}" stop-opacity=".22"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient><radialGradient id="s" gradientUnits="userSpaceOnUse" r="46"><stop offset=".4" stop-color="${c}" stop-opacity="0"/><stop offset=".82" stop-color="${c}"/><stop offset="1" stop-color="#fff"/></radialGradient></defs><circle r="40" fill="url(#g)"/><path d="${d}" stroke="url(#s)" stroke-width="1.5" stroke-linecap="round" fill="none"/><g fill="#fff">${dots}</g><g fill="${c}" fill-opacity=".8">${inner}</g>`) }
  const balloon = c => img('0 0 60 150', `<defs><radialGradient id="g" cx=".36" cy=".3" r=".78"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset=".22" stop-color="${c}"/><stop offset="1" stop-color="${shade(c, .55)}"/></radialGradient></defs><path d="M30 64Q25 80 31 96T29 128T31 150" fill="none" stroke="#fff" stroke-opacity=".38" stroke-width="1"/><path d="M30 2C46 2 56 15 56 30C56 46 43 58 30 62C17 58 4 46 4 30C4 15 14 2 30 2Z" fill="url(#g)"/><path d="M26.5 66.5L30 61L33.5 66.5Z" fill="${shade(c, .6)}"/>`);
  function star5(c1, c2) { let p = ''; for (let i = 0; i < 10; i++) { const r = i % 2 ? 4.5 : 11, a = -Math.PI / 2 + i * Math.PI / 5; p += (i ? 'L' : 'M') + F(Math.cos(a) * r) + ' ' + F(Math.sin(a) * r) }
    return img('-12 -12 24 24', `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><path d="${p}Z" fill="url(#g)" stroke="#fff" stroke-opacity=".55" stroke-width=".6" stroke-linejoin="round"/>`) }
  const STAR4 = c => img('-10 -10 20 20', `<path d="M0-10C1-2.2 2.2-1 10 0C2.2 1 1 2.2 0 10C-1 2.2-2.2 1-10 0C-2.2-1-1-2.2 0-10Z" fill="${c}"/>`);
  const FLAKE = img('-10 -10 20 20', `<g stroke="#fff" stroke-width="1.3" stroke-linecap="round" fill="none">${[0, 60, 120, 180, 240, 300].map(a => `<path transform="rotate(${a})" d="M0 0V-9M0-5.5L-2.6-7.6M0-5.5L2.6-7.6"/>`).join('')}</g>`);
  /* Easter eggs, painted the Romanian way: a band of zigzag between two lines, a cross on top, dots */
  const EGG = 'M20 2C31 2 38 20 38 32C38 44 30 50 20 50C10 50 2 44 2 32C2 20 9 2 20 2Z';
  const eggG = (id, c, p) => `<defs><clipPath id="${id}"><path d="${EGG}"/></clipPath></defs><path d="${EGG}" fill="${c}"/><g clip-path="url(#${id})" fill="none" stroke="${p}" stroke-width="1.3" stroke-linejoin="round"><path d="M0 24.5H40M0 34H40"/><path d="M2 32L6 26.5L10 32L14 26.5L18 32L22 26.5L26 32L30 26.5L34 32L38 26.5"/><path d="M20 5V14M15.5 9.5H24.5" stroke-width="1.1"/></g><g fill="${p}"><circle cx="11" cy="42" r="1.5"/><circle cx="20" cy="44.5" r="1.5"/><circle cx="29" cy="42" r="1.5"/><circle cx="20" cy="18.5" r="1.3"/></g><path d="${EGG}" fill="url(#sh)"/>`;
  const EGGSH = '<radialGradient id="sh" cx=".35" cy=".28" r=".85"><stop offset="0" stop-color="#fff" stop-opacity=".4"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".32"/></radialGradient>';
  const EGGS = [['#C42233', '#FFE7C2'], ['#D9A02B', '#8E1B1B'], ['#2A1B2E', '#F4C84A']];
  const egg = k => img('0 0 40 52', `<defs>${EGGSH}</defs>${eggG('c', ...EGGS[k])}`);
  function nest(s, n) { sd = s; const blade = (y0, h, cols) => { let g = ''; for (let i = 0; i < 26; i++) { const x = R(4, 226), b = R(-14, 14), t = h * R(.45, 1);
      g += `<path d="M${F(x)} 120Q${F(x + b * .3)} ${F(120 - t * .6)} ${F(x + b)} ${F(120 - t)}" stroke="${cols[i % cols.length]}" stroke-width="${F(R(1.8, 3))}"/>` } return g };
    const eggs = [[62, 64, -16, 0], [104, 70, 9, 1], [142, 62, -6, 2]].slice(0, n).map(([x, y, r, k], i) => `<g transform="translate(${x} ${y}) rotate(${r} 20 26) scale(.95)">${eggG('c' + i, ...EGGS[k])}</g>`).join('');
    return img('0 0 230 120', `<defs>${EGGSH}</defs><g fill="none" stroke-linecap="round">${blade(0, 70, ['#2E6B39', '#3F8445', '#2A5C34'])}</g>${eggs}<g fill="none" stroke-linecap="round">${blade(0, 38, ['#4C9A4E', '#5DB25A', '#3C8A44'])}</g>`) }
  /* Mărțișor: the red and white cord, tied in a knot, with a heart hanging from it */
  const HEART = 'C4 53.5 1 50.6 1 47.4C1 44.6 3 43 5.2 43C6.8 43 8.2 43.9 9 45.2C9.8 43.9 11.2 43 12.8 43C15 43 17 44.6 17 47.4C17 50.6 14 53.5 9 58Z';
  const cord = d => `<path d="${d}" stroke="#F4F2F0" stroke-width="3.4"/><path d="${d}" stroke="#E3263B" stroke-width="3.4" stroke-dasharray="5 5"/>`;
  const MRT = img('0 0 150 214', `<g fill="none" stroke-linecap="round">${cord('M38-4C40 40 60 78 84 92M118-4C112 40 100 74 84 92')}<path d="M84 92C80 108 77 120 79 134" stroke="#E3263B" stroke-width="3"/><path d="M84 92C90 106 94 116 92 130" stroke="#F4F2F0" stroke-width="3"/><path d="M84 92V150" stroke="#E9E4E0" stroke-width="1.2"/></g><circle cx="84" cy="92" r="4.4" fill="#E3263B"/><g transform="translate(66 140) scale(2)"><path d="M9 58${HEART}" transform="translate(0 -43)" fill="#E3263B"/><path d="M5.2 2.6C3.6 2.6 2.6 3.8 2.8 5.2" transform="translate(0 0)" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width=".9" stroke-linecap="round"/></g>`);
  const MRT_S = img('0 0 18 64', `<g fill="none">${cord('M9 0V40')}</g><circle cx="9" cy="40" r="2.2" fill="#E3263B"/><path d="M9 58${HEART}" fill="#E3263B"/><path d="M5.2 45.6C3.8 45.8 3 47 3.2 48.2" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width=".8" stroke-linecap="round"/>`);
  /* snowdrops (ghiocei): stems that bow over at the top, three white petals hanging from each */
  function snowdrops(s) { sd = s; let st = '', lv = '', fl = '';
    for (let k = 0; k < 5; k++) { const xb = 18 + k * 22 + R(-6, 6), xt = xb + R(-8, 8), yt = R(28, 66), dir = rnd() < .5 ? -1 : 1, xh = xt + dir * 9, yh = yt + 7;
      st += `<path d="M${F(xb)} 160C${F(xb)} ${F(yt + 40)} ${F(xt)} ${F(yt + 20)} ${F(xt)} ${F(yt)}Q${F(xt + dir * 2)} ${F(yt - 6)} ${F(xh)} ${F(yh - 2)}"/>`;
      lv += `<path d="M${F(xb - 2)} 160Q${F(xb - 14)} ${F(120 - k * 4)} ${F(xb - 7 - k)} ${F(yt + 48)}Q${F(xb - 4)} 122 ${F(xb + 2)} 160Z"/>`;
      fl += `<g transform="translate(${F(xh)} ${F(yh)})"><ellipse cy="-1" rx="2.2" ry="2.6" fill="#7DBA6A"/>${[-30, 30, 0].map(a => `<path transform="rotate(${a})" d="M0 1C-5 6-4.4 15 0 18C4.4 15 5 6 0 1Z" fill="${a ? '#EEF2FA' : '#FFFFFF'}"/>`).join('')}</g>` }
    return img('0 0 130 160', `<g fill="#3F7A45">${lv}</g><g fill="none" stroke="#5C9A4F" stroke-width="2" stroke-linecap="round">${st}</g>${fl}`) }
  /* a branch reaching in from the top left corner; spots where its flowers or leaves grow: x, y, the way they point */
  const TWIG = { main: 'M-8 26C46 22 92 38 138 52C178 64 222 70 270 64C292 61 314 55 338 46', base: 'M-8 26C46 22 92 38 138 52',
    twigs: 'M64 32C74 18 88 9 106 4M138 52C146 72 160 88 178 98M214 68C222 52 236 42 252 37M270 64C278 77 292 86 306 90M100 42C104 60 98 76 90 88',
    spots: [[106, 4, -30], [94, 10, 10], [80, 22, 200], [178, 98, 60], [164, 88, 140], [150, 72, 20], [252, 37, -20], [240, 44, 170], [306, 90, 40], [292, 84, 150], [336, 46, 0],
      [320, 52, 110], [90, 88, 100], [98, 70, -10], [40, 25, -90], [120, 47, 80], [200, 68, -80], [282, 62, -60], [230, 70, 90], [60, 28, 100], [186, 64, 250], [312, 54, -70]] };
  function branch(kind, s) { sd = s; const bark = kind === 'blossom' ? '#3A2925' : '#3A2721'; let p = '';
    TWIG.spots.forEach(([x, y, a], i) => { const k = R(.8, 1.25);
      if (kind === 'blossom') { if (i % 4 === 3) { p += `<ellipse cx="${x}" cy="${y}" rx="${F(2.6 * k)}" ry="${F(3.6 * k)}" transform="rotate(${a} ${x} ${y})" fill="#F28BAE"/>`; return }
        const c = ['#FFD3E2', '#FFC0D5', '#FFFFFF', '#FFE4EE'][i % 4];
        for (let j = 0; j < 5; j++) { const b = (a + j * 72) * Math.PI / 180; p += `<ellipse cx="${F(x + Math.cos(b) * 3.6 * k)}" cy="${F(y + Math.sin(b) * 3.6 * k)}" rx="${F(3.8 * k)}" ry="${F(3 * k)}" transform="rotate(${F(a + j * 72)} ${F(x + Math.cos(b) * 3.6 * k)} ${F(y + Math.sin(b) * 3.6 * k)})" fill="${c}"/>` }
        p += `<circle cx="${x}" cy="${y}" r="${F(1.7 * k)}" fill="#E8678C"/>` }
      else { const z = 20 * k, c = ['#E8742A', '#C9471E', '#F2B33D', '#D85A22', '#A8361A'][i % 5];
        p += `<g transform="translate(${x} ${y}) rotate(${a})"><path d="M0 0C${F(z * .3)} ${F(-z * .34)} ${F(z * .74)} ${F(-z * .32)} ${F(z)} 0C${F(z * .74)} ${F(z * .32)} ${F(z * .3)} ${F(z * .34)} 0 0Z" fill="${c}"/><path d="M0 0L${F(z * .9)} 0" stroke="${shade(c, .65)}" stroke-width=".8"/></g>` } });
    return img('0 0 340 160', `<g fill="none" stroke="${bark}" stroke-linecap="round"><path d="${TWIG.main}" stroke-width="3.4"/><path d="${TWIG.base}" stroke-width="6"/><path d="${TWIG.twigs}" stroke-width="2"/></g>${p}`) }
  const MAPLE = 'M10 1L11.6 5.2L14.6 3.8L13.8 7.6L18.6 7L16.4 10L19 11.4L14.6 12.8L15.4 15.8L11 14.4L10.6 19L9.4 19L9 14.4L4.6 15.8L5.4 12.8L1 11.4L3.6 10L1.4 7L6.2 7.6L5.4 3.8L8.4 5.2Z';
  const maple = c => img('0 0 20 24', `<path d="${MAPLE}" fill="${c}"/><path d="M10 4V22M10 12L4 8M10 12L16 8" stroke="${shade(c, .62)}" stroke-width=".8" fill="none" stroke-linecap="round"/>`);
  function leafPile(s) { sd = s; let p = '';
    for (let i = 0; i < 30; i++) { const x = R(6, 214), y = R(44, 68), a = R(0, 360), z = R(12, 20), c = ['#E8742A', '#C9471E', '#F2B33D', '#D85A22', '#A8361A', '#8E4A1C'][i % 6];
      p += rnd() < .3 ? `<path d="${MAPLE}" transform="translate(${F(x - z / 2)} ${F(y - z / 2)}) rotate(${F(a)} 10 10) scale(${F(z / 20)})" fill="${c}"/>`
        : `<g transform="translate(${F(x)} ${F(y)}) rotate(${F(a)})"><path d="M${F(-z / 2)} 0C${F(-z * .2)} ${F(-z * .34)} ${F(z * .24)} ${F(-z * .32)} ${F(z / 2)} 0C${F(z * .24)} ${F(z * .32)} ${F(-z * .2)} ${F(z * .34)} ${F(-z / 2)} 0Z" fill="${c}"/></g>` }
    return img('0 0 220 72', p) }
  const butterfly = (c1, c2) => img('-20 -16 40 32', `<g fill="${c1}"><path d="M-1-2C-6-14-18-16-18-6C-18 2-8 2-1 0Z"/><path d="M1-2C6-14 18-16 18-6C18 2 8 2 1 0Z"/></g><g fill="${c2}"><path d="M-1 1C-8 2-15 6-12 12C-9 16-3 10-1 3Z"/><path d="M1 1C8 2 15 6 12 12C9 16 3 10 1 3Z"/></g><g fill="#fff" fill-opacity=".7"><circle cx="-11" cy="-7" r="1.6"/><circle cx="11" cy="-7" r="1.6"/><circle cx="-8" cy="8" r="1"/><circle cx="8" cy="8" r="1"/></g><ellipse rx="1.3" ry="7" fill="#2A2238"/><path d="M-.5-6Q-3-12-5-13M.5-6Q3-12 5-13" stroke="#2A2238" stroke-width=".8" fill="none" stroke-linecap="round"/>`);
  /* a palm: a curved trunk tapering up, its crown of drooping fronds with leaflets swept back */
  function palm(s) { sd = s; const B = [60, 340], C = [68, 190], T = [132, 80];
    const P = t => [(1 - t) * (1 - t) * B[0] + 2 * t * (1 - t) * C[0] + t * t * T[0], (1 - t) * (1 - t) * B[1] + 2 * t * (1 - t) * C[1] + t * t * T[1]];
    const D = t => { const x = 2 * (1 - t) * (C[0] - B[0]) + 2 * t * (T[0] - C[0]), y = 2 * (1 - t) * (C[1] - B[1]) + 2 * t * (T[1] - C[1]), l = Math.hypot(x, y); return [x / l, y / l] };
    const L = [], Rr = []; let rings = '';
    for (let i = 0; i <= 14; i++) { const t = i / 14, p = P(t), d = D(t), w = (15 - 8 * t) / 2, a = [p[0] - d[1] * w, p[1] + d[0] * w], b = [p[0] + d[1] * w, p[1] - d[0] * w]; L.push(a); Rr.push(b);
      if (i && i < 14) rings += `M${F(a[0])} ${F(a[1])}Q${F(p[0] + d[0] * 2.6)} ${F(p[1] + d[1] * 2.6)} ${F(b[0])} ${F(b[1])}` }
    const f = a => a.map(q => F(q[0]) + ' ' + F(q[1])).join('L'); let fr = '';
    [-172, -146, -118, -86, -54, -24, 6, 34, 158].map(a => a + R(-6, 6)).forEach(a => { const r = a * Math.PI / 180, len = R(80, 104), dx = Math.cos(r), dy = Math.sin(r), dr = len * R(.35, .55) * (1 - Math.abs(dy) * .3);
      const E = [T[0] + dx * len, T[1] + dy * len * .8 + dr], Q = [T[0] + dx * len * .55, T[1] + dy * len * .55 - len * .12];
      const at = t => [(1 - t) * (1 - t) * T[0] + 2 * t * (1 - t) * Q[0] + t * t * E[0], (1 - t) * (1 - t) * T[1] + 2 * t * (1 - t) * Q[1] + t * t * E[1]];
      let lf = ''; for (let t = .1; t < .97; t += .062) { const p = at(t), q = at(t + .01), l = Math.hypot(q[0] - p[0], q[1] - p[1]), ux = (q[0] - p[0]) / l, uy = (q[1] - p[1]) / l, ll = 25 * (1 - t * .55);
        [1, -1].forEach(g => { let vx = -uy * g - ux * .5, vy = ux * g - uy * .5 + .55; const vl = Math.hypot(vx, vy); lf += `M${F(p[0])} ${F(p[1])}l${F(vx / vl * ll)} ${F(vy / vl * ll)}` }) }
      fr += `<path d="M${T[0]} ${T[1]}Q${F(Q[0])} ${F(Q[1])} ${F(E[0])} ${F(E[1])}" stroke-width="2.8"/><path d="${lf}" stroke-width="2.1"/>` });
    return img('0 0 260 350', `<path d="M${f(L)}L${f(Rr.reverse())}Z" fill="#0A1318"/><path d="${rings}" fill="none" stroke="#1C2A31" stroke-width="1.2"/><g fill="none" stroke="#0A1318" stroke-linecap="round">${fr}</g><g fill="#0A1318"><circle cx="${T[0] - 4}" cy="${T[1] + 6}" r="5.5"/><circle cx="${T[0] + 5}" cy="${T[1] + 7}" r="5"/><circle cx="${T[0]}" cy="${T[1] + 11}" r="4.6"/></g>`) }
  const SUN = img('-50 -50 100 100', `<defs><radialGradient id="g"><stop offset=".26" stop-color="#FFE6A8" stop-opacity=".5"/><stop offset=".5" stop-color="#FFB45E" stop-opacity=".14"/><stop offset="1" stop-color="#FF8A3A" stop-opacity="0"/></radialGradient><radialGradient id="d" cx=".45" cy=".4"><stop offset="0" stop-color="#FFF8E2"/><stop offset=".8" stop-color="#FFD98A"/><stop offset="1" stop-color="#FFC163"/></radialGradient></defs><circle r="50" fill="url(#g)"/><circle r="13" fill="url(#d)"/>`);
  const RAYS = img('-50 -50 100 100', `<g fill="#FFE2A0" fill-opacity=".16">${Array.from({length: 18}, (_, i) => `<path transform="rotate(${i * 20})" d="M-1.6-17L0-${i % 2 ? 36 : 47}L1.6-17Z"/>`).join('')}</g>`);
  /* the island's own pieces */
  const SNOW_G = '<linearGradient id="g" x1="0" y1="3" x2="0" y2="11" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#D3E0F3"/></linearGradient>';
  const SNOW_END = img('0 0 36 24', `<defs>${SNOW_G}</defs><path d="M3.6 21.2C4 16 6.6 10.6 11 7.4C15 4.8 20 4.2 26 4.5L36 5V10.4H24C19 10.6 15.4 11.6 12.2 13.4C9.2 15 7 17.6 6.2 20.6C5.8 22.6 3.8 23 3.6 21.2Z" fill="url(#g)"/>`);
  const SNOW_MID = img('0 0 100 24', `<defs>${SNOW_G}</defs><path d="M0 5C9 3.8 17 4.6 26 3.4C36 2.2 44 4.8 54 3.9C64 3 72 4.9 82 3.7C90 2.9 96 4.3 100 5V10.4H0Z" fill="url(#g)"/>`);
  const HOLLY = img('0 0 32 22', `<path d="M16 12C13 8 9 5.5 3 6L5 8.6L2 10.4L5.4 11.8L3.4 14.8C8 16 12.6 15 16 12ZM16 12C19 8 23 5.5 29 6L27 8.6L30 10.4L26.6 11.8L28.6 14.8C24 16 19.4 15 16 12Z" fill="#2F7A3E"/><path d="M16 12C11 10 7 9.6 4 9.8M16 12C21 10 25 9.6 28 9.8" stroke="#1E5A2C" stroke-width=".8" fill="none"/><g fill="#E0283C"><circle cx="14.4" cy="11.4" r="2.6"/><circle cx="18" cy="10.8" r="2.6"/><circle cx="16.2" cy="14.4" r="2.6"/></g><g fill="#fff" fill-opacity=".7"><circle cx="13.6" cy="10.6" r=".8"/><circle cx="17.2" cy="10" r=".8"/></g>`);
  const HAT = img('0 0 26 36', `<defs><clipPath id="c"><path d="M3 33L13 5L23 33Q13 36.5 3 33Z"/></clipPath></defs><path d="M3 33L13 5L23 33Q13 36.5 3 33Z" fill="#9B7BFF"/><g clip-path="url(#c)"><path d="M0 14L26 6V10L0 18ZM0 24L26 16V20L0 28Z" fill="#FFE14D"/><path d="M0 19L26 11V13L0 21ZM0 29L26 21V23L0 31Z" fill="#5CF59A"/></g><path d="M3 33Q13 36.5 23 33" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.2"/><circle cx="13" cy="5" r="3.6" fill="#FF5A6A"/><circle cx="12" cy="4" r="1.2" fill="#fff" fill-opacity=".6"/>`);
  const EARS = img('0 0 30 36', `<g transform="rotate(-12 10 34)"><ellipse cx="10" cy="17" rx="5.6" ry="16.5" fill="#EEE8F4"/><ellipse cx="10" cy="19" rx="2.7" ry="11.5" fill="#F4B3C8"/></g><g transform="rotate(14 21 34)"><ellipse cx="21" cy="17" rx="5.6" ry="16.5" fill="#E6DFEE"/><ellipse cx="21" cy="19" rx="2.7" ry="11.5" fill="#F0A8BF"/></g>`);
  const PALMLET = img('0 0 32 36', `<path d="M15 36C15.5 28 15 20 18 13" fill="none" stroke="#7A5634" stroke-width="2.6" stroke-linecap="round"/><path d="M15.4 30H17M15.2 24H17M15.8 18.6H17.6" stroke="#5A3D24" stroke-width=".8"/><path d="M18 13C13 8 7 8 2 12C7 10 12 11 18 13ZM18 13C24 10 29 11 32 16C28 13 23 13 18 13ZM18 13C21 15 23 19 23 24C21 20 19 17 18 13Z" fill="#3E9E57"/><path d="M18 13C15 6 10 2 5 2C10 4 14 8 18 13ZM18 13C20 6 25 2 30 3C25 5 21 9 18 13Z" fill="#52BC6B"/><circle cx="17" cy="15" r="1.9" fill="#7A5230"/><circle cx="19.6" cy="15.4" r="1.7" fill="#6A4628"/>`);
  const ICICLE = img('0 0 10 22', `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4F9FF"/><stop offset="1" stop-color="#BBDCFF" stop-opacity=".25"/></linearGradient></defs><path d="M1 0H9L5.4 20Q5 22 4.6 20Z" fill="url(#g)"/>`);

  /* ---------- the themes: frame, scene, island, and what opening the menu throws out ---------- */
  const frameW = () => Math.max(320, innerWidth);
  /* a garland hanging in two swags from the corners to the island: a point on it, and its slope */
  const swag = (W, S) => (h, u) => { const x0 = h ? W / 2 : 0, w = W / 2; return {x: x0 + w * u, y: 4 + 4 * S * u * (1 - u), a: Math.atan(4 * S * (1 - 2 * u) / w) * 180 / Math.PI} };
  function lights(f) { const W = frameW(), S = Math.min(44, W * .05), at = swag(W, S), n = Math.max(4, Math.min(10, Math.round(W / 2 / 84)));
    const box = mk('dk-lights'), wire = mk('dk-wire', {img: img(`0 0 ${W} 110`, `<path d="M0 4Q${W / 4} ${4 + 2 * S} ${W / 2} 4Q${W * 3 / 4} ${4 + 2 * S} ${W} 4" fill="none" stroke="#24352B" stroke-width="2"/>`)});
    box.appendChild(wire);
    [0, 1].forEach(h => { for (let i = 0; i < n; i++) { const u = (i + .5) / n, p = at(h, u), c = C6[(i + h * 3) % 6], d = Math.abs(.5 - (h ? (u / 2 + .5) : u / 2)) * 2;
      box.appendChild(mk('dk-bulb', {x: F(p.x) + 'px', y: F(p.y) + 'px', a: F(p.a * .5) + 'deg', c, t: R(1.4, 3.2).toFixed(2) + 's', dl: (-R(0, 3)).toFixed(2) + 's', d: Math.round(d * 900) + 'ms'}, mk(''))) } });
    f.appendChild(box) }
  function bunting(f) { const W = frameW(), S = Math.min(40, W * .045), at = swag(W, S), n = Math.max(4, Math.round(W / 2 / 64)); let fl = '';
    [0, 1].forEach(h => { for (let i = 0; i < n; i++) { const u = (i + .5) / n; if (h ? u < .16 : u > .84) continue; const p = at(h, u), c = C6[(i + h * 3) % 6];
      fl += `<g transform="translate(${F(p.x)} ${F(p.y)}) rotate(${F(p.a)})"><path d="M-12 0H12L0 27Z" fill="${c}" fill-opacity=".86"/><path d="M-12 0H12L0 27Z" fill="url(#sh)"/></g>` } });
    f.appendChild(mk('dk-bunt', {img: img(`0 0 ${W} 110`, `<defs><linearGradient id="sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></linearGradient></defs><path d="M0 4Q${W / 4} ${4 + 2 * S} ${W / 2} 4Q${W * 3 / 4} ${4 + 2 * S} ${W} 4" fill="none" stroke="#E9ECF5" stroke-opacity=".55" stroke-width="1.2"/>${fl}`)})) }
  /* hanging ornaments: [left or right edge in vw, thread length in px, width in px, picture] */
  const hang = (f, list) => list.forEach(([x, L, z, url, h]) => f.appendChild(mk('dk-hang', {x: x + 'vw', L: L + 'px', z: z + 'px', h: (h || z) + 'px', t: R(4.5, 7).toFixed(2) + 's', dl: (-R(0, 6)).toFixed(2) + 's', img: url}, mk('dkp'))));
  /* the scene's flyers cross the screen now and then: [height in vh, size in px, cycle in s, start in s, going left] */
  const bats = (sc, list) => list.forEach(([y, z, t, dl, l]) => sc.appendChild(mk('dk-bat fly' + (l ? ' l' : ''), {y: y + 'vh', z: z + 'px', t: t + 's', dl: dl + 's', b: -R(2, 4).toFixed(1) + 'vh'}, mk('', {}, mk('dkp', {img: BAT_LIT})))));
  /* an island piece: where it sits on the island (l / r: that end, c: the middle, m: the middle, stretched), and how far in */
  const ip = (cls, a, dx, url, back) => { const e = mk('ik ' + cls, {img: url}, mk('dkp')); e.dataset.a = a; e.dataset.dx = dx; if (back) e.dataset.back = 1; return e };

  const LEAFC = ['#E8742A', '#C9471E', '#F2B33D', '#D85A22'];
  /* the island sits at the top of the screen, so what it throws goes out sideways and down (anything thrown up would only
     fly behind it): a speed to either side, and the drift of something light falling */
  const side = (a, b) => (rnd() < .5 ? -1 : 1) * R(a, b), FALL = () => ({vx: side(80, 330), vy: R(20, 200), g: 300, k: 2.2, sw: R(10, 24), sp: R(2, 4), vr: R(-240, 240)});
  const THEMES = {
    halloween: {
      frame(f) { f.append(mk('dk-web l', {img: web(5)}), mk('dk-web r', {img: web(9)}), mk('dk-spi', {}, mk('dkp', {img: SPIDER}))) },
      scene(sc) { sc.append(mk('dk-moon', {img: MOON}), mk('dk-pglow'), mk('dk-pk a', {img: PUMPKIN}), mk('dk-pk b', {img: PUMPKIN}));
        bats(sc, [[22, 54, 19, -3, 0], [12, 40, 27, -16, 1], [44, 32, 23, -9, 0]]) },
      island: () => [ip('ik-spi', 'r', -24, SPIDER, 1)],
      burst: 'bats' },
    xmas: {
      frame: lights, wide: true,
      scene(sc) { sc.append(mk('dk-hills', {img: HILLS}), mk('dk-fir s1', {img: fir(true)}, mk('dk-glint')), mk('dk-fir s2', {img: fir(false)}), mk('dk-fir s3', {img: fir(true)}), mk('dk-fir s4', {img: fir(false)})) },
      island: () => [ip('ik-snl', 'l', 0, SNOW_END), ip('ik-snm', 'm', 0, SNOW_MID), ip('ik-snr', 'r', 0, SNOW_END), ip('ik-hol', 'r', -36, HOLLY)],
      burst: 'snow' },
    winter: {
      frame(f) { const u = icicles(); f.append(mk('dk-ice l', {img: u}), mk('dk-ice r', {img: u})) },
      scene(sc) { sc.append(mk('dk-hills', {img: HILLS}), mk('dk-fir s1', {img: fir(false)}), mk('dk-fir s2', {img: fir(false)}), mk('dk-fir s3', {img: fir(false)}), mk('dk-fir s4', {img: fir(false)})) },
      island: () => [ip('ik-snl', 'l', 0, SNOW_END), ip('ik-snm', 'm', 0, SNOW_MID), ip('ik-snr', 'r', 0, SNOW_END), ip('ik-icl', 'l', 24, ICICLE), ip('ik-icl b', 'r', -30, ICICLE)],
      burst: 'snow' },
    newyear: {
      frame(f) { const g = star5('#FFF1C2', '#E8B23A'), s = star5('#FFFFFF', '#AFC0DA');
        hang(f, [[3, 54, 20, g], [8, 104, 28, s], [13, 30, 16, g], [83, 40, 18, s], [88, 92, 26, g], [93, 60, 20, s]]) },
      scene(sc) { [['#FFD36B', 12, 15, 7.2, -1], ['#FFFFFF', 87, 19, 8.4, -4.4], ['#FF5A6A', 90, 55, 7.8, -2.6], ['#4DC8FF', 10, 52, 9, -6.2]].forEach(([c, x, y, t, dl], i) => {
        const v = {x: x + 'vw', y: y + 'vh', t: t + 's', dl: dl + 's'}; sc.append(mk('dk-fwt fly', v), mk('dk-fw fly', {...v, img: firework(c, 3 + i)})) }) },
      island: () => [ip('ik-spk a', 'l', -8, STAR4('#FFE7A3')), ip('ik-spk b', 'r', 4, STAR4('#FFFFFF')), ip('ik-spk c', 'r', -20, STAR4('#FFD36B'))],
      burst: 'sparks' },
    birthday: {
      frame: bunting, wide: true,
      scene(sc) { [[7, 44, 31, -4, 0], [21, 34, 36, -20, 3], [73, 50, 28, -13, 5], [87, 38, 34, -27, 1], [48, 30, 40, -33, 4]].forEach(([x, z, t, dl, c]) =>
        sc.appendChild(mk('dk-bal fly', {x: x + 'vw', z: z + 'px', t: t + 's', dl: dl + 's'}, mk('dkp', {img: balloon(C6[c])})))) },
      island: () => [ip('ik-hat', 'r', -16, HAT)],
      burst: 'confetti' },
    easter: {
      frame(f) { hang(f, [[4, 46, 30, egg(0), 39], [9.5, 96, 36, egg(1), 47], [88, 72, 32, egg(2), 42], [94.5, 38, 28, egg(0), 36]]) },
      scene(sc) { sc.append(mk('dk-nest a', {img: nest(4, 3)}), mk('dk-nest b', {img: nest(8, 1)})) },
      island: () => [ip('ik-ears', 'l', 22, EARS, 1)],
      burst: 'eggs' },
    martisor: {
      frame(f) { f.append(mk('dk-mrt', {img: MRT}), mk('dk-mrt r', {img: MRT})) },
      scene(sc) { sc.append(mk('dk-drops a', {img: snowdrops(3)}), mk('dk-drops b', {img: snowdrops(7)})) },
      island: () => [ip('ik-mrt', 'r', -26, MRT_S, 1)],
      burst: 'hearts' },
    spring: {
      frame(f) { f.append(mk('dk-br', {img: branch('blossom', 4)}), mk('dk-br r', {img: branch('blossom', 9)})) },
      scene(sc) { [[0, '#9BD3FF', '#CFC4FF', 28], [1, '#FFE08A', '#FFB8CC', 22], [2, '#CFC4FF', '#9BD3FF', 18]].forEach(([k, a, b, z]) =>
        sc.appendChild(mk('dk-bfly fly f' + k, {z: z + 'px'}, mk('', {}, mk('dkp', {img: butterfly(a, b)}))))) },
      island: () => [ip('ik-bfly', 'r', -30, butterfly('#9BD3FF', '#CFC4FF'))],
      burst: 'petals' },
    summer: {
      frame() {},
      scene(sc) { sc.append(mk('dk-hz'), mk('dk-sun', {img: SUN}, mk('dk-rays', {img: RAYS})), mk('dk-palm a', {img: palm(2)}), mk('dk-palm b', {img: palm(6)}), mk('dk-palm c', {img: palm(9)})) },
      island: () => [ip('ik-palm', 'l', 4, PALMLET)],
      burst: 'sparkle' },
    autumn: {
      frame(f) { f.append(mk('dk-br r', {img: branch('leaves', 5)}), mk('dk-br sm', {img: branch('leaves', 12)})) },
      scene(sc) { sc.append(mk('dk-pile a', {img: leafPile(3)}), mk('dk-pile b', {img: leafPile(8)})) },
      island: () => [ip('ik-leaf', 'l', 10, maple('#F08A2A'))],
      burst: 'leaves' }
  };

  /* what opening the menu throws out of the island: how many, and how each one looks and flies (from the open island's
     size w x h; x, y are relative to its top centre; each starts behind its lower edge). Light things fall slowly: velocity
     with drag, towards a terminal speed. */
  const BURSTS = {
    bats: {n: 7, part(i, w, h) { const s = i % 2 ? 1 : -1, z = R(46, 72);
      return {z, h: z * .48, img: BAT_LIT, flap: 1, T: R(1500, 2200), path: {x0: R(-.3, .3) * w, y0: h * .8, x1: s * R(.3, .6) * innerWidth, y1: R(.15, .8) * innerHeight, dip: R(30, 140), s0: .45, s1: R(.95, 1.3)}} } },
    snow: {n: 18, part() { const z = R(7, 15), f = rnd() < .45; return {z, img: f ? FLAKE : null, dot: f ? null : '#fff', T: R(2600, 3800), phys: {vx: side(60, 320), vy: R(20, 170), g: 200, k: 2, sw: R(8, 22), sp: R(2, 4), vr: R(-90, 90)}} } },
    confetti: {n: 26, part(i) { const z = R(6, 10); return {z, h: z * 1.6, rect: C6[i % 6], T: R(2000, 2900), phys: {vx: side(140, 540), vy: R(-80, 240), g: 900, k: 2.6, sw: R(6, 16), sp: R(4, 8), vr: R(-720, 720)}} } },
    sparks: {n: 24, part(i) { const a = (-.12 + i / 23 * 1.24) * Math.PI + R(-.06, .06), v = R(260, 420), z = R(4, 7);   // a fan opening downwards
      return {z, dot: ['#FFE7A3', '#FFFFFF', '#FFD36B', '#FF9F43'][i % 4], glow: 1, T: R(1300, 1900), phys: {vx: Math.cos(a) * v, vy: Math.sin(a) * v * .8 + 60, g: 220, k: 3.2}} } },
    petals: {n: 16, part(i) { const z = R(9, 14); return {z, h: z * .8, petal: ['#FFD3E2', '#FFC0D5', '#FFFFFF', '#FFE4EE'][i % 4], T: R(2400, 3400), phys: {...FALL(), sw: R(10, 26)}} } },
    hearts: {n: 16, part(i) { const z = R(9, 13); return {z, h: z * .8, petal: i % 2 ? '#E3263B' : '#F4F2F0', T: R(2400, 3400), phys: FALL()} } },
    eggs: {n: 14, part(i) { const e = i % 4 === 0, z = e ? R(12, 15) : R(9, 13);
      return e ? {z, h: z * 1.3, img: egg(i % 3), T: R(2000, 2600), phys: {vx: side(80, 280), vy: R(0, 160), g: 800, k: 2, vr: R(-200, 200)}}
        : {z, h: z * .8, petal: ['#FFC9D9', '#FFF3B8', '#BDF4D2', '#CFC4FF'][i % 4], T: R(2400, 3400), phys: FALL()} } },
    leaves: {n: 13, part(i) { const z = R(14, 22); return {z, h: z * 1.2, img: maple(LEAFC[i % 4]), T: R(2600, 3600), phys: {...FALL(), g: 320, k: 1.9, sw: R(14, 34), sp: R(1.6, 3), vr: R(-300, 300)}} } },
    sparkle: {n: 14, part(i, w, h) { const a = R(0, Math.PI), d = R(60, 230), z = R(10, 20);
      return {z, img: STAR4(['#FFE7A3', '#FFFFFF', '#FFD36B'][i % 3]), T: R(900, 1500), dl: R(0, 500), twinkle: {x: Math.cos(a) * d * 1.3, y: h + Math.sin(a) * d * .8}} } }
  };

  /* ---------- styles ---------- */
  const CSS = `
#deco{position:fixed;inset:0;z-index:21;pointer-events:none;overflow:hidden;contain:strict;opacity:0;transition:opacity 1.1s}
#deco.on{opacity:1}
[data-pg=dl] #deco,[data-pg=pass] #deco{opacity:0;transition-duration:.45s}
#deco>*,.dks>*{position:absolute;display:block;pointer-events:none}
.dks{position:absolute;inset:0;width:100%;height:100%}
#deco i,.dks i,.ideco i,#dburst i{display:block}
.dkp{width:100%;height:100%;background:var(--img) no-repeat center/100% 100%}
.dk-web,.dk-mrt,.dk-br,.dk-moon,.dk-pk,.dk-fir,.dk-nest,.dk-drops,.dk-pile,.dk-palm,.dk-sun,.dk-rays,.dk-wire,.dk-bunt,.dk-ice,.dk-hills,.dk-fw{background:var(--img) no-repeat center/100% 100%}
/* Everything is hidden with opacity, never visibility or display: an animation that starts on an element that is not
   visible is left to the main thread, which would then wake up every frame. */
.mo #deco *,.hush #deco *,.t2 #deco *,.t2 .dks *,.mo .ideco *,.hush .ideco *,.t2 .ideco *,[data-pg=dl] #deco *,[data-pg=pass] #deco *{animation-play-state:paused!important}
.t2 .fly{display:none!important}
@keyframes dkSway{from{rotate:calc(var(--a,3deg)*-1)}to{rotate:var(--a,3deg)}}
@keyframes dkBob{from{translate:0 0}to{translate:0 var(--b,8px)}}
@keyframes dkFlap{from{scale:1 1.06}to{scale:1 .52}}
@keyframes dkFlut{from{scale:1 1}to{scale:.32 1}}
@keyframes dkTw{from{opacity:.8}to{opacity:.16}}
@keyframes dkTwk{0%,100%{opacity:0;scale:.2}50%{opacity:1;scale:1}}
/* halloween: webs in the top corners, a spider letting itself down from the right one; the moon, bats and pumpkins behind */
.dk-web{top:0;width:clamp(130px,22vmin,280px);aspect-ratio:1}
.dk-web.l{left:0}.dk-web.r{right:0;scale:-1 1}
.dk-spi{top:0;right:calc(clamp(130px,22vmin,280px)*.34);width:36px;height:36px;margin-right:-18px;animation:dkDrop 15s ease-in-out infinite alternate}
@keyframes dkDrop{0%,10%{translate:0 calc(clamp(130px,22vmin,280px)*.4)}90%,100%{translate:0 calc(clamp(130px,22vmin,280px)*.98)}}
.dk-spi>i{position:relative;transform-origin:50% -140px;animation:dkSway 4.4s ease-in-out infinite alternate;--a:2.5deg}
.dk-spi>i::before,.ik-spi>i::before{content:"";position:absolute;left:50%;bottom:58%;width:1px;margin-left:-.5px;height:300px;background:linear-gradient(transparent,rgba(228,234,248,.55) 55%)}
/* phones: the island's spider is enough, threads are shorter, and the moon and the sun rise above the page's title */
@media (max-width:560px){#deco .dk-spi{display:none}#deco{--k:.55}}
.dk-moon{left:88vw;top:15vh;width:clamp(210px,32vmin,400px);aspect-ratio:1;translate:-50% -50%;opacity:.75}
@media (max-width:560px){.dk-moon{top:9vh}}
.dk-bat{left:0;top:var(--y);width:var(--z);aspect-ratio:108/52;animation:dkFlyR var(--t) linear var(--dl) infinite}
.dk-bat.l{animation-name:dkFlyL}
.dk-bat>i{width:100%;height:100%;animation:dkBob 1.9s ease-in-out infinite alternate}
.dk-bat>i>i,.bq.flap>i{animation:dkFlap .2s ease-in-out infinite alternate}
@keyframes dkFlyR{0%{translate:-14vw 0}48%,100%{translate:114vw 0}}
@keyframes dkFlyL{0%{translate:114vw 0}48%,100%{translate:-14vw 0}}
.dk-pk{bottom:24px;width:var(--pz);aspect-ratio:120/104;--pz:clamp(64px,8.5vw,124px)}
.dk-pk.a{left:2.5vw}.dk-pk.b{left:calc(2.5vw + clamp(64px,8.5vw,124px)*.84);--pz:clamp(44px,5.8vw,84px)}
.dk-pglow{left:calc(2.5vw - 30px);bottom:-30px;width:calc(clamp(64px,8.5vw,124px)*2.2);aspect-ratio:1.6;border-radius:50%;
  background:radial-gradient(closest-side,rgba(255,150,50,.22),rgba(255,120,40,.07) 55%,transparent);animation:dkFlick 3.1s ease-in-out infinite}
@keyframes dkFlick{0%,100%{opacity:.8}18%{opacity:.55}33%{opacity:.9}51%{opacity:.62}68%{opacity:1}84%{opacity:.66}}
/* christmas: a string of lights in the spectrum's colours, from the corners to the island; snowy hills and firs behind */
.dk-lights{left:0;top:0;width:100%;height:110px}
.dk-wire{position:absolute;inset:0}
.dk-bulb{position:absolute;left:0;top:0;width:8px;height:12px;margin:-1px 0 0 -4px;translate:var(--x) var(--y);rotate:var(--a);transform-origin:50% 0;
  border-radius:50% 50% 46% 46%/42% 42% 58% 58%;background:radial-gradient(circle at 42% 34%,#fff 0 10%,var(--c) 46%,color-mix(in srgb,var(--c) 55%,#000));opacity:.28;transition:opacity .5s var(--d)}
.dk-bulb::before{content:"";position:absolute;left:1.5px;top:-3px;width:5px;height:4.5px;border-radius:1.5px;background:#2C3B32}
.dk-bulb>i{position:absolute;left:50%;top:62%;width:48px;height:48px;margin:-24px 0 0 -24px;border-radius:50%;background:radial-gradient(closest-side,color-mix(in srgb,var(--c) 62%,transparent),transparent);
  animation:dkTw var(--t) ease-in-out var(--dl) infinite alternate}
.dk-lights.lit .dk-bulb{opacity:1}
.dk-hills{left:0;bottom:0;width:100%;height:clamp(80px,19vh,210px)}
.dk-fir{bottom:4.4vh;width:calc(var(--fh)*.55);height:var(--fh);--fh:clamp(70px,15vh,170px)}
.dk-fir.s1{left:4vw}.dk-fir.s2{left:calc(4vw + clamp(70px,15vh,170px)*.46);bottom:3.4vh;--fh:clamp(48px,10vh,112px)}
.dk-fir.s3{right:6vw;bottom:6.4vh;--fh:clamp(60px,12.5vh,140px)}.dk-fir.s4{right:calc(6vw + clamp(60px,12.5vh,140px)*.5);bottom:4.6vh;--fh:clamp(42px,8.5vh,96px)}
.dk-glint{position:absolute;left:50%;top:7%;width:46%;aspect-ratio:1;translate:-50% -50%;border-radius:50%;background:radial-gradient(closest-side,rgba(255,226,140,.55),transparent);animation:dkTw 2.2s ease-in-out infinite alternate}
/* winter: icicles along the top, apart where the island is */
.dk-ice{top:0;height:clamp(36px,6vh,60px);width:calc(50% - 104px);background-repeat:repeat-x;background-size:auto 100%;background-position:0 0}
.dk-ice.l{left:0}.dk-ice.r{right:0;scale:-1 1}
/* new year: stars hanging on threads at the corners; fireworks behind */
.dk-hang{top:0;left:var(--x);width:var(--z);height:calc(var(--L)*var(--k,1) + var(--h));margin-left:calc(var(--z)/-2);transform-origin:50% 0;animation:dkSway var(--t) ease-in-out var(--dl) infinite alternate;--a:3.5deg}
.dk-hang::before{content:"";position:absolute;left:50%;top:0;width:1px;height:calc(var(--L)*var(--k,1) + 2px);background:linear-gradient(rgba(255,255,255,.12),rgba(255,255,255,.5))}
.dk-hang>i{position:absolute;left:0;bottom:0;height:var(--h)}
.dk-fw,.dk-fwt{left:var(--x);top:var(--y)}
.dk-fw{width:clamp(130px,21vmin,250px);aspect-ratio:1;margin:calc(clamp(130px,21vmin,250px)/-2) 0 0 calc(clamp(130px,21vmin,250px)/-2);opacity:0;animation:dkFw var(--t) ease-out var(--dl) infinite}
@keyframes dkFw{0%,13%{opacity:0;scale:.12;translate:0 0}16%{opacity:1}34%{scale:1}46%{opacity:.85}68%,100%{opacity:0;scale:1.1;translate:0 2.5vh}}
.dk-fwt{width:2px;height:70px;margin-left:-1px;background:linear-gradient(transparent,rgba(255,240,200,.75));opacity:0;animation:dkFwt var(--t) cubic-bezier(.2,.6,.4,1) var(--dl) infinite}
@keyframes dkFwt{0%{opacity:0;translate:0 60vh}2%{opacity:.9}13%{opacity:.9;translate:0 0}14%,100%{opacity:0;translate:0 0}}
/* birthday: bunting along the top; balloons rising behind */
.dk-bunt{left:0;top:0;width:100%;height:110px}
.dk-bal{left:var(--x);top:0;width:var(--z);aspect-ratio:60/150;opacity:.62;animation:dkRise var(--t) linear var(--dl) infinite}
.dk-bal>i{transform-origin:50% 20%;animation:dkSway 4.6s ease-in-out infinite alternate;--a:5deg}
@keyframes dkRise{from{translate:0 108vh}to{translate:0 -42vh}}
/* easter: painted eggs hanging at the corners, more in the grass behind */
.dk-nest{bottom:16px;width:clamp(150px,20vw,270px);aspect-ratio:230/120}
.dk-nest.a{left:1vw}.dk-nest.b{right:2vw;width:clamp(100px,12vw,170px)}
/* mărțișor: the red and white cord at the corners; snowdrops behind */
.dk-mrt{top:0;left:clamp(8px,3vw,44px);width:clamp(96px,15vmin,170px);aspect-ratio:150/214;transform-origin:56% 0;animation:dkSway 6.5s ease-in-out infinite alternate;--a:2.4deg}
.dk-mrt.r{left:auto;right:clamp(8px,3vw,44px);width:clamp(70px,10vmin,120px);scale:-1 1;animation-duration:7.8s}
.dk-drops{bottom:10px;width:clamp(110px,14vw,190px);aspect-ratio:130/160;transform-origin:50% 100%;animation:dkSway 7s ease-in-out infinite alternate;--a:1.2deg}
.dk-drops.a{left:2vw}.dk-drops.b{right:3vw;width:clamp(80px,10vw,140px);animation-duration:8.5s}
/* spring and autumn: a branch reaching in from a corner, swaying a little; butterflies or fallen leaves behind */
.dk-br{top:0;left:0;width:clamp(120px,min(42vmin,50vw - 84px),470px);aspect-ratio:340/160;transform-origin:0 16%;animation:dkSway 8s ease-in-out infinite alternate;--a:1.1deg}
.dk-br.r{left:auto;right:0;scale:-1 1;width:clamp(110px,min(30vmin,50vw - 84px),340px);animation-duration:9.4s}
.dk-br.sm{width:clamp(110px,min(24vmin,50vw - 84px),270px);animation-duration:10s}
.dk-bfly{left:0;top:0;width:var(--z);aspect-ratio:40/32}
.dk-bfly>i{width:100%;height:100%}
.dk-bfly>i>i{animation:dkFlut .3s ease-in-out infinite alternate}
.dk-bfly.f0{animation:dkB0 34s linear -5s infinite}.dk-bfly.f1{animation:dkB1 41s linear -22s infinite}.dk-bfly.f2{animation:dkB2 38s linear -13s infinite}
.dk-bfly.f0>i{animation:dkBob 2.3s ease-in-out infinite alternate;--b:-5vh}.dk-bfly.f1>i{animation:dkBob 1.8s ease-in-out infinite alternate;--b:4vh}.dk-bfly.f2>i{animation:dkBob 2.7s ease-in-out infinite alternate;--b:-3vh}
@keyframes dkB0{0%{translate:-8vw 62vh}50%,100%{translate:108vw 34vh}}
@keyframes dkB1{0%{translate:108vw 22vh}50%,100%{translate:-8vw 48vh}}
@keyframes dkB2{0%{translate:-8vw 80vh}50%,100%{translate:108vw 70vh}}
.dk-pile{bottom:10px;width:clamp(150px,19vw,260px);aspect-ratio:220/72;opacity:.8}
.dk-pile.a{left:0}.dk-pile.b{right:0;scale:-1 1;width:clamp(110px,13vw,190px)}
/* summer: a sunset, the sun low between palms */
.dk-hz{left:0;bottom:0;width:100%;height:58vh;background:linear-gradient(to top,rgba(255,138,58,.17),rgba(255,110,80,.07) 45%,transparent)}
.dk-sun{left:87vw;top:17vh;width:clamp(240px,38vmin,460px);aspect-ratio:1;translate:-50% -50%;opacity:.8}
@media (max-width:560px){.dk-sun{top:9vh}}
.dk-rays{position:absolute;inset:0;animation:dkSpin 140s linear infinite}
@keyframes dkSpin{to{rotate:1turn}}
.dk-palm{bottom:-2vh;height:clamp(220px,50vh,520px);aspect-ratio:260/350;transform-origin:23% 97%;animation:dkSway 7.5s ease-in-out infinite alternate;--a:1.3deg}
.dk-palm.a{left:-4vw}.dk-palm.b{left:6vw;height:clamp(160px,36vh,380px);animation-duration:9s}
.dk-palm.c{right:-3vw;scale:-1 1;height:clamp(200px,44vh,460px);animation-duration:8.2s}
/* the island's pieces sit on (or behind) the island and follow its width; while the menu is open they step aside */
.ideco{position:fixed;left:50%;top:calc(14px + env(safe-area-inset-top,0px));width:0;height:46px;z-index:46;pointer-events:none}
#ideco-b{z-index:45}
.ik{position:absolute;left:0;top:0;display:block;transition:transform .8s var(--spring),opacity .45s}
.ideco.off .ik{transition:transform .4s cubic-bezier(.5,0,.75,0),opacity .26s .08s;opacity:0}
.ik-spi{width:28px;height:28px;margin-left:-14px;top:54px}
.ik-spi>i{position:relative;animation:dkBob 3.4s ease-in-out infinite alternate;--b:7px}
.ik-spi>i::before{height:58px}
.off .ik-spi{transform:translateY(-52px)}
.ik-snl,.ik-snr{width:36px;height:24px;top:-9px}.ik-snr{margin-left:-36px}.ik-snr>i{scale:-1 1}
.ik-snm{width:100px;height:24px;margin-left:-50px;top:-9px}
.off .ik-snl,.off .ik-snm,.off .ik-snr{transform:translateY(-5px)}
.ik-hol{width:28px;height:19px;top:-13px}
.off .ik-hol{transform:translateY(-6px) scale(.7)}
.ik-icl{width:8px;height:18px;margin-left:-4px;top:44px}.ik-icl.b{height:13px}
.ik-spk{width:12px;height:12px;margin:-6px 0 0 -6px}.ik-spk>i{animation:dkTwk 2.6s ease-in-out infinite}
.ik-spk.a{top:6px}.ik-spk.b{top:-2px;width:9px;height:9px}.ik-spk.b>i{animation-delay:-.9s}.ik-spk.c{top:44px;width:8px;height:8px}.ik-spk.c>i{animation-delay:-1.7s}
.ik-hat{width:19px;height:26px;margin-left:-9px;top:-15px}.ik-hat>i{rotate:24deg}
.off .ik-hat{transform:translate(12px,-26px) rotate(40deg)}
.ik-ears{width:22px;height:27px;margin-left:-11px;top:-14px;transform-origin:50% 100%}.ik-ears>i{transform-origin:50% 100%;animation:dkTwitch 7s ease-in-out infinite}
@keyframes dkTwitch{0%,84%,100%{rotate:0deg}87%{rotate:-7deg}90%{rotate:3deg}93%{rotate:-4deg}96%{rotate:0deg}}
.off .ik-ears{transform:translateY(28px)}
.ik-mrt{width:16px;height:56px;margin-left:-8px;top:22px}.ik-mrt>i{transform-origin:50% 0;animation:dkSway 3.8s ease-in-out infinite alternate;--a:5deg}
.off .ik-mrt{transform:translateY(-44px)}
.ik-bfly{width:22px;height:18px;margin-left:-11px;top:-14px}.ik-bfly>i{animation:dkFlut 1.6s ease-in-out infinite alternate}
.ideco.off .ik-bfly{transform:translate(90px,-80px) rotate(28deg) scale(.6);transition:transform .9s cubic-bezier(.3,.2,.6,1),opacity .5s .35s}
.ik-palm{width:25px;height:28px;margin-left:-19px;top:-11px;transform-origin:60% 100%}.ik-palm>i{scale:-1 1;transform-origin:54% 100%;animation:dkSway 3.6s ease-in-out infinite alternate;--a:4deg}
.off .ik-palm{transform:scale(.2)}
.ik-leaf{width:17px;height:20px;margin-left:-8px;top:-12px}.ik-leaf>i{rotate:-28deg}
.ideco.off .ik-leaf{transform:translate(-70px,110px) rotate(-220deg);transition:transform .9s cubic-bezier(.4,0,.7,.6),opacity .5s .4s}
/* what the opening throws out */
#dburst{position:fixed;left:50%;top:calc(14px + env(safe-area-inset-top,0px));width:0;height:0;z-index:45;pointer-events:none;display:none}
#dburst.on{display:block}
.bq{position:absolute;left:0;top:0;display:block;will-change:transform,opacity}
.bq>i{display:block;width:100%;height:100%;background:var(--img) no-repeat center/100% 100%}
.bq.dot>i{border-radius:50%;background:radial-gradient(circle,var(--c) 0,var(--c) 35%,transparent 72%)}
.bq.glow>i{box-shadow:0 0 8px 1px color-mix(in srgb,var(--c) 60%,transparent);background:radial-gradient(circle,#fff 0,var(--c) 45%,transparent 75%)}
.bq.rect>i{border-radius:1.5px;background:var(--c)}
.bq.petal>i{border-radius:70% 0 70% 0;background:linear-gradient(135deg,var(--c),color-mix(in srgb,var(--c) 60%,#fff))}
@media (prefers-reduced-motion:reduce){.fly,#dburst{display:none!important}.ik{transition:none!important}.dk-spi{translate:0 calc(clamp(130px,22vmin,280px)*.62)}}
`;

  /* ---------- state ---------- */
  let th = null, cfg = {}, tierT = 0, W = 150, shown = false, open = false, pg = 'home', st = 0, bt = 0, deco = null, front = null, backL = null, bbox = null;
  const pieces = [];
  function build() { if (!th) return; deco.replaceChildren(); th.frame(deco); if (shown) lit() }
  function lit() { const l = deco.querySelector('.dk-lights'); if (l) requestAnimationFrame(() => l.classList.add('lit')) }
  function mount(o) { cfg = o; th = THEMES[o.id] || null; tierT = o.tier || 0; if (!th) return;
    const s = document.createElement('style'); s.id = 'themes-css'; s.textContent = CSS; document.head.appendChild(s);
    deco = document.createElement('div'); deco.id = 'deco'; deco.setAttribute('aria-hidden', 'true'); build();
    const isl = document.getElementById('island');
    front = document.createElement('div'); front.id = 'ideco'; backL = document.createElement('div'); backL.id = 'ideco-b';
    [front, backL].forEach(c => { c.className = 'ideco off'; c.setAttribute('aria-hidden', 'true') });
    th.island().forEach(p => { pieces.push(p); (p.dataset.back ? backL : front).appendChild(p) });
    if (isl) { isl.before(deco, backL); isl.after(front) } else document.body.append(deco, backL, front);
    place(0);
    if (th.wide) { let rt = 0, lw = innerWidth; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (innerWidth !== lw) { lw = innerWidth; build() } }, 200) }) } }

  /* the island's width changed (closed island only): the pieces move with its ends, on its own spring */
  function xOf(p, w) { const a = p.dataset.a, dx = +p.dataset.dx; return (a === 'l' ? -w / 2 : a === 'r' ? w / 2 : 0) + dx }
  function place(D, E, delay = 0) { pieces.forEach(p => { if (p.dataset.a === 'm') { morph(p, 'scale', `${Math.max(0, (W - 68) / 100).toFixed(4)} 1`, D, E, delay); return }
    morph(p, 'translate', `${xOf(p, W).toFixed(1)}px 0`, D, E, delay) }) }
  function morph(el, prop, to, D, E, delay) { const was = D && !cfg.reduce ? getComputedStyle(el)[prop] : null;
    el.getAnimations().forEach(a => { if (a.id === 'iw') a.cancel() }); el.style[prop] = to;
    if (was && was !== 'none' && was !== to) el.animate([{[prop]: was}, {[prop]: to}], {duration: D, delay, easing: E, fill: 'backwards', id: 'iw'}) }
  function island(w, D, E, delay) { W = w; if (pieces.length) place(D, E, delay) }

  /* hidden before the first reveal, while the menu is open and on a project's own page; they come back once the island has
     closed again */
  const OWN = new Set(['dl', 'pass']);   // a project's own page keeps its own look
  function sync(later) { clearTimeout(st); const off = !shown || open || OWN.has(pg);
    const go = () => [front, backL].forEach(c => { if (c) c.classList.toggle('off', off) });
    if (off || !later) go(); else st = setTimeout(go, later) }
  function reveal(ms) { if (!th) return; setTimeout(() => { shown = true; deco.classList.add('on'); lit(); sync() }, ms || 0) }
  function page(id) { pg = id; root.dataset.pg = id; if (th) sync(OWN.has(id) ? 0 : 500) }
  function tier(t) { tierT = t }
  function menu(on, l) { if (!th) return; open = on; sync(on ? 0 : 420); if (on && shown && !OWN.has(pg)) { clearTimeout(bt); bt = setTimeout(() => burst(l || {w: 300, h: 160}), 110) } }

  /* the scene behind a page's content */
  function back(box) { if (!th) return; const sc = mk('dks'); th.scene(sc); if (sc.children.length) box.appendChild(sc) }

  /* ---------- the burst ---------- */
  function burst(l) { const B = BURSTS[th.burst]; if (!B || cfg.reduce || tierT >= 3) return; const n = Math.round(B.n * [1, .8, .5, 0][tierT]); if (!n) return;
    if (!bbox) { bbox = document.createElement('div'); bbox.id = 'dburst'; bbox.setAttribute('aria-hidden', 'true'); document.body.appendChild(bbox) }
    bbox.getAnimations({subtree: true}).forEach(a => a.cancel()); bbox.replaceChildren(); bbox.classList.add('on');
    let end = 0; sd = (Date.now() % 1e6) + 1;
    for (let i = 0; i < n; i++) { const p = B.part(i, l.w, l.h), z = p.z, h = p.h || z, e = mk('bq' + (p.flap ? ' flap' : '') + (p.dot ? ' dot' : '') + (p.glow ? ' glow' : '') + (p.rect ? ' rect' : '') + (p.petal ? ' petal' : ''),
        {c: p.dot || p.rect || p.petal || '#fff', ...(p.img ? {img: p.img} : {})}, mk(''));
      Object.assign(e.style, {width: F(z) + 'px', height: F(h) + 'px', marginLeft: F(-z / 2) + 'px', marginTop: F(-h / 2) + 'px'});
      bbox.appendChild(e); const dl = p.dl || R(0, 120); e.animate(frames(p, l), {duration: p.T, delay: dl, easing: 'linear', fill: 'both'}); end = Math.max(end, p.T + dl) }
    clearTimeout(bbox._t); bbox._t = setTimeout(() => { bbox.classList.remove('on'); bbox.replaceChildren() }, end + 80) }
  const fade = (u, a = .06, b = .7) => u < a ? u / a : u > b ? Math.max(0, 1 - (u - b) / (1 - b)) : 1;
  function frames(p, l) { const K = [], S = 18;
    if (p.path) { const q = p.path, cx = q.x1 * .3, cy = q.y0 + q.dip;                                    // bats: out along a swoop, growing nearer
      for (let s = 0; s <= S; s++) { const t = s / S, u = 1 - Math.pow(1 - t, 1.5), v = 1 - u, x = v * v * q.x0 + 2 * u * v * cx + u * u * q.x1, y = v * v * q.y0 + 2 * u * v * cy + u * u * q.y1 + Math.sin(u * 9) * 8;
        K.push({transform: `translate(${F(x)}px,${F(y)}px) scale(${(q.s0 + (q.s1 - q.s0) * u).toFixed(3)})`, opacity: fade(t, .08, .72)}) } return K }
    if (p.twinkle) { const t = p.twinkle; return [{transform: `translate(${F(t.x * .7)}px,${F(t.y * .7)}px) scale(.1) rotate(0deg)`, opacity: 0},
      {transform: `translate(${F(t.x * .9)}px,${F(t.y * .9)}px) scale(1) rotate(45deg)`, opacity: 1, offset: .45}, {transform: `translate(${F(t.x)}px,${F(t.y)}px) scale(.2) rotate(90deg)`, opacity: 0}] }
    const f = p.phys, x0 = R(-.36, .36) * l.w, y0 = l.h * R(.84, 1), ph = R(0, 6.3), r0 = R(0, 360);
    for (let s = 0; s <= S; s++) { const u = s / S, t = u * p.T / 1000, e = (1 - Math.exp(-f.k * t)) / f.k;
      const x = x0 + f.vx * e + (f.sw || 0) * Math.sin(ph + t * (f.sp || 0)), y = y0 + f.g / f.k * t + (f.vy - f.g / f.k) * e;
      K.push({transform: `translate(${F(x)}px,${F(y)}px) rotate(${F(r0 + (f.vr || 0) * t)}deg)`, opacity: fade(u)}) }
    return K }

  window.THEMES = {mount, back, island, menu, page, tier, reveal};
})();
