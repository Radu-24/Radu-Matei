/* Password Helper's project page: the checker, the leak check, the generator, the vault and the verification codes, working
   in the page the way they work in the app (github.com/Radu-24/Password-Helper). Everything runs in this page and nothing is
   stored: no cookies, no storage, and the inputs are emptied when the page is left. The one thing that ever leaves the
   device is the leak check, and only when it is asked for: the first 5 characters of the password's SHA-1 hash go to Have
   I Been Pwned (k-anonymity), and the match is made here.
   - EST: the strength estimate. The app uses zxcvbn-ts with full English and Romanian dictionaries (about 8 MB); this is
     the same method in a few kilobytes: find the patterns an attacker tries first (common passwords, words and names, also
     with l33t swaps or reversed, keyboard runs, sequences, repeats, years and dates), pick the cheapest way to cover the
     password with them (zxcvbn's search), and turn the number of guesses into a score and crack times.
   - GEN: the generator, as in the app: the browser's CSPRNG with rejection sampling (no modulo bias), passphrases from the
     EFF Large Wordlist (loaded only when a passphrase is asked for).
   - The page itself (attach / open / shown / reset), called from index.html, which owns the page transitions.
   Animations are compositor work (transform, opacity); the few that change text (decoding) run only for a moment after a
   click. */
