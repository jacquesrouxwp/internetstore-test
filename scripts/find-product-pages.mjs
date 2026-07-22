const BASE = "https://www.optics-pro.com.ua";
const terms = [
  ["pulsar-axion-xg30", "axion xg30"],
  ["hikmicro-thunder-th35pc-2-0", "thunder th35"],
  ["pulsar-thermion-2-xq50", "thermion 2 xq50"],
  ["hikmicro-habrok-hq35l", "habrok"],
  ["pulsar-merger-lrf-xp50", "merger lrf xp50"],
  ["rix-storm-s3", "rix storm"],
  ["armasight-nyx-14-pro", "nyx 14"],
  ["pulsar-edge-gs-1x20", "edge gs 1x20"],
  ["pard-nv008s-lrf", "nv008s"],
  ["sytong-ht-60-lrf", "sytong ht-60"],
  ["atn-x-sight-4k-pro", "x-sight 4k"],
  ["hikmicro-thunder-th25c", "thunder th25"],
];

async function search(q) {
  const url =
    BASE +
    "/index.php?route=product/search&search=" +
    encodeURIComponent(q);
  const r = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept-Language": "uk",
    },
  });
  const h = await r.text();
  const links = [...h.matchAll(/href="(\/ua\/[^"#?]+)"/g)]
    .map((m) => m[1])
    .filter(
      (u) =>
        !u.includes("search") &&
        !u.includes("route=") &&
        !u.endsWith("/ua/") &&
        !u.includes("novosti") &&
        !u.includes("account")
    );
  return [...new Set(links)].slice(0, 12);
}

for (const [slug, q] of terms) {
  try {
    const links = await search(q);
    console.log("\n##", slug, "q=", q);
    links.forEach((u) => console.log(u));
  } catch (e) {
    console.log(slug, e.message);
  }
}
