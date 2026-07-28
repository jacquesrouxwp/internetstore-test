const url = "https://opticstore.com.ua/product/teplovizor-pulsar-axion-xm30f";
const res = await fetch(url, {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    Accept: "text/html",
  },
});
const html = await res.text();
console.log("status", res.status, "len", html.length);

// all json-ld
const re =
  /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
let m;
let i = 0;
while ((m = re.exec(html))) {
  i++;
  console.log("\n--- LD", i, "---");
  console.log(m[1].trim().slice(0, 800));
}

// data-price occurrences
const dp = [...html.matchAll(/data-price=["']([^"']+)["']/gi)].map((x) => x[1]);
console.log("\ndata-price values:", [...new Set(dp)].slice(0, 20));

// price in product block
const priceBlocks = [
  ...html.matchAll(/class=["'][^"']*price[^"']*["'][^>]*>[\s\S]{0,120}/gi),
].slice(0, 8);
console.log("\nprice class snippets:");
priceBlocks.forEach((x) => console.log(x[0].replace(/\s+/g, " ").slice(0, 150)));

// itemprop
console.log(
  "\nitemprop price",
  html.match(/itemprop=["']price["'][^>]*/i)?.[0]
);
console.log(
  "content price amount",
  html.match(/product:price:amount[^>]*/i)?.[0]
);

// special / old price patterns common in OpenCart
for (const pat of [
  /"price"\s*:\s*"([^"]+)"/g,
  /"special"\s*:\s*"([^"]+)"/g,
  /id=["']price[^"']*["'][^>]*>[\s\S]{0,80}/gi,
]) {
  const hits = [...html.matchAll(pat)].slice(0, 5).map((x) => x[0].slice(0, 100));
  if (hits.length) console.log("\npat hits", hits);
}
