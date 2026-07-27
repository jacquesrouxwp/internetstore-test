import { extractPriceFromUrl } from "../src/lib/price-compare/extract-price";

const urls = [
  "https://opticstore.com.ua/product/teplovizor-pulsar-axion-xm30f",
  "https://opticstore.com.ua/product/teplovizor-hikmicro-lynx-le10s",
  "https://opticstore.com.ua/product/teplovizor-pulsar-axion-2-xq35",
  "https://profoptica.com.ua/teplovizionnyy-monokulyar-guide-trackir-35-400h300/",
  "https://profoptica.com.ua/teplovizor-thermtec-cyclops-650-se/",
  "https://www.optics-pro.com.ua/ua/teplovizori/pulsar/teplovizor-pulsar-axion-xm30f",
  "https://www.optics-pro.com.ua/ua/teplovizori/pulsar/teplovizor-pulsar-axion-compact-xg35",
];

async function main() {
  for (const u of urls) {
    const r = await extractPriceFromUrl(u);
    console.log(JSON.stringify({ url: u, ...r }));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
