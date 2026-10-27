# Radu Matei

My personal website: who I am, what I have built, my thesis robot, the DataLink Rover, which you can take apart in 3D, and Password Helper, whose checker you can try right on its page.

![The home page](docs/home.jpg)

## What it is

- One page with seven sections: Home, Projects, DataLink Rover, Password Helper, Record, About and Contact. The menu is a glass prism at the top of the screen. The two project pages open from their entries on Projects.
- Plain HTML, CSS and JavaScript. There is no framework and no build step for the site itself.
- The light in the background is drawn by `light.js` in a Web Worker, so it stays smooth while the page is busy. Browsers without workers or OffscreenCanvas draw it on the main thread instead.
- The rover and its controller are real 3D models (three.js). The rover is built part by part to real dimensions, and the controller comes from its CAD file. The page loads light versions first. On devices that can handle more, it swaps in detailed versions, and it switches back if the frame rate drops.
- Every page has a moving background of soft light (`.abg` in `index.html`), except a project's own page, which has a background made for it. Pools in the page's colour drift behind the content, plus one motion per page. Home has a band of spectrum, Projects has a beam of light scanning a dot grid, Record has rays, About has aurora ribbons and Contact has signal rings. The shapes are small canvases that the graphics card stretches and moves, so the page does no work while they animate. Weaker devices keep the still background.
- The first time the page loads, the name fades in on black and glides into place, then the page comes in piece by piece. It plays on every page load and stores nothing.
- The look follows the time of year (see below).

## The Password Helper page

