const urls = [
  "https://opticstore.com.ua/product/teplovizor-pulsar-axion-2-xq35",
  "https://opticstore.com.ua/product/teplovizor-pulsar-axion-xm30f",
];
for (const url of urls) {
  const html = await (
    await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    })
  ).text();
  const item =
    html.match(/itemprop=["']price["'][^>]*content=["']([^"']+)/i)?.[1] ||
    html.match(/itemprop=["']price["'][^>]*>([^<]+)/i)?.[1];
  console.log("\n", url, "itemprop=", item);
  const re =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    if (!/Product/i.test(m[1])) continue;
    try {
      const j = JSON.parse(m[1].trim());
      console.log("offers", JSON.stringify(j.offers || j.price || j).slice(0, 500));
    } catch (e) {
      console.log("parse fail", e.message, m[1].slice(0, 200));
    }
  }
}
