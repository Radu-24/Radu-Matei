/* CV download counter for radumatei.ro, on Cloudflare Workers (api.radumatei.ro).

   GET /cv.pdf    serves the CV (fetched from the site itself) as a download, and adds one to the total
   GET /cv-count  answers {"downloads": <total>} for the CV page

   What it keeps: one number, in a Durable Object. Nothing about the visitor: no IP address, no browser details, no
   cookies, no logs of its own (observability is off in wrangler.toml, and nothing here calls console). Requests that
   look automatic (crawlers, link previews, prefetches, scripts) and partial reads past the start of the file are served
   but not counted, so the total is downloads by people, roughly. It cannot tell two downloads by the same person apart,
   on purpose: that would need an identifier. */
import { DurableObject } from "cloudflare:workers";

/* the pages allowed to read the total from a browser: the site, and a local copy while testing */
const SITE = new Set(["https://radumatei.ro", "https://www.radumatei.ro"]);
const allowed = (o) => !!o && (SITE.has(o) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o));
const NAME = "Radu Matei - CV.pdf";
const AUTO = /bot|crawl|spider|slurp|preview|scan|facebookexternalhit|embedly|headless|lighthouse|curl|wget|python|go-http|java\/|okhttp|axios|node-fetch|libwww|httpclient/i;

/* the total: one Durable Object, so two downloads at the same moment can never overwrite each other */
export class Counter extends DurableObject {
  async read() { return (await this.ctx.storage.get("n")) ?? 0; }
  async add() { const n = ((await this.ctx.storage.get("n")) ?? 0) + 1; await this.ctx.storage.put("n", n); return n; }
}
const total = (env) => env.COUNTER.get(env.COUNTER.idFromName("cv"));

/* a real person's download: a GET from a browser, not a prefetch, from the start of the file */
function byPerson(req) {
  if (req.method !== "GET") return false;
  const ua = req.headers.get("User-Agent") || "";
  if (!ua || AUTO.test(ua)) return false;
  const purpose = (req.headers.get("Sec-Purpose") || "") + (req.headers.get("Purpose") || "");
  if (/prefetch|prerender/i.test(purpose)) return false;
  const range = req.headers.get("Range");
  return !range || /^bytes=0-/.test(range);
}

const cors = (req) => { const o = req.headers.get("Origin"); return allowed(o) ? { "Access-Control-Allow-Origin": o, "Vary": "Origin" } : { "Vary": "Origin" }; };
const plain = (text, status) => new Response(text, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

export default {
  async fetch(req, env, ctx) {
    const { pathname } = new URL(req.url);
    const read = req.method === "GET" || req.method === "HEAD";

    if (pathname === "/cv-count" && read) {
      const n = await total(env).read();
      return Response.json({ downloads: n }, { headers: { ...cors(req), "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
    }

    if (pathname === "/cv.pdf" && read) {
      const file = await fetch(env.PDF_URL, { cf: { cacheTtl: 300, cacheEverything: true } }).catch(() => null);
      if (!file || !file.ok) return plain("The CV can't be fetched right now. It is also at https://radumatei.ro/assets/doc/Radu-Matei-CV.pdf", 502);
      if (byPerson(req)) ctx.waitUntil(total(env).add());
      const h = {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${NAME}"; filename*=UTF-8''${encodeURIComponent(NAME)}`,
        "Cache-Control": "no-store",          // every download comes back here, so every one is counted
        "X-Robots-Tag": "noindex",
        "Referrer-Policy": "no-referrer",
      };
      const len = file.headers.get("Content-Length");
      if (len) h["Content-Length"] = len;
      return new Response(req.method === "HEAD" ? null : file.body, { headers: h });
    }

    if (pathname === "/" && read) return plain("CV download counter for https://radumatei.ro. Nothing about visitors is stored.", 200);
    return plain("Not found", 404);
  },
};