[Password Helper](https://github.com/Radu-24/Password-Helper) is my desktop password manager. Its page opens from Projects: the title glides off the list, and the card's little password field grows into the page's own. The parts of the app work right on the page (`site/assets/js/pass-lab.js`):

- **The checker.** A strength estimate as you type, with a meter, the three checks the app uses (from NIST SP 800-63B-4: at least 15 characters, hard to guess, not in known breaches), the time to crack for four kinds of attack, and the patterns an attacker would try first. Those patterns are parts of the password, so they show as dots; hovering over one (or focusing it) fades the dots into the word. The app uses zxcvbn-ts with full English and Romanian dictionaries (about 8 MB). The page uses the same method with small built-in word lists, so its scores are close to the app's but not identical.
- **The leak check.** It shows k-anonymity at work. The page hashes the password with SHA-1, sends only the first 5 of its 40 characters to [Have I Been Pwned](https://haveibeenpwned.com/Passwords), and compares the answer on the page. It runs only when the visitor presses the button. It asks for a padded answer (`Add-Padding`); if a browser won't send that header, it asks without it.
- **The generator.** Passwords and passphrases, with the same rules as the app: the browser's secure random generator, with rejection sampling so no character is likelier than another. Passphrases use the EFF Large Wordlist (`site/assets/js/eff-wordlist.js`), which loads only when a passphrase is asked for.
- **The vault.** A visitor can lock a note of their own with the vault's real steps (PBKDF2-SHA256 with 600,000 rounds, then AES-256-GCM in the browser's Web Crypto), then unlock it again or watch a wrong password fail.
- **Verification codes.** A live TOTP code (RFC 6238) from a public demo key. It matches what any authenticator app shows for that key.
- Then the security model, a few numbers and the app's story, and a glass dock at the bottom that follows the part in view.

Nothing is stored. Everything typed on the page is emptied when the visitor leaves it, including the patterns and results shown for it, and a lock or unlock still running is dropped. The background is the app's matrix rain, redrawn as falling hashes in the page's colour: a few strips drawn once and moved by the graphics card.

## The time of year

The visitor's own calendar picks a theme: an event while one is on, otherwise the season, which shows for about four weeks at its heart. The rest of the year the site has no theme. Each theme dresses the site in three places:

- **The edges of the screen**: pieces in the corners or along the top, over the page.
- **The scene**: pictures in the background of every page, behind the content.
- **The island**: something sits on it or hangs from it. It steps aside when the menu opens, and opening the menu throws a handful of the theme out of the island.

The ambient light also takes on the theme's colour and particles. A project's own page keeps its own look, so none of this shows there. Nothing is stored or sent.

| Theme | When | Edges | Scene | Island | Opening the menu |
|---|---|---|---|---|---|
| New Year | 30 Dec – 2 Jan | gold and silver stars on threads | fireworks | sparkles | a burst of sparks |
| My birthday | 21 – 27 Jan | bunting in the page colours | balloons rising | a party hat | confetti |
| Mărțișor | 1 – 9 March | the red and white cord with a heart | snowdrops | a little mărțișor hanging from it | red and white petals |
| Easter (Orthodox) | the week before Easter Sunday to Easter Monday | painted eggs on ribbons | painted eggs in the grass | bunny ears peeking out | petals and eggs |
| Halloween | 17 Oct – 1 Nov | cobwebs, a spider letting itself down | the moon, bats, jack-o'-lanterns | a spider on a thread | bats |
| Christmas | 1 Dec – 7 Jan | a string of lights | snowy hills and firs | snow and holly | snow |
| Spring | 10 Apr – 7 May | a blossom branch | butterflies | a butterfly, which flies off | petals |
| Summer | 10 Jul – 6 Aug | | a sunset between palm trees | a little palm tree | sparkles |
| Autumn | 18 Sep – 15 Oct | a branch in autumn colours | fallen leaves | a maple leaf, which blows away | leaves |
| Winter | 10 Jan – 6 Feb | icicles | snowy hills and firs | snow and icicles | snow |

The pictures are drawn once and only moved by the graphics card, the same way as the ambient light, and they hold still on the lighter quality tiers and with reduced motion. To preview a theme, add `?season=` to the address with one of `halloween`, `xmas`, `newyear`, `birthday`, `easter`, `martisor`, `spring`, `summer`, `autumn`, `winter` or `none`. The dates and colours are in `SEASON` in `index.html`, and the pictures are in `assets/js/themes.js`.

To give a new page the moving background, add `<div class="abg" data-abg="pools" aria-hidden="true"></div>` right after its `.pbg`. Use `pools` for the pools alone, or `spectrum`, `scan`, `rays`, `waves` or `rings` for one of the motions. The colours come from the page's `--pc`.

![The DataLink Rover in 3D](docs/rover.jpg)

## Folder structure

```
site/                    the website; this folder is what gets published
├── index.html           the page, with its styles and main script
├── 404.html             shown by GitHub Pages for any address that doesn't exist
├── robots.txt           lets search engines in, points them to the sitemap
├── sitemap.xml          the site's address for search engines (radumatei.ro)
├── favicon.ico          tab icon for browsers and crawlers that ask for /favicon.ico
└── assets/
    ├── js/              light.js (background light), datalink-3d.js (3D viewer), pass-lab.js (Password Helper page),
    │                    eff-wordlist.js (its passphrase words), themes.js (time of year), tab-icon.js (animated tab icon)
    ├── models/          packed 3D models and their texture, built by tools/
    ├── vendor/three/    three.js 0.160.0, served from the site
    ├── css/fonts.css    the two fonts, embedded, served from the site
    ├── fonts/           font licences
    └── img/             photos and the tab icons (favicon.svg, favicon-32.png, apple-touch-icon.png)
tools/                   Python build for the 3D models (see tools/README.md)
docs/                    screenshots for this README
.github/workflows/       publishes site/ to GitHub Pages
```

## Run it locally

Open the page through a local web server. Browsers block parts of it (the worker and the 3D textures) when `index.html` is opened straight from disk.

```
cd radu-matei
python3 -m http.server 8000 --directory site
```

Then open http://localhost:8000. On Windows, use `python` instead of `python3`.

## Publish it on GitHub Pages

1. Create an empty repository on GitHub, without a README or licence. If you name it `<your-username>.github.io`, the site is served at `https://<your-username>.github.io/`. With any other name, it is served at `https://<your-username>.github.io/<repo-name>/`.
2. Push this folder:

   ```
   cd radu-matei
   git init -b main
   git add .
   git commit -m "First version of the site"
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```

3. On GitHub, open **Settings → Pages**. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Open the **Actions** tab, choose **Deploy site to GitHub Pages**, and press **Run workflow**. The run started by the first push fails, because Pages was not switched on yet.

From then on, every push to `main` that changes `site/` publishes the site again (`.github/workflows/pages.yml`).

## Your own domain or server later

- **Your own domain on GitHub Pages:** in **Settings → Pages → Custom domain**, enter the domain and save. Then add the DNS records from GitHub's guide, [Managing a custom domain for your GitHub Pages site](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site). With this workflow, no `CNAME` file is needed.
- **Your own server:** the site is static files, so any web server works (nginx, Apache, Caddy). Copy the contents of `site/` into the server's web root.

## The 3D models

The files in `site/assets/models/` are generated by `tools/build_models.py` from my CAD meshes. You only need to run it if you change a model. Setup and details are in [tools/README.md](tools/README.md).

## Secrets

The site contains no passwords, keys or private addresses.

## Privacy

The site sets no cookies, stores nothing on the visitor's device (the menu hint is remembered in memory only, until a reload) and has no analytics or tracking (the browser may still cache the site files as usual). The home page terminal keeps typed commands on screen until a reload. The full privacy notice (controller, hosting, the optional leak check, legal bases, transfers, rights, ANSPDCP) has its own page, opened from the home page footer (it is not in the menu; such pages are listed in `EXTRA` in `index.html`). Fonts and three.js are part of the site, so a visitor's browser
contacts only the host. The one exception is the leak check on the Password Helper page. When a visitor presses its button, the first 5
characters of the password's SHA-1 hash go to Have I Been Pwned (`api.pwnedpasswords.com`, served through Cloudflare), which sees that
request like any website would. The password itself never leaves the page. GitHub Pages keeps its own server logs, including IP
addresses. The Privacy page says the same.

A static site cannot keep a secret. Every visitor downloads everything in `site/`, so never put a key or password there. If the tools ever need one, put it in a `.env` file. `.gitignore` keeps `.env` files and the Python `.venv` folder out of the repository.

## Credits

- [three.js](https://threejs.org/) 0.160.0 (MIT licence), in `site/assets/vendor/three/` (licence included).
- Instrument Sans and IBM Plex Mono (SIL Open Font License), embedded in `site/assets/css/fonts.css` (licences in `site/assets/fonts/`).
- DejaVu Sans for the labels painted into the 3D textures, in `tools/fonts/` (licence included).
- The [EFF Large Wordlist](https://www.eff.org/dice) for passphrases (CC BY 3.0 US), in `site/assets/js/eff-wordlist.js`.
- The strength estimate follows the method of [zxcvbn](https://github.com/dropbox/zxcvbn) (MIT). Leak checks use the [Pwned Passwords](https://haveibeenpwned.com/Passwords) range API by Have I Been Pwned.

© 2026 Radu Matei. All rights reserved.
