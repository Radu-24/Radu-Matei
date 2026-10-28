# CV download counter

A small Cloudflare Worker that counts how many times my CV is downloaded from https://radumatei.ro, and keeps nothing else.

- `GET https://api.radumatei.ro/cv.pdf` serves the CV (fetched from the site itself, `PDF_URL` in `wrangler.toml`) as a download and adds one to the total.
- `GET https://api.radumatei.ro/cv-count` answers `{"downloads": 42}`. The CV page asks for it when it is opened, shows it under the Download PDF button, and from then on downloads through `/cv.pdf`. If the counter can't be reached, the page hides the line and the button downloads the site's own copy, so the site never depends on this Worker.

## What it stores, and what it doesn't

- **One number**, in a single SQLite-backed Durable Object, so two downloads at the same moment can't overwrite each other.
- **Nothing about visitors:** no IP addresses, no user agents, no cookies, no timestamps, and nothing written to the visitor's device. The Worker's logs are switched off (`[observability] enabled = false`), and the code never logs anything. The site sends both requests without cookies or a referrer.
- It can't tell two downloads by the same person apart, on purpose: that would need an identifier. Requests that look automatic are served but not counted: crawlers, link previews, prefetches, scripts such as `curl`, headless browsers, `HEAD` requests and reads that start in the middle of the file. So the total roughly counts downloads by people.
- Only `https://radumatei.ro`, `https://www.radumatei.ro` and `http://localhost` pages may read the total from a browser (CORS).

The privacy notice on the site has a section about it ("Counting CV downloads"). Change that section if this Worker ever does more.

## Set it up (once)

You need Node.js 22 or newer (`node -v`). On Parrot or Debian:

```
sudo apt install nodejs npm      # if node is missing or older than 22, use https://nodejs.org or nvm instead
```

Then, from the repository:

```
cd workers/cv-counter
npm install                      # installs wrangler (pinned in package.json)
npx wrangler telemetry disable   # optional: wrangler sends Cloudflare anonymous usage data by default
npx wrangler login               # opens Cloudflare in the browser; allow access
npx wrangler deploy              # uploads the Worker and creates api.radumatei.ro
```

`wrangler deploy` creates the `api.radumatei.ro` address in the radumatei.ro zone on its own (a Workers custom domain, with its DNS record and certificate). There must be no other DNS record called `api` already (Cloudflare refuses a custom domain on a hostname that has a CNAME). The main site's records stay as they are. It can take a few minutes for the certificate to be ready.

Check it:

```
curl https://api.radumatei.ro/cv-count            # {"downloads":0}
curl -I https://api.radumatei.ro/cv.pdf           # 200, application/pdf (curl is not counted)
```

Then open the CV page on the site: the line under the button appears.

## Day to day

- **New CV:** replace `site/assets/doc/Radu-Matei-CV.pdf` and push. The Worker serves whatever the site has (it caches the file for at most 5 minutes). The count stays.
- **Change the Worker:** edit `src/index.js`, then `npx wrangler deploy`. Pushing to GitHub does not deploy it; only the site is deployed by the GitHub Actions workflow.
- **Try it locally:** `npm run dev -- --var PDF_URL:http://localhost:8000/assets/doc/Radu-Matei-CV.pdf` while the site runs on port 8000 (`python3 -m http.server 8000 --directory site` from the repository). The local counter starts at 0 and is separate from the real one.
- **Reset the count:** in `src/index.js`, change `idFromName("cv")` to a new name (for example `"cv-2027"`) and deploy. The new name starts at 0; the old total stays stored but is no longer used.

## Cost and limits

Free. The Workers Free plan allows 100,000 requests a day, and Durable Objects on the Free plan allow 100,000 requests a day with 5 GB of SQLite storage ([Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)). One page view of the CV page is one request; one download is two (the file and the refreshed total). If a limit is ever reached, the counter stops answering for the rest of the day, and the site falls back to its own copy of the PDF.

Anyone can inflate the number by downloading the file over and over; the counter has no way to stop that without identifying people. If it ever matters, a Cloudflare rate-limiting rule on `api.radumatei.ro/cv.pdf` can cap it (that happens at Cloudflare, not in this code).