(() => {
  'use strict';

  /* ---------- the strength estimate ---------- */
  const EST = (() => {
    const words = s => s.trim().split(/\s+/);
    /* ranked: the earlier, the more common */
    const PASSWORDS = words(`123456 password 123456789 12345678 12345 qwerty 1234567 111111 1234567890 123123 abc123 1234 password1 iloveyou
      1q2w3e4r 000000 qwerty123 zaq12wsx dragon sunshine princess letmein 654321 monkey 27653 1qaz2wsx 123321 qwertyuiop superman asdfghjkl
      666666 football 121212 trustno1 baseball welcome 1q2w3e 123qwe 7777777 michael charlie aa123456 123abc donald qwe123 password123 shadow
      master 696969 jessica 112233 login admin starwars hello freedom whatever qazwsx ninja mustang access flower hottie loveme passw0rd batman
      zaq1zaq1 jordan23 harley ranger hunter2 buster soccer hockey killer george sexy andrew thomas tigger robert computer michelle maggie
      jennifer joshua pepper ginger summer daniel corvette taylor cheese matrix 131313 amanda yankees silver golfer orange internet lakers
      coffee secret 11111111 cookie 987654321 nicole chelsea biteme ashley samsung lovely angel 159753 mercedes chocolate anthony purple
      pokemon diamond liverpool arsenal barcelona google hello123 123654 asdfgh asdf 1111 abcd1234 qwer1234 a123456 admin123 root toor test
      test123 guest changeme default 5201314 123qweasd 1qazxsw2 qweasd qweasdzxc 147258369 147258 789456123 789456 159357 852456 456789 999999
      888888 555555 444444 222222 333333 101010 aaaaaa abcdef abcdefg monkey123 dragon123 iloveyou1 princess1 sunshine1 football1 welcome1
      letmein1 password2 qwerty1 1234qwer zxcvbnm zxcvbn asdfghjk 1qaz 1q2w parola parola123 parola1 iubire iubita iubitul dragoste bucuresti
      romania steaua dinamo craiova brasov florin andrei alexandru andreea ionut mihai cristina elena maria ioana alina 123456a qwerty12`);
    const ENGLISH = words(`love tennis football soccer summer winter spring autumn money family friend friends music guitar piano angel heart
      star stars moon light dark black white blue green yellow orange purple silver gold golden diamond crystal magic secret pass word hello
      world life dream dreams hope faith peace power king queen prince lord god jesus devil hell heaven fire water earth wind storm thunder rain
      snow ocean river mountain forest tree rose lily daisy tiger lion wolf bear eagle falcon hawk horse dog cat puppy kitty bunny rabbit
      fish shark snake spider butterfly phoenix unicorn wizard ninja pirate soldier warrior hunter killer ranger rocket space planet galaxy
      matrix computer internet google apple banana cherry lemon chocolate cookie candy sugar honey coffee pizza burger beer vodka party game
      games gamer player soccer hockey baseball basketball golf racing car cars bike motor speed fast rider driver ferrari porsche bmw mercedes
      audi honda toyota ford mustang corvette harley yamaha school college student teacher doctor nurse police army navy marine pilot captain
      boss admin user login guest test demo home house garden city town london paris berlin rome madrid america england france germany italy
      spain canada mexico china japan india russia brazil europe monday tuesday wednesday thursday friday saturday sunday january february
      march april june july august september october november december baby sweet cutie pretty beautiful sexy lovely darling forever always
      never nothing everything someone change correct battery staple horse office window door table chair phone mobile iphone samsung nokia
      android windows linux server network wifi router hacker cyber security private public access system control energy electric robot rover
      link data code coder program python java script simple easy hard strong weak super ultra mega alpha beta gamma delta omega sigma zero one
      two three four five six seven eight nine ten first last best good great cool awesome crazy funny lucky happy smile sunshine shadow
      master dragon monkey princess flower freedom welcome letmein qwerty`);
    const ROMANIAN = words(`parola iubire dragoste inima soare luna stea cer mare munte padure floare trandafir casa acasa familie mama tata frate
      sora prieten prietena copil fata baiat dulce frumos frumoasa viata vis noroc fericire libertate pace credinta dumnezeu inger lup urs vulpe
      pisica catel cal masina scoala munca bani aur argint rosu albastru verde galben negru alb iarna vara toamna primavara luni marti
      miercuri joi vineri sambata duminica ianuarie februarie martie aprilie mai iunie iulie septembrie octombrie noiembrie decembrie romania
      bucuresti brasov cluj iasi timisoara constanta craiova sibiu oradea galati ploiesti steaua dinamo rapid fotbal tenis minge campion
      sanatate multumesc salut buna noapte timp apa foc pamant vant ploaie zapada`);
    const NAMES = words(`radu matei andrei alexandru alex mihai ion ioan ionut george gheorghe vasile constantin florin bogdan cristian adrian
      marius daniel gabriel stefan nicolae dan dragos cosmin catalin ciprian razvan sorin vlad ovidiu lucian paul victor tudor david darius
      luca eric sebastian robert raul rares denis maria elena ioana andreea alexandra ana cristina mihaela gabriela diana alina roxana raluca
      simona monica irina laura bianca georgiana larisa denisa teodora sofia sara daria antonia ilinca iulia oana adina corina carmen lavinia
      madalina florentina nicoleta claudia james john michael william richard joseph thomas charles christopher matthew anthony mark donald
      steven andrew joshua kevin brian edward ryan jason justin jacob nicholas jonathan tyler aaron adam nathan kyle jordan sam ben jack
      harry charlie oliver mary patricia jennifer linda elizabeth barbara susan jessica sarah karen nancy lisa betty margaret sandra ashley
      emily michelle amanda melissa stephanie rebecca sharon amy anna nicole samantha katie emma olivia sophia chloe lucy hannah grace alice
      kate julia lily ella mia smith johnson williams brown jones miller davis wilson taylor popescu ionescu popa pop dumitru stan stoica rusu
      munteanu marin florea nistor dinu lazar`);
    /* each dictionary: name → word → rank (first seen wins, so a word keeps its most common rank) */
    const DICTS = {};
    [['passwords', PASSWORDS], ['english', ENGLISH], ['romanian', ROMANIAN], ['names', NAMES]].forEach(([n, list]) => {
      const m = new Map(); list.forEach(w => { if (!m.has(w)) m.set(w, m.size + 1) }); DICTS[n] = m });
    const MAXW = 16;
    const L33T = {a: ['4', '@'], b: ['8'], e: ['3'], g: ['9'], i: ['1', '!', '|'], l: ['1', '|'], o: ['0'], s: ['$', '5'], t: ['7', '+'], z: ['2']};
    const UNL33T = {};
    for (const k in L33T) L33T[k].forEach(c => (UNL33T[c] = UNL33T[c] || []).push(k));

    const nCk = (n, k) => { if (k > n) return 0; if (k === 0) return 1; let r = 1; for (let d = 1; d <= k; d++) r = r * (n - k + d) / d; return r };
    const fact = n => { let f = 1; for (let i = 2; i <= n; i++) f *= i; return f };
    /* zxcvbn's extra guesses for capitals: first letter or all caps x2, otherwise every way of placing that many capitals */
    function upperVariations(t) {
      if (t === t.toLowerCase()) return 1;
      if (/^[A-Z][^A-Z]+$/.test(t) || /^[^A-Z]+[A-Z]$/.test(t) || /^[^a-z]+$/.test(t)) return 2;
      const U = (t.match(/[A-Z]/g) || []).length, Lw = (t.match(/[a-z]/g) || []).length;
      let v = 0; for (let i = 1; i <= Math.min(U, Lw); i++) v += nCk(U + Lw, i); return v || 1;
    }
    function l33tVariations(m) {
      if (!m.subs) return 1;
      let v = 1; for (const [real, fake] of Object.entries(m.subs)) {
        const lower = m.token.toLowerCase(), S = [...lower].filter(c => c === fake).length, U = [...lower].filter(c => c === real).length;
        if (!S || !U) v *= 2; else { let p = 0; for (let i = 1; i <= Math.min(U, S); i++) p += nCk(U + S, i); v *= p }
      }
      return v;
    }
    /* every way of reading a token's l33t characters as letters (at most a few, the token is short) */
    function unl33ts(t) {
      let outs = [{s: '', subs: {}}];
      for (const c of t) {
        const opts = UNL33T[c]; if (!opts) { outs.forEach(o => (o.s += c)); continue }
        const next = []; outs.forEach(o => { next.push({s: o.s + c, subs: o.subs}); opts.forEach(r => next.push({s: o.s + r, subs: {...o.subs, [r]: c}})) });
        outs = next.slice(0, 16);
      }
      return outs.filter(o => Object.keys(o.subs).length);
    }

    function dictionaryMatches(pw) {
      const out = [], low = pw.toLowerCase(), n = pw.length;
      const add = (i, j, word, d, rank, extra) => out.push({pattern: 'dictionary', i, j, token: pw.slice(i, j + 1), word, dict: d, rank, ...extra});
      for (let i = 0; i < n; i++) for (let j = i + 2; j < Math.min(n, i + MAXW); j++) {
        const t = low.slice(i, j + 1), r = [...t].reverse().join('');
        for (const d in DICTS) {
          const m = DICTS[d];
          if (m.has(t)) add(i, j, t, d, m.get(t));
          else if (t.length > 3 && m.has(r)) add(i, j, r, d, m.get(r), {reversed: true});
        }
        if (/[^a-z]/.test(t)) for (const u of unl33ts(t)) for (const d in DICTS) if (DICTS[d].has(u.s)) add(i, j, u.s, d, DICTS[d].get(u.s), {subs: u.subs});
      }
      return out;
    }

    /* keyboard runs: keys next to each other on a QWERTY keyboard (shifted keys count as the same key) */
    const ROWS = ['`1234567890-=', 'qwertyuiop[]\\', "asdfghjkl;'", 'zxcvbnm,./'], SHIFT = '~!@#$%^&*()_+QWERTYUIOP{}|ASDFGHJKL:"ZXCVBNM<>?';
    const UNSHIFT = '`1234567890-=qwertyuiop[]\\asdfghjkl;\'zxcvbnm,./', POS = {};
    ROWS.forEach((row, r) => [...row].forEach((c, k) => (POS[c] = [r, k + r * .5])));
    const keyOf = c => { const s = SHIFT.indexOf(c); return s >= 0 ? UNSHIFT[s] : c };
    function dir(a, b) { const p = POS[keyOf(a)], q = POS[keyOf(b)]; if (!p || !q) return null; const dr = q[0] - p[0], dc = q[1] - p[1];
      if (Math.abs(dr) > 1 || Math.abs(dc) > 1 || (dr === 0 && dc === 0)) return null; return dr + ',' + dc }
    function spatialMatches(pw) {
      const out = []; let i = 0;
      while (i < pw.length - 2) {
        let j = i, turns = 0, last = null, shifted = SHIFT.includes(pw[i]) && !/[A-Z]/.test(pw[i]) ? 1 : 0;
        while (j + 1 < pw.length) { const d = dir(pw[j], pw[j + 1]); if (!d) break; if (d !== last) turns++; last = d; if (SHIFT.includes(pw[j + 1])) shifted++; j++ }
        if (j - i >= 2) { out.push({pattern: 'spatial', i, j, token: pw.slice(i, j + 1), turns, shifted}); i = j } else i++;
      }
      return out;
    }
    /* sequences: abc, 135, ZYX... the same step between neighbours */
    function sequenceMatches(pw) {
      const out = [], cls = c => /[a-z]/.test(c) ? 'l' : /[A-Z]/.test(c) ? 'u' : /\d/.test(c) ? 'd' : '';
      let i = 0;
      while (i < pw.length - 2) {
        const d = pw.charCodeAt(i + 1) - pw.charCodeAt(i);
        if (!d || Math.abs(d) > 5 || !cls(pw[i]) || cls(pw[i]) !== cls(pw[i + 1])) { i++; continue }
        let j = i + 1; while (j + 1 < pw.length && pw.charCodeAt(j + 1) - pw.charCodeAt(j) === d && cls(pw[j + 1]) === cls(pw[i])) j++;
        if (j - i >= 2) { out.push({pattern: 'sequence', i, j, token: pw.slice(i, j + 1), ascending: d > 0}); i = j } else i++;
      }
      return out;
    }
    /* repeats: aaa, abcabc */
    function repeatMatches(pw) {
      const out = [], re = /(.+?)\1+/g; let m;
      while ((m = re.exec(pw))) {
        const greedy = /(.+)\1+/.exec(pw.slice(m.index)), base = greedy && greedy[0].length > m[0].length ? greedy : m;
        const unit = base === greedy ? /^(.+?)\1+$/.exec(greedy[0])[1] : m[1];
        if (base[0].length >= 3) out.push({pattern: 'repeat', i: m.index, j: m.index + base[0].length - 1, token: base[0], unit, count: base[0].length / unit.length});
        re.lastIndex = m.index + Math.max(1, base[0].length);
      }
      return out;
    }
    /* years 1900-2099, and dates like 24.01.2001, 2401, 24012001 */
    const YEAR = new Date().getFullYear();
    function dateMatches(pw) {
      const out = [];
      for (const m of pw.matchAll(/(19\d\d|20\d\d)/g)) out.push({pattern: 'year', i: m.index, j: m.index + 3, token: m[0], year: +m[0]});
      for (let i = 0; i < pw.length; i++) for (let j = i + 3; j < Math.min(pw.length, i + 10); j++) {
        const t = pw.slice(i, j + 1);
        const sep = /^(\d{1,4})([\s/\\_.-])(\d{1,2})\2(\d{1,4})$/.exec(t);
        const parts = sep ? [[+sep[1], +sep[3], +sep[4]]] : /^\d{4,8}$/.test(t) ? splits(t) : [];
        for (const p of parts) { const d = asDate(p); if (d) { out.push({pattern: 'date', i, j, token: t, year: d.year, separator: !!sep}); break } }
      }
      return out;
    }
    const splits = t => { const n = t.length, s = []; for (let a = 1; a <= 2; a++) for (let b = a + 1; b <= a + 2 && b < n; b++) s.push([+t.slice(0, a), +t.slice(a, b), +t.slice(b)]); return s };
    function asDate([a, b, c]) {
      const yr = y => y > 99 ? (y >= 1000 && y <= 2050 ? y : null) : y > 50 ? 1900 + y : 2000 + y;
      for (const [d, m, y] of [[a, b, c], [b, a, c], [b, c, a], [c, b, a]]) {
        const Y = yr(y); if (Y && m >= 1 && m <= 12 && d >= 1 && d <= 31 && (String(y).length === 4 || String(y).length === 2)) return {year: Y};
      }
      return null;
    }

    function guesses(m) {
      if (m.g) return m.g;
      const n = m.token.length, minG = n === 1 ? 11 : 51;
      let g;
      switch (m.pattern) {
        case 'bruteforce': g = Math.max(Math.pow(10, n), n === 1 ? 11 : 51); return (m.g = g);
        case 'dictionary': g = m.rank * upperVariations(m.token) * l33tVariations(m) * (m.reversed ? 2 : 1); break;
        case 'spatial': { const S = 94, D = 4.6, L = n, t = m.turns; g = 0;
          for (let i = 2; i <= L; i++) for (let j = 1; j <= Math.min(t, i - 1); j++) g += nCk(i - 1, j - 1) * S * Math.pow(D, j);
          if (m.shifted) { const s = m.shifted, u = L - s; if (!u) g *= 2; else { let v = 0; for (let i = 1; i <= Math.min(s, u); i++) v += nCk(s + u, i); g *= v } }
          break }
        case 'sequence': { const c = m.token[0]; let base = /[aAzZ019]/.test(c) ? 4 : /\d/.test(c) ? 10 : 26; if (!m.ascending) base *= 2; g = base * n; break }
        case 'repeat': g = estimate(m.unit, true).guesses * m.count; break;
        case 'year': g = Math.max(Math.abs(m.year - YEAR), 20); break;
        case 'date': g = 365 * Math.max(Math.abs(m.year - YEAR), 20) * (m.separator ? 4 : 1); break;
      }
      return (m.g = Math.max(g, minG));
    }

    /* zxcvbn's search: the cheapest sequence of matches (and brute-forced gaps) that covers the password. A sequence of l
       pieces costs l! x the product of their guesses (any order), plus 10000^(l-1) for every extra piece. */
    function bestCover(pw, matches) {
      const n = pw.length, byEnd = Array.from({length: n}, () => []);
      matches.forEach(m => byEnd[m.j].push(m));
      const opt = Array.from({length: n}, () => ({m: new Map(), pi: new Map(), g: new Map()}));
      const update = (m, l) => {
        const k = m.j; let pi = guesses(m); if (l > 1) pi *= opt[m.i - 1].pi.get(l - 1);
        const g = fact(l) * pi + Math.pow(1e4, l - 1);
        for (const [ll, gg] of opt[k].g) if (ll <= l && gg <= g) return;
        opt[k].m.set(l, m); opt[k].pi.set(l, pi); opt[k].g.set(l, g);
      };
      const bf = (i, j) => ({pattern: 'bruteforce', i, j, token: pw.slice(i, j + 1)});
      for (let k = 0; k < n; k++) {
        byEnd[k].forEach(m => { if (m.i > 0) opt[m.i - 1].m.forEach((_, l) => update(m, l + 1)); else update(m, 1) });
        update(bf(0, k), 1);
        for (let i = 1; i <= k; i++) { const m = bf(i, k); opt[i - 1].m.forEach((last, l) => { if (last.pattern !== 'bruteforce') update(m, l + 1) }) }
      }
      let bestL = 0, bestG = Infinity; opt[n - 1].g.forEach((g, l) => { if (g < bestG) { bestG = g; bestL = l } });
      const seq = []; let k = n - 1, l = bestL;
      while (k >= 0) { const m = opt[k].m.get(l); seq.unshift(m); k = m.i - 1; l--; }
      return {guesses: bestG, sequence: seq};
    }

    const display = s => {
      const M = 60, H = M * 60, D = H * 24, Mo = D * 31, Y = Mo * 12, C = Y * 100;
      const f = (v, u) => { const r = Math.round(v); return `${r} ${u}${r === 1 ? '' : 's'}` };
      return s < 1 ? 'less than a second' : s < M ? f(s, 'second') : s < H ? f(s / M, 'minute') : s < D ? f(s / H, 'hour') : s < Mo ? f(s / D, 'day') : s < Y ? f(s / Mo, 'month') : s < C ? f(s / Y, 'year') : 'centuries';
    };
    const LABELS = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'];
    const DESCRIBE = {
      passwords: 'on the common-passwords list', english: 'a common English word', romanian: 'a common Romanian word', names: 'a common name',
      spatial: 'a keyboard pattern', sequence: 'a sequence like abc or 123', repeat: 'repeated characters', year: 'looks like a year', date: 'looks like a date'};
    function describe(m) {
      if (m.pattern === 'dictionary') return DESCRIBE[m.dict] + (m.subs ? ', with l33t swaps' : '') + (m.reversed ? ', reversed' : '');
      return DESCRIBE[m.pattern] || null;
    }
    /* what to say about the weakest part, roughly as zxcvbn says it */
    function feedback(seq, score) {
      if (score > 2) return {warning: null, suggestions: []};
      const longest = seq.filter(m => m.pattern !== 'bruteforce').sort((a, b) => b.token.length - a.token.length)[0];
      const sugg = ['Add another word or two. Uncommon words are better.'], only = seq.length === 1;
      if (!longest) return {warning: null, suggestions: ['Use a few words, avoid common phrases.', 'No need for symbols, digits or capitals.']};
      let w = null;
      switch (longest.pattern) {
        case 'dictionary':
          if (longest.dict === 'passwords') w = only && !longest.subs && !longest.reversed ? (longest.rank <= 10 ? 'This is a top-10 common password.' : longest.rank <= 100 ? 'This is a top-100 common password.' : 'This is a very common password.') : 'This is similar to a commonly used password.';
          else if (longest.dict === 'names') w = only ? 'Names and surnames by themselves are easy to guess.' : 'Common names and surnames are easy to guess.';
          else w = only ? 'A word by itself is easy to guess.' : null;
          if (/^[A-Z][^A-Z]+$/.test(longest.token)) sugg.push('Capitalising the first letter doesn’t help very much.');
          else if (longest.token === longest.token.toUpperCase() && /[A-Z]/.test(longest.token)) sugg.push('All capitals are almost as easy to guess as all lowercase.');
          if (longest.reversed && longest.token.length >= 4) sugg.push('Reversed words aren’t much harder to guess.');
          if (longest.subs) sugg.push('Swaps like @ for a don’t help very much.');
          break;
        case 'spatial': w = longest.turns === 1 ? 'Straight rows of keys are easy to guess.' : 'Short keyboard patterns are easy to guess.'; sugg.push('Use a longer keyboard pattern with more turns.'); break;
        case 'repeat': w = longest.unit.length === 1 ? 'Repeats like “aaa” are easy to guess.' : 'Repeats like “abcabc” are only a little harder to guess than “abc”.'; sugg.push('Avoid repeated words and characters.'); break;
        case 'sequence': w = 'Sequences like abc or 6543 are easy to guess.'; sugg.push('Avoid sequences.'); break;
        case 'year': w = 'Recent years are easy to guess.'; sugg.push('Avoid recent years, and years that are associated with you.'); break;
        case 'date': w = 'Dates are often easy to guess.'; sugg.push('Avoid dates and years that are associated with you.'); break;
      }
      return {warning: w, suggestions: sugg};
    }
    const LIMIT = 64;
    function estimate(input, inner) {
      const pw = Array.from(input).slice(0, LIMIT).join('');
      if (!pw) return {guesses: 0, score: 0};
      const matches = [...dictionaryMatches(pw), ...spatialMatches(pw), ...sequenceMatches(pw), ...repeatMatches(pw), ...dateMatches(pw)];
      const {guesses: g, sequence} = bestCover(pw, matches);
      if (inner) return {guesses: g};
      const d = 5, score = g < 1e3 + d ? 0 : g < 1e6 + d ? 1 : g < 1e8 + d ? 2 : g < 1e10 + d ? 3 : 4;
      return {
        guesses: g, log10: Math.log10(g), score, label: LABELS[score],
        crack: {slow: display(g / 1e4), fast: display(g / 1e10), online: display(g / 10), throttled: display(g / (100 / 3600))},
        matches: sequence.filter(m => m.pattern !== 'bruteforce').map(m => ({token: m.token, what: describe(m)})).filter(m => m.what),
        ...feedback(sequence, score), truncated: Array.from(input).length > LIMIT,
      };
    }
    return {estimate, LABELS};
  })();

  /* ---------- hashes, Have I Been Pwned ---------- */
  const hexOf = buf => Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
  const sha1 = async s => hexOf(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(s))).toUpperCase();
  const HIBP = (() => {
    const URL_ = 'https://api.pwnedpasswords.com/range/', cache = new Map();
    const timeout = ms => { if (AbortSignal.timeout) return AbortSignal.timeout(ms); const c = new AbortController(); setTimeout(() => c.abort(), ms); return c.signal };
    /* Add-Padding makes every answer 800-1000 lines, so its size does not give the prefix away; if a browser refuses to send
       that header across origins, the check goes without it (the prefix is the same either way) */
    async function range(prefix) {
      if (cache.has(prefix)) return cache.get(prefix);
      const go = headers => fetch(URL_ + prefix, {headers, mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer', signal: timeout(9000)});
      let r; try { r = await go({'Add-Padding': 'true'}) } catch (e) { if (e && e.name === 'AbortError') throw e; r = await go({}) }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const body = await r.text(); cache.set(prefix, body); return body;
    }
    /* how many times the rest of the hash appears in the answer; padding rows have a count of 0 */
    function count(body, suffix) {
      for (const line of body.split(/\r?\n/)) { const c = line.indexOf(':'); if (c < 0) continue;
        if (line.slice(0, c).trim().toUpperCase() === suffix) { const n = parseInt(line.slice(c + 1), 10); return n > 0 ? n : 0 } }
      return 0;
    }
    const lines = body => body.split(/\r?\n/).filter(l => l.includes(':')).length;
    return {range, count, lines};
  })();

  /* ---------- the generator (as in the app) ---------- */
  const GEN = (() => {
    const SETS = {lower: 'abcdefghijklmnopqrstuvwxyz', upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', digits: '0123456789', symbols: '!@#$%^&*()-_=+[]{};:,.?/~'};
    const AMBIGUOUS = 'Il1O0o';
    function randomInt(max) {
      const limit = Math.floor(2 ** 32 / max) * max, b = new Uint32Array(1);
      for (;;) { crypto.getRandomValues(b); if (b[0] < limit) return b[0] % max }
    }
    const sets = o => ['lower', 'upper', 'digits', 'symbols'].filter(k => o[k]).map(k => o.avoid ? [...SETS[k]].filter(c => !AMBIGUOUS.includes(c)).join('') : SETS[k]);
    function password(o) {
      const S = sets(o), pool = S.join('');
      for (let a = 0; a < 10000; a++) { let p = ''; for (let i = 0; i < o.length; i++) p += pool[randomInt(pool.length)]; if (S.every(s => [...p].some(c => s.includes(c)))) return p }
      return '';
    }
    function passphrase(o, list) {
      const parts = []; for (let i = 0; i < o.words; i++) { const w = list[randomInt(list.length)]; parts.push(o.caps ? w[0].toUpperCase() + w.slice(1) : w) }
      if (o.number) parts[randomInt(parts.length)] += String(randomInt(10));
      return parts.join(o.sep);
    }
    const pwBits = o => { const n = sets(o).join('').length; return n > 1 ? o.length * Math.log2(n) : 0 };
    const ppBits = (o, size) => o.words * Math.log2(size) + (o.number ? Math.log2(10) + Math.log2(o.words) : 0);
    const label = b => b >= 80 ? 'Very strong' : b >= 64 ? 'Strong' : b >= 50 ? 'Fair' : b >= 36 ? 'Weak' : 'Very weak';
    return {password, passphrase, pwBits, ppBits, label, randomInt};
  })();

  /* the EFF Large Wordlist (7,776 words), loaded the first time a passphrase is asked for */
  let wordlist = null;
  const SRC = document.currentScript && document.currentScript.src;
  function loadWords() {
    if (wordlist) return wordlist;
    wordlist = new Promise((res, rej) => {
      if (window.PHWordlist) { res(window.PHWordlist); return }
      const s = document.createElement('script'); s.src = (SRC || 'assets/js/pass-lab.js').replace(/pass-lab\.js.*$/, 'eff-wordlist.js');
      s.onload = () => window.PHWordlist ? res(window.PHWordlist) : rej(new Error('no list')); s.onerror = () => { wordlist = null; rej(new Error('offline')) };
      document.head.appendChild(s);
    });
    return wordlist;
  }

  /* ---------- verification codes (RFC 6238) ---------- */
  const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  function base32(s) {
    let bits = '', out = []; for (const c of s.replace(/[\s=]/g, '').toUpperCase()) { const v = B32.indexOf(c); if (v < 0) continue; bits += v.toString(2).padStart(5, '0') }
    for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2)); return new Uint8Array(out);
  }
  async function totp(secret, now = Date.now(), step = 30, digits = 6) {
    const ctr = Math.floor(now / 1000 / step), msg = new ArrayBuffer(8), v = new DataView(msg);
    v.setUint32(0, Math.floor(ctr / 2 ** 32)); v.setUint32(4, ctr >>> 0);
    const key = await crypto.subtle.importKey('raw', secret, {name: 'HMAC', hash: 'SHA-1'}, false, ['sign']);
    const h = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg)), o = h[h.length - 1] & 15;
    const code = (((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 10 ** digits;
    return String(code).padStart(digits, '0');
  }

  /* ---------- the vault's crypto: PBKDF2-HMAC-SHA256 600,000 -> AES-256-GCM ---------- */
  const ITER = 600000, enc = new TextEncoder(), dec = new TextDecoder();
  async function deriveKey(pw, salt) {
    const base = await crypto.subtle.importKey('raw', enc.encode(pw.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256'}, base, {name: 'AES-GCM', length: 256}, false, ['encrypt', 'decrypt']);
  }
  const b64 = u => btoa(String.fromCharCode(...u));

  /* ---------- the page ---------- */
  const GLYPHS = '0123456789ABCDEF';
  let P = null;   // the page's parts, once attached

  function attach(page, host) {
    if (P) return;
    const $ = s => page.querySelector(s), $$ = s => [...page.querySelectorAll(s)];
    const reduce = () => host.reduce || matchMedia('(prefers-reduced-motion: reduce)').matches;
    const OUT = 'cubic-bezier(.16,1,.3,1)', SPRING = 'linear(0,0.009,0.035 2.1%,0.141,0.281 6.7%,0.723 12.9%,0.938 16.7%,1.017,1.077,1.121,1.149 24.3%,1.159,1.163,1.161,1.154 29.9%,1.129 32.8%,1.051 39.6%,1.017 43.1%,0.991,0.977 51%,0.974 53.8%,0.975 57.1%,0.997 69.8%,1.003 76.9%,1)';
    const fmt = n => n.toLocaleString('en-US');
    P = {page, host, timers: new Set(), state: {pw: '', est: null, hash: '', breach: {status: 'idle'}}};
    const st = P.state;

    /* text that "decodes": every character spins through hex digits and settles, left to right */
    function decode(el, text, {ms = 620, html} = {}) {
      if (el._dec) cancelAnimationFrame(el._dec);
      if (reduce() || !text) { if (html) el.innerHTML = html; else el.textContent = text; return }
      const chars = [...text], t0 = performance.now();
      const step = t => {
        const k = Math.min(1, (t - t0) / ms); let s = '';
        chars.forEach((c, i) => { const at = (i / chars.length) * .7; s += k >= at + .3 || c === ' ' ? c : GLYPHS[Math.random() * 16 | 0] });
        el.textContent = s;
        if (k < 1) el._dec = requestAnimationFrame(step); else { el._dec = 0; if (html) el.innerHTML = html }
      };
      el._dec = requestAnimationFrame(step);
    }
    const swap = (el, text) => { if (el.textContent === text) return; el.textContent = text;
      if (!reduce()) el.animate([{opacity: 0, translate: '0 6px'}, {opacity: 1, translate: '0 0'}], {duration: 360, easing: OUT}) };

    /* ---- the checker ---- */
    const input = $('#ps-in'), field = $('.ps-field'), meter = $('#ps-meter'), segs = [...meter.children], verdict = $('#ps-verdict');
    const vt = verdict.querySelector('b'), vd = verdict.querySelector('span'), eye = $('.ps-eye'), clr = $('.ps-x');
    const checks = {len: $('[data-c=len]'), guess: $('[data-c=guess]'), breach: $('[data-c=breach]')};
    const times = {slow: $('#ps-t-slow'), fast: $('#ps-t-fast'), online: $('#ps-t-online'), throttled: $('#ps-t-throttled')};
    const tokens = $('#ps-tokens'), tips = $('#ps-tips'), details = $('.ps-grid'), hero = $('.ps-hero');
    function setCheck(el, s, text) { if (el.dataset.s !== s) { el.dataset.s = s; if (!reduce() && (s === 'ok' || s === 'bad')) el.querySelector('i').animate([{scale: .4}, {scale: 1}], {duration: 520, easing: SPRING}) }
      const t = el.querySelector('span'); if (text && t.textContent !== text) t.textContent = text }
    function render() {
      const pw = st.pw, e = st.est, n = Array.from(pw).length, b = st.breach;
      clr.hidden = !pw; field.classList.toggle('has', !!pw); details.classList.toggle('on', !!pw);
      const breached = b.status === 'breached' && b.for === pw;
      const level = !pw ? -1 : breached ? 'x' : e.score;
      hero.dataset.level = level; meter.setAttribute('aria-valuenow', pw ? (breached ? 0 : e.score) : 0);
      segs.forEach((s, i) => s.classList.toggle('on', level === 'x' || (level >= 0 && i <= level)));
      if (!pw) { swap(vt, 'Nothing to check yet'); swap(vd, 'Type a password, or try one of these.'); }
      else if (breached) { swap(vt, 'Found in data breaches'); swap(vd, `Seen ${fmt(b.count)} times. Attackers try these first, so don’t use it.`) }
      else { swap(vt, e.label); swap(vd, e.warning || `About ${e.crack.slow} to crack offline.`.replace('About less', 'Less').replace('About centuries', 'Centuries')) }
      setCheck(checks.len, !pw ? '' : n >= 15 ? 'ok' : 'bad', !pw || n >= 15 ? 'At least 15 characters' : `At least 15 characters (${15 - n} to go)`);
      setCheck(checks.guess, !pw ? '' : e.score >= 3 ? 'ok' : 'bad');
      const bs = b.for === pw ? b.status : 'idle';
      setCheck(checks.breach, !pw ? '' : bs === 'clean' ? 'ok' : bs === 'breached' ? 'bad' : bs === 'checking' ? 'wait' : '',
        bs === 'clean' ? 'Not found in known breaches' : bs === 'breached' ? `Found in breaches ${fmt(b.count)} times` : bs === 'checking' ? 'Checking known breaches…' : bs === 'error' ? 'Couldn’t reach Have I Been Pwned' : 'Not in known breaches (not checked yet)');
      checks.breach.querySelector('button').hidden = !pw || bs === 'clean' || bs === 'breached' || bs === 'checking';
      if (pw) { for (const k in times) times[k].textContent = e.crack[k];
        tokens.replaceChildren(...(e.matches.length ? e.matches.map(m => { const r = document.createElement('div'); r.className = 'ps-tok';
          const t = document.createElement('code'); t.className = 'ps-mask'; t.tabIndex = 0;   // hidden like the password: hover or focus fades the dots into the word
          t.setAttribute('aria-label', 'Hidden part of your password; focus to show it');
          const dots = document.createElement('span'); dots.className = 'ps-dots'; dots.setAttribute('aria-hidden', 'true'); dots.textContent = '•'.repeat(Math.min(12, Array.from(m.token).length));
          const word = document.createElement('span'); word.className = 'ps-word'; word.textContent = m.token; t.append(dots, word); const w = document.createElement('span'); w.textContent = m.what; r.append(t, w); return r })
          : [Object.assign(document.createElement('p'), {className: 'ps-none', textContent: 'No common words or patterns found.'})]));
        tips.textContent = e.suggestions.join(' ') + (e.truncated ? ' Only the first 64 characters were checked.' : '') }
      else { for (const k in times) times[k].textContent = ''; tokens.replaceChildren(); tips.textContent = '' }   // nothing of an old password stays behind
      renderLeak();
    }
    let hashSeq = 0;
    function update() {
      st.pw = input.value; st.est = st.pw ? EST.estimate(st.pw) : null;
      if (st.breach.for !== st.pw && st.breach.status !== 'checking') st.breach = {status: 'idle'};
      const my = ++hashSeq;
      if (st.pw) sha1(st.pw).then(h => { if (my === hashSeq) { st.hash = h; renderLeak() } }).catch(() => {}); else st.hash = '';
      render();
    }
    input.addEventListener('input', update);
    clr.addEventListener('click', () => { input.value = ''; update(); input.focus() });
    eye.addEventListener('click', () => { const show = input.type === 'password'; input.type = show ? 'text' : 'password'; eye.classList.toggle('on', show);
      eye.setAttribute('aria-label', show ? 'Hide password' : 'Show password'); input.focus() });
    /* the examples type themselves in, so the meter can be seen climbing */
    let typing = 0;
    function typeIn(text) {
      clearTimeout(typing); input.type = 'text'; eye.classList.add('on'); eye.setAttribute('aria-label', 'Hide password');
      if (reduce()) { input.value = text; update(); return }
      const chars = [...text]; let i = 0; input.value = '';
      const tick = () => { input.value += chars[i++] || ''; update(); if (i < chars.length) typing = setTimeout(tick, Math.max(18, 340 / chars.length)) };
      tick();
    }
    $$('[data-try]').forEach(b => b.addEventListener('click', () => typeIn(b.dataset.try === 'gen' ? GEN.password({length: 20, lower: 1, upper: 1, digits: 1, symbols: 1}) : b.dataset.try)));
    checks.breach.querySelector('button').addEventListener('click', () => { leakBox.scrollIntoView({behavior: reduce() ? 'auto' : 'smooth', block: 'center'}); setTimeout(runLeak, reduce() ? 0 : 450) });

    /* ---- the leak check: k-anonymity, shown ---- */
    const leakBox = $('.ps-anon'), h5 = $('#ps-h5'), h35 = $('#ps-h35'), lbtn = $('#ps-leak-go'), lres = $('#ps-leak-res'), lnote = $('#ps-leak-n');
    const nodeA = $('.ps-node.a'), nodeB = $('.ps-node.b'), lane = $('.ps-lane');
    function renderLeak() {
      const has = !!(st.pw && st.hash), b = st.breach;
      leakBox.classList.toggle('has', has);
      if (!has) { h5.textContent = '·····'; h35.textContent = '·'.repeat(35); lbtn.disabled = true; lres.className = 'ps-res'; lres.textContent = 'Type a password at the top first.'; return }
      if (h5.textContent !== st.hash.slice(0, 5)) { h5.textContent = st.hash.slice(0, 5); h35.textContent = st.hash.slice(5) }
      lbtn.disabled = b.status === 'checking';
      if (b.for !== st.pw || b.status === 'idle') { lres.className = 'ps-res'; lres.textContent = 'Only the 5 characters on the left would be sent.' }
    }
    const pause = ms => new Promise(r => setTimeout(r, reduce() ? 0 : ms));
    async function runLeak() {
      if (!st.pw || st.breach.status === 'checking') return;
      const pw = st.pw, hash = st.hash || await sha1(pw); st.hash = hash;
      st.breach = {status: 'checking', for: pw}; render();
      lres.className = 'ps-res wait'; lres.textContent = `Asking for every leaked hash that starts with ${hash.slice(0, 5)}…`;
      const flight = sendPacket(hash.slice(0, 5));
      let body = null, err = null;
      try { [body] = await Promise.all([HIBP.range(hash.slice(0, 5)), flight]) } catch (e) { err = e; await flight }
      if (st.pw !== pw) { st.breach = {status: 'idle'}; render(); return }
      if (err) { st.breach = {status: 'error', for: pw}; lres.className = 'ps-res bad'; lres.textContent = 'Couldn’t reach Have I Been Pwned. Are you offline?'; nodeB.classList.remove('busy'); render(); return }
      const n = HIBP.lines(body), count = HIBP.count(body, hash.slice(5));
      await receive(n);
      if (st.pw !== pw) { st.breach = {status: 'idle'}; render(); return }
      st.breach = {status: count ? 'breached' : 'clean', count, for: pw};
      lres.className = 'ps-res ' + (count ? 'bad' : 'ok');
      lres.textContent = count ? `Found ${fmt(count)} times in known breaches. Don’t use this password.` : `Not in any known breach. ${fmt(n)} hashes came back and none matched.`;
      if (!reduce()) { lres.animate([{opacity: 0, scale: .96}, {opacity: 1, scale: 1}], {duration: 520, easing: SPRING}); if (count) leakBox.animate([{translate: '0 0'}, {translate: '-6px 0'}, {translate: '5px 0'}, {translate: '-3px 0'}, {translate: '0 0'}], {duration: 420}) }
      render();
    }
    /* the prefix lifts off the hash and travels to Have I Been Pwned; the answer comes back as a stream of hashes */
    function geo() { const r = lane.getBoundingClientRect(), a = nodeA.getBoundingClientRect(), b = nodeB.getBoundingClientRect();
      const g = {ax: a.left + a.width / 2 - r.left, ay: a.top + a.height / 2 - r.top, bx: b.left + b.width / 2 - r.left, by: b.top + b.height / 2 - r.top};
      g.v = Math.abs(g.by - g.ay) > Math.abs(g.bx - g.ax); return g }   // on a phone the trip runs down the page
    async function sendPacket(prefix) {
      if (reduce()) return;
      const g = geo(), p = document.createElement('b'); p.className = 'ps-pkt'; p.textContent = prefix; lane.appendChild(p);
      h5.animate([{scale: 1}, {scale: 1.12}, {scale: 1}], {duration: 420, easing: SPRING});
      const a = p.animate([{transform: `translate(${g.ax}px,${g.ay}px) translate(-50%,-50%) scale(.6)`, opacity: 0}, {transform: `translate(${g.ax}px,${g.ay}px) translate(-50%,-50%) scale(1)`, opacity: 1, offset: .18},
        {transform: `translate(${g.bx}px,${g.by}px) translate(-50%,-50%) scale(1)`, opacity: 1, offset: .9}, {transform: `translate(${g.bx}px,${g.by}px) translate(-50%,-50%) scale(.4)`, opacity: 0}],
        {duration: 1100, easing: 'cubic-bezier(.45,0,.2,1)', fill: 'forwards'});
      await a.finished.catch(() => {}); p.remove(); nodeB.classList.add('busy');
    }
    async function receive(n) {
      nodeB.classList.remove('busy'); lnote.textContent = '';
      if (reduce()) { lnote.textContent = `${fmt(n)} hashes back`; return }
      const g = geo(), K = 14, all = [];
      for (let i = 0; i < K; i++) { const d = document.createElement('i'); d.className = 'ps-back'; lane.appendChild(d);
        const j = (Math.random() - .5) * 16, from = `translate(${g.bx + (g.v ? j : 0)}px,${g.by + (g.v ? 0 : j)}px) translate(-50%,-50%)`, to = `translate(${g.ax + (g.v ? j : 0)}px,${g.ay + (g.v ? 0 : j)}px) translate(-50%,-50%)`;
        all.push(d.animate([{transform: from, opacity: 0}, {opacity: 1, offset: .2}, {opacity: 1, offset: .8}, {transform: to, opacity: 0}], {duration: 760, delay: i * 55, easing: 'cubic-bezier(.3,0,.3,1)', fill: 'both'}).finished.then(() => d.remove(), () => d.remove())) }
      const t0 = performance.now(), D = 1400;
      (function count() { const k = Math.min(1, (performance.now() - t0) / D); lnote.textContent = `${fmt(Math.round(n * (1 - Math.pow(1 - k, 3))))} hashes back`; if (k < 1 && P) requestAnimationFrame(count) })();
      await Promise.all(all); await pause(150);
      h35.animate([{background: 'rgba(255,255,255,.14)'}, {background: 'rgba(255,255,255,0)'}], {duration: 700});
    }
    lbtn.addEventListener('click', runLeak);

    /* ---- the generator ---- */
    const gen = {mode: 'pw', pw: {length: 20, lower: true, upper: true, digits: true, symbols: true, avoid: false}, pp: {words: 5, sep: '-', caps: true, number: true}};
    const out = $('#ps-out'), bits = $('#ps-bits'), blab = $('#ps-blab'), len = $('#ps-len'), lenv = $('#ps-lenv'), wds = $('#ps-words'), wdsv = $('#ps-wordsv');
    const seg = $('.ps-seg'), segPill = seg.querySelector('.ps-seg-pill'), segBtns = [...seg.querySelectorAll('button')];
    let lastGen = '';
    const colour = s => [...s].map(c => /\d/.test(c) ? `<span class="d">${c}</span>` : /[^A-Za-z0-9\s]/.test(c) ? `<span class="y">${c.replace(/[&<>]/g, x => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'}[x]))}</span>` : c).join('');
    async function generate() {
      let s = '', b = 0;
      if (gen.mode === 'pw') { s = GEN.password(gen.pw); b = GEN.pwBits(gen.pw) }
      else { out.classList.add('wait'); try { const list = await loadWords(); s = GEN.passphrase(gen.pp, list); b = GEN.ppBits(gen.pp, list.length) } catch (e) { s = ''; out.textContent = 'Couldn’t load the word list.' } out.classList.remove('wait') }
      if (!s) return; lastGen = s;
      decode(out, s, {html: colour(s), ms: Math.min(900, 380 + s.length * 14)});
      bits.textContent = Math.round(b); blab.textContent = GEN.label(b); blab.dataset.l = GEN.label(b);
    }
    function setMode(m) {
      gen.mode = m; page.querySelector('.ps-gen').dataset.mode = m;
      segBtns.forEach(b => { const on = b.dataset.m === m; b.classList.toggle('on', on); b.setAttribute('aria-selected', on) });
      placeSeg(); generate();
    }
    function placeSeg() { const b = segBtns.find(x => x.classList.contains('on')); if (!b || !b.offsetWidth) return;
      segPill.style.width = b.offsetWidth + 'px'; segPill.style.transform = `translateX(${b.offsetLeft}px)` }
    segBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.m)));
    len.addEventListener('input', () => { gen.pw.length = +len.value; lenv.textContent = len.value; generate() });
    wds.addEventListener('input', () => { gen.pp.words = +wds.value; wdsv.textContent = wds.value; generate() });
    $$('[data-opt]').forEach(c => c.addEventListener('click', () => {
      const [g, k] = c.dataset.opt.split('.'), o = gen[g];
      if (k === 'sep') { const S = ['-', ' ', '.', '_']; o.sep = S[(S.indexOf(o.sep) + 1) % S.length]; c.querySelector('b').textContent = o.sep === ' ' ? 'space' : o.sep }
      else { if (g === 'pw' && ['lower', 'upper', 'digits', 'symbols'].includes(k) && o[k] && ['lower', 'upper', 'digits', 'symbols'].filter(x => o[x]).length === 1) { c.animate([{translate: '0 0'}, {translate: '-4px 0'}, {translate: '4px 0'}, {translate: '0 0'}], {duration: 300}); return }
        o[k] = !o[k]; c.classList.toggle('on', o[k]); c.setAttribute('aria-pressed', o[k]) }
      generate();
    }));
    $('#ps-regen').addEventListener('click', () => { generate(); const i = $('#ps-regen svg'); if (i && !reduce()) i.animate([{rotate: '0deg'}, {rotate: '360deg'}], {duration: 700, easing: SPRING}) });
    $('#ps-copy').addEventListener('click', async () => { if (!lastGen) return; try { await navigator.clipboard.writeText(lastGen); host.toast('Copied') } catch (e) { host.toast('Couldn’t copy here') } });
    $('#ps-use').addEventListener('click', () => { if (!lastGen) return; input.value = lastGen; input.type = 'text'; eye.classList.add('on'); update();
      page.scrollTo({top: 0, behavior: reduce() ? 'auto' : 'smooth'}); if (!reduce()) field.animate([{scale: 1}, {scale: 1.025}, {scale: 1}], {duration: 600, delay: 350, easing: SPRING}) });

    /* ---- the vault ---- */
    const vNote = $('#ps-v-note'), vPw = $('#ps-v-pw'), vLock = $('#ps-v-lock'), vOut = $('#ps-v-out'), vSalt = $('#ps-v-salt'), vIv = $('#ps-v-iv'), vCt = $('#ps-v-ct'),
      vTime = $('#ps-v-time'), vUpw = $('#ps-v-upw'), vOpen = $('#ps-v-open'), vRes = $('#ps-v-res'), vSteps = $$('.ps-step'), vault = $('.ps-vault');
    let box = null, vBusy = false, vEpoch = 0;   // vEpoch: bumped by a reset, so an unfinished lock or unlock can't write anything back
    const stepOn = (i, s) => vSteps.forEach((el, k) => { el.classList.toggle('on', k === i && s === 'on'); el.classList.toggle('done', k < i || (k === i && s === 'done')) });
    vLock.addEventListener('click', async () => {
      if (vBusy) return; const note = vNote.value.trim(), pw = vPw.value;
      if (!note || !pw) { (note ? vPw : vNote).focus(); (note ? vPw : vNote).parentNode.animate([{translate: '0 0'}, {translate: '-5px 0'}, {translate: '5px 0'}, {translate: '0 0'}], {duration: 320}); return }
      const my = vEpoch; vBusy = true; vLock.disabled = true; vault.classList.add('busy'); vault.classList.remove('locked', 'open'); vRes.textContent = ''; vRes.className = 'ps-vres';
      const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
      stepOn(0, 'on'); await pause(260); if (my !== vEpoch) return; stepOn(1, 'on');
      const t0 = performance.now(), key = await deriveKey(pw, salt), dt = performance.now() - t0;
      if (my !== vEpoch) return;
      stepOn(2, 'on'); await pause(260);
      const ct = new Uint8Array(await crypto.subtle.encrypt({name: 'AES-GCM', iv}, key, enc.encode(note)));
      if (my !== vEpoch) return;
      stepOn(3, 'done');
      box = {salt, iv, ct}; vPw.value = '';
      vTime.textContent = `600,000 rounds took ${dt < 1000 ? Math.round(dt) + ' ms' : (dt / 1000).toFixed(1) + ' s'} here. That is your device’s speed, not a benchmark; the point is that every guess costs an attacker all 600,000 rounds too.`;
      vault.classList.remove('busy'); vault.classList.add('locked');
      decode(vSalt, hexOf(salt)); decode(vIv, hexOf(iv)); decode(vCt, b64(ct), {ms: 900});
      vBusy = false; vLock.disabled = false; vUpw.value = '';
    });
    vOpen.addEventListener('click', async () => {
      if (!box || vBusy) return; vBusy = true; vOpen.disabled = true; vRes.className = 'ps-vres wait'; vRes.textContent = 'Deriving the key again…';
      const my = vEpoch, b0 = box;
      try { const key = await deriveKey(vUpw.value, b0.salt), pt = dec.decode(await crypto.subtle.decrypt({name: 'AES-GCM', iv: b0.iv}, key, b0.ct));
        if (my !== vEpoch) return;
        vRes.className = 'ps-vres ok'; decode(vRes, pt); vault.classList.add('open') }
      catch (e) { if (my !== vEpoch) return; vRes.className = 'ps-vres bad'; vRes.textContent = 'Wrong password: the GCM tag doesn’t match, so not one byte decrypts.';
        if (!reduce()) vUpw.parentNode.animate([{translate: '0 0'}, {translate: '-6px 0'}, {translate: '6px 0'}, {translate: '-3px 0'}, {translate: '0 0'}], {duration: 380}) }
      vBusy = false; vOpen.disabled = false;
    });
    [vNote, vPw].forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') vLock.click() }));
    vUpw.addEventListener('keydown', e => { if (e.key === 'Enter') vOpen.click() });

    /* ---- verification codes ---- */
    const SECRET = base32('JBSWY3DPEHPK3PXP'), codeEl = $('#ps-code'), ring = $('.ps-ring'), sweep = ring.querySelector('.ps-sweep');
    let codeT = 0, codeOn = false, lastCode = '';
    function showCode(c) {
      const spans = [...codeEl.querySelectorAll('span')];
      [...c].forEach((d, i) => { const s = spans[i]; if (s.textContent === d) return;
        if (reduce() || !lastCode) { s.textContent = d; return }
        s.animate([{translate: '0 0', opacity: 1}, {translate: '0 -60%', opacity: 0}], {duration: 180, delay: i * 40, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards'})
          .finished.then(() => { s.textContent = d; s.getAnimations().forEach(a => a.cancel()); s.animate([{translate: '0 60%', opacity: 0}, {translate: '0 0', opacity: 1}], {duration: 420, easing: SPRING}) }, () => {}) });
      lastCode = c;
    }
    async function tick() {
      clearTimeout(codeT); if (!codeOn) return;
      const now = Date.now(), into = (now / 1000) % 30;
      try { showCode(await totp(SECRET, now)) } catch (e) { codeEl.textContent = '------' }
      sweep.style.animationDelay = `-${into.toFixed(2)}s`; ring.classList.add('run');
      codeT = setTimeout(tick, (30 - into) * 1000 + 30);
    }
    const io = new IntersectionObserver(es => es.forEach(e => { const on = e.isIntersecting && host.active(); if (on && !codeOn) { codeOn = true; tick() } else if (!on && codeOn) { codeOn = false; clearTimeout(codeT); ring.classList.remove('run') } }));
    io.observe(ring);
    P.stopCodes = () => { codeOn = false; clearTimeout(codeT); ring.classList.remove('run') };
    P.recheckCodes = () => { io.unobserve(ring); io.observe(ring) };

    /* ---- the dock: which part of the page is in view, and a way to jump to the others ---- */
    const dock = $('.ps-dock'), pill = dock.querySelector('.ps-dock-pill'), dBtns = [...dock.querySelectorAll('button')], secs = $$('[data-sec]');
    let cur = '';
    function placePill(animate) { const b = dBtns.find(x => x.dataset.to === cur) || dBtns[0]; if (!b.offsetWidth) return;
      if (!animate) pill.style.transition = 'none'; pill.style.width = b.offsetWidth + 'px'; pill.style.transform = `translateX(${b.offsetLeft}px)`;
      if (!animate) { pill.offsetWidth; pill.style.transition = '' } }
    function setCur(k) { if (k === cur) return; cur = k; dBtns.forEach(b => b.classList.toggle('on', b.dataset.to === k)); placePill(true) }
    const sio = new IntersectionObserver(es => { es.forEach(e => { e.target._in = e.isIntersecting }); const v = secs.find(s => s._in); if (v) setCur(v.dataset.sec) },
      {root: page, rootMargin: '-42% 0px -52% 0px'});
    secs.forEach(s => sio.observe(s));
    dBtns.forEach(b => b.addEventListener('click', () => { const s = secs.find(x => x.dataset.sec === b.dataset.to); if (!s) return;
      page.scrollTo({top: b.dataset.to === 'check' ? 0 : s.offsetTop - 70, behavior: reduce() ? 'auto' : 'smooth'}) }));
    $$('[data-pass=back]').forEach(b => b.addEventListener('click', () => host.back()));
    addEventListener('resize', () => { clearTimeout(P.rz); P.rz = setTimeout(() => { placePill(false); placeSeg() }, 150) });

    /* ---- glass that bends what is behind it, as on the island ---- */
    host.glass(field, {tier: 1, sc: 60, blur: 2.5}); host.glass(dock, {tier: 1, sc: 46, blur: 3});
    $$('.ps-card,.ps-anon,.ps-gen,.ps-vault,.ps-totp').forEach(el => host.glass(el, {tier: 0, sc: 44, blur: 3}));

    P.update = update; P.render = render; P.placePill = placePill; P.placeSeg = placeSeg; P.generate = generate; P.setCur = setCur;
    P.clear = () => {
      clearTimeout(typing); input.value = ''; input.type = 'password'; eye.classList.remove('on'); st.breach = {status: 'idle'}; update();
      [vSalt, vIv, vCt, vRes, out].forEach(e => { if (e._dec) { cancelAnimationFrame(e._dec); e._dec = 0 } });   // a decode still running would write its text back
      vEpoch++; vBusy = false; vLock.disabled = false; vOpen.disabled = false;
      vNote.value = ''; vPw.value = ''; vUpw.value = ''; box = null; vault.classList.remove('locked', 'open', 'busy'); vRes.textContent = ''; stepOn(-1);
      [vSalt, vIv, vCt].forEach(e => (e.textContent = '')); vTime.textContent = '';
      lastGen = ''; out.textContent = ''; bits.textContent = '—'; blab.textContent = ''; lres.textContent = ''; lnote.textContent = '';
      cur = ''; setCur('check');
    };
    render(); renderLeak();
  }

  /* the falling hashes behind the page: a few strips of hex digits, each drawn once into a small canvas and moved by the
     compositor (the app's matrix rain, in the page's colour and much quieter) */
  function rain(box, tier) {
    if (box.dataset.built) return; box.dataset.built = '1';
    const dpr = Math.min(2, devicePixelRatio || 1), W = innerWidth, n = Math.max(8, Math.min(26, Math.round(W / 58))) * (tier >= 2 ? .5 : 1) | 0;
    const font = getComputedStyle(document.documentElement).getPropertyValue('--mono') || 'monospace';
    for (let i = 0; i < n; i++) {
      const near = Math.random() < .35, fs = near ? 15 : 12, rows = 20 + (Math.random() * 18 | 0), w = fs + 4, h = rows * fs * 1.25;
      const c = document.createElement('canvas'); c.width = Math.ceil(w * dpr); c.height = Math.ceil(h * dpr);
      const g = c.getContext('2d'); if (!g) continue; g.scale(dpr, dpr); g.font = `${fs}px ${font}`; g.textAlign = 'center';
      for (let r = 0; r < rows; r++) { const k = r / (rows - 1), y = (r + 1) * fs * 1.25 - fs * .25;
        g.fillStyle = r === rows - 1 ? 'rgba(255,236,238,.95)' : `rgba(255,90,106,${(.08 + .62 * Math.pow(k, 1.6)).toFixed(3)})`;
        g.fillText(GLYPHS[Math.random() * 16 | 0], w / 2, y) }
      c.style.cssText = `--x:${((i + Math.random() * .8) / n * 100).toFixed(2)}%;--h:${h.toFixed(0)}px;--w:${w}px;--y0:${(Math.random() * innerHeight - h / 2).toFixed(0)}px;--t:${(near ? 9 : 15) + Math.random() * 9}s;--dl:${(-Math.random() * 20).toFixed(2)}s;--o:${(near ? .34 : .18) + Math.random() * .1}`;
      box.appendChild(c);
    }
  }

  window.PHLAB = {
    attach,
    /* the page is about to be shown: the rain, the dock in place, a password in the generator */
    open(tier) { if (!P) return; rain(P.page.querySelector('.ps-rain'), tier); P.setCur('check'); P.placePill(false); requestAnimationFrame(() => { P.placeSeg(); if (!P.page.querySelector('#ps-out').textContent) P.generate() }) },
    shown(focus) { if (!P) return; P.placePill(false); P.recheckCodes(); if (focus) P.page.querySelector('#ps-in').focus({preventScroll: true}) },
    /* the page was left: nothing typed here stays behind */
    reset() { if (!P) return; P.stopCodes(); P.clear(); P.page.scrollTop = 0 },
    estimate: EST.estimate, sha1, totp, base32, deriveKey,
  };
})();
