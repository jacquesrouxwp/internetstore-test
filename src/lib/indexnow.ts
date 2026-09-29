/**
 * IndexNow — push URLs straight into Bing, Yandex, Seznam and Naver.
 *
 * Measured 2026-09-29: the shop is absent from Bing (site: and exact-domain
 * searches return nothing, DuckDuckGo likewise), while ChatGPT already sends
 * traffic to /vykup. Bing's index feeds Copilot, DuckDuckGo, Ecosia, Yahoo and
 * part of what the answer engines cite, so being missing there costs far more
 * than Google alone.
 *
 * IndexNow needs no webmaster account: ownership is proven by hosting the key
 * at https://<host>/<key>.txt, which is in public/.
 */

const ENDPOINT = "https://api.indexnow.org/IndexNow";

/** Also served as public/${INDEXNOW_KEY}.txt — keep the two in step. */
export const INDEXNOW_KEY = "49017b64a8779209c006511743c08f0f";

export interface IndexNowResult {
  ok: boolean;
  status: number;
  submitted: number;
  /** What the endpoint said, when it said anything. */
  body?: string;
}

/** One batch. IndexNow accepts up to 10 000 URLs per request. */
export async function submitToIndexNow(
  urls: string[],
  siteUrl: string,
): Promise<IndexNowResult> {
  const host = new URL(siteUrl).host;
  const urlList = urls.filter((u) => u.startsWith(`https://${host}`)).slice(0, 10_000);
  if (!urlList.length) return { ok: true, status: 0, submitted: 0 };

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host,
      key: INDEXNOW_KEY,
      keyLocation: `https://${host}/${INDEXNOW_KEY}.txt`,
      urlList,
    }),
  });

  let body: string | undefined;
  try {
    body = (await res.text()).slice(0, 500);
  } catch {
    /* an empty 200 is the normal happy path */
  }

  return { ok: res.ok, status: res.status, submitted: urlList.length, body };
}
