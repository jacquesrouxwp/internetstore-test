const targets = [
  {
    name: "opticstore",
    catalog: "https://opticstore.com.ua/catalog/teplovizory",
  },
  {
    name: "profoptica",
    catalog: "https://profoptica.com.ua/teplovizory/",
  },
  {
    name: "optics-pro",
    catalog: "https://www.optics-pro.com.ua/ua/teplovizori/",
  },
];

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "uk-UA,uk;q=0.9",
};

async function get(url) {
  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(25000),
    redirect: "follow",
  });
  return { status: res.status, html: await res.text(), url: res.url };
}

function allHrefs(html, base) {
  const re = /href=["']([^"']+)["']/gi;
  const out = new Set();
  let m;
  while ((m = re.exec(html))) {
    let h = m[1];
    try {
      h = new URL(h, base).href.split("#")[0];
    } catch {
      continue;
    }
    out.add(h);
  }
  return [...out];
}

function sniff(html) {
  const snippets = [];
  // product card patterns
  for (const re of [
    /data-product-id=["'][^"']+["'][^>]{0,200}/gi,
    /class=["'][^"']*product[^"']*["'][^>]{0,120}/gi,
    /itemtype=["'][^"']*Product["']/gi,
    /"@type"\s*:\s*"Product"/gi,
  ]) {
    const m = html.match(re);
    if (m) snippets.push(`${re}: ${m.slice(0, 3).join(" | ")}`);
  }
  // sample absolute product-looking paths
  const paths = allHrefs(html, "https://example.com");
  return { snippets: snippets.slice(0, 8), hrefCount: paths.length };
}

for (const t of targets) {
  console.log("\n####", t.name, t.catalog);
  const page = await get(t.catalog);
  console.log("status", page.status, "len", page.html.length);

  const hrefs = allHrefs(page.html, t.catalog);
  // filter to same host product pages
  const host = new URL(t.catalog).host.replace(/^www\./, "");
  const same = hrefs.filter((h) => {
    try {
      return new URL(h).host.replace(/^www\./, "") === host;
    } catch {
      return false;
    }
  });

  // score by path depth and keywords
  const scored = same
    .map((h) => {
      const u = new URL(h);
      const parts = u.pathname.split("/").filter(Boolean);
      let score = parts.length;
      if (/product|tovar|goods|item/i.test(u.pathname)) score += 5;
      if (/teploviz|thermal|pulsar|axion|hik|agm|infiray|night|binokl|pricel/i.test(u.pathname))
        score += 2;
      if (/catalog|category|page-|\/page\/|filter|brand|login|cart|checkout|account|blog|news|ua\/?$|ru\/?$/i.test(u.pathname))
        score -= 4;
      return { h, score, parts: parts.length };
    })
    .filter((x) => x.score >= 3 && x.parts >= 2)
    .sort((a, b) => b.score - a.score);

  console.log("top candidate product URLs:");
  const uniq = [];
  for (const s of scored) {
    if (uniq.length >= 10) break;
    if (!uniq.includes(s.h)) {
      uniq.push(s.h);
      console.log(" ", s.score, s.h);
    }
  }

  // Also look for JSON product lists
  const jsonLd = [...page.html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )].map((m) => m[1].trim());
  console.log("json-ld blocks:", jsonLd.length);
  for (const block of jsonLd.slice(0, 3)) {
    try {
      const data = JSON.parse(block);
      const s = JSON.stringify(data).slice(0, 400);
      console.log("  ld snippet:", s);
    } catch {
      console.log("  ld parse fail", block.slice(0, 120));
    }
  }

  // Try top unique product candidates for price extract
  const { extractPriceFromUrl } = await import(
    "../src/lib/price-compare/extract-price.ts"
  ).catch(() => ({ extractPriceFromUrl: null }));

  // Use inline extract since TS import may fail
  const { default: path } = await import("node:path");
  // skip TS

  for (const cand of uniq.slice(0, 4)) {
    try {
      const p = await get(cand);
      // quick extract
      const hasLd = /application\/ld\+json/i.test(p.html);
      const priceMatch =
        p.html.match(/itemprop=["']price["'][^>]*content=["']([^"']+)["']/i) ||
        p.html.match(/content=["']([^"']+)["'][^>]*itemprop=["']price["']/i) ||
        p.html.match(/"price"\s*:\s*"?(\d[\d\s.,]*)"?/i) ||
        p.html.match(/data-price=["']([^"']+)["']/i);
      const uah = p.html.match(
        /(\d{1,3}(?:[\s\u00a0.]\d{3})+|\d{4,7})\s*(?:грн|₴)/i
      );
      console.log(
        "  TRY",
        cand,
        "status",
        p.status,
        "ld",
        hasLd,
        "priceMatch",
        priceMatch?.[1],
        "uah",
        uah?.[0]
      );
    } catch (e) {
      console.log("  TRY fail", cand, e.message);
    }
  }
}
