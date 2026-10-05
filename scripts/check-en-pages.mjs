/**
 * Проверяет, что статические страницы переведены на английский.
 *
 * Две разные формы перевода живут в проекте одновременно:
 *
 *   - хелпер `L(uk, ru, en)` — одно дерево JSX, три текстовых аргумента.
 *     Третий аргумент необязателен, и это сделано нарочно: страница в работе
 *     отдаёт украинский, а не пустое место. Удобно при переводе и невидимо
 *     после него, поэтому единственный способ узнать, что страница
 *     действительно дописана, — посчитать вызовы с двумя аргументами.
 *
 *   - `isRu ? (<>…</>) : (<>…</>)` — две копии разметки. Третий язык здесь
 *     означал бы третью копию, поэтому такие страницы переводятся только
 *     после перевода на хелпер.
 *
 * Скрипт считает и то и другое и падает, если осталась работа.
 *
 *   node scripts/check-en-pages.mjs
 */

import { readFileSync, existsSync } from "node:fs";

const PAGES = [
  "about",
  "delivery",
  "warranty",
  "returns",
  "contacts",
  "oferta",
  "privacy",
  "vykup",
  "viyskovym",
];

const BACKSLASH = "\\";

/**
 * Аргументы вызова, начиная с символа после `L(`.
 *
 * Аргумент бывает строкой, выражением или JSX-фрагментом `<>…</>`. Внутри
 * JSX запятая и кавычка — просто текст, а не разделитель и не начало строки.
 * Первая версия считала их по правилам JS и видела три аргумента в двуязычном
 * вызове с запятой в предложении («…кодексу України, та Закону…»): страница,
 * в которой английского не было совсем, получала «готово». Поэтому здесь
 * отслеживается контекст: скобка JS или дети JSX-элемента.
 */
function splitArgs(s, start) {
  const args = [];
  const stack = []; // "paren" — скобка JS, "jsx" — дети JSX-элемента
  let cur = "";
  let j = start;

  /** Индекс закрывающей кавычки строки, открытой в s[i]. */
  const skipString = (i) => {
    const quote = s[i];
    i++;
    while (i < s.length && s[i] !== quote) {
      if (s[i] === BACKSLASH) i++;
      i++;
    }
    return i;
  };

  /** Открывающий тег или фрагмент с "<" в s[i]: индекс его ">" и самозакрытие. */
  const readOpenTag = (i) => {
    if (s[i + 1] === ">") return { end: i + 1, selfClosing: false };
    let k = i + 1;
    while (k < s.length) {
      const c = s[k];
      if (c === '"' || c === "'") {
        k = skipString(k);
      } else if (c === "{") {
        let depth = 1;
        k++;
        while (k < s.length && depth > 0) {
          if (s[k] === '"' || s[k] === "'" || s[k] === "`") k = skipString(k);
          else if (s[k] === "{") depth++;
          else if (s[k] === "}") depth--;
          k++;
        }
        continue;
      } else if (c === ">") {
        return { end: k, selfClosing: s[k - 1] === "/" };
      }
      k++;
    }
    return { end: k, selfClosing: false };
  };

  const startsTag = (i) => s[i] === "<" && (s[i + 1] === ">" || /[A-Za-z]/.test(s[i + 1] || ""));

  for (; j < s.length; j++) {
    const c = s[j];
    if (stack[stack.length - 1] === "jsx") {
      if (c === "{") {
        stack.push("paren");
        cur += c;
      } else if (c === "<" && s[j + 1] === "/") {
        const close = s.indexOf(">", j);
        cur += s.slice(j, close + 1);
        j = close;
        stack.pop();
      } else if (startsTag(j)) {
        const tag = readOpenTag(j);
        cur += s.slice(j, tag.end + 1);
        j = tag.end;
        if (!tag.selfClosing) stack.push("jsx");
      } else {
        cur += c;
      }
      continue;
    }

    if (c === '"' || c === "'" || c === "`") {
      j = skipString(j);
      cur += "S";
    } else if (startsTag(j)) {
      const tag = readOpenTag(j);
      j = tag.end;
      cur += "X";
      if (!tag.selfClosing) stack.push("jsx");
    } else if (c === "(" || c === "[" || c === "{") {
      stack.push("paren");
      cur += c;
    } else if (c === ")" || c === "]" || c === "}") {
      if (stack.length === 0) {
        args.push(cur.trim());
        return { args, end: j };
      }
      stack.pop();
      cur += c;
    } else if (c === "," && stack.length === 0) {
      args.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  args.push(cur.trim());
  return { args, end: j };
}

/** Номер строки по индексу в файле — чтобы отчёт показывал, куда смотреть. */
function lineOf(s, index) {
  let line = 1;
  for (let i = 0; i < index && i < s.length; i++) if (s[i] === "\n") line++;
  return line;
}

function inspect(source) {
  const twoArg = [];
  let withEn = 0;
  for (let k = 0; (k = source.indexOf("L(", k)) >= 0; k += 2) {
    const prev = k > 0 ? source[k - 1] : " ";
    if (/[\w$.]/.test(prev)) continue;
    const { args } = splitArgs(source, k + 2);
    const count = args.filter(Boolean).length;
    if (count >= 3) withEn++;
    else if (count === 2) twoArg.push(lineOf(source, k));
  }
  const branches = [];
  for (let k = 0; (k = source.indexOf("isRu ?", k)) >= 0; k += 6) {
    branches.push(lineOf(source, k));
  }
  return { twoArg, withEn, branches };
}

let failed = 0;
const rows = [];

for (const page of PAGES) {
  const path = `src/app/[locale]/${page}/page.tsx`;
  if (!existsSync(path)) {
    rows.push([page, "—", "—", "файла нет"]);
    continue;
  }
  const source = readFileSync(path, "utf8");
  const { twoArg, withEn, branches } = inspect(source);
  const problems = [];
  if (twoArg.length) {
    problems.push(`L( без английского: ${twoArg.length} (строки ${twoArg.slice(0, 8).join(", ")}${twoArg.length > 8 ? ", …" : ""})`);
  }
  if (branches.length) {
    problems.push(`ветвление isRu: ${branches.length} (строки ${branches.slice(0, 8).join(", ")}${branches.length > 8 ? ", …" : ""})`);
  }
  if (problems.length) failed++;
  rows.push([
    page,
    String(withEn),
    String(twoArg.length),
    problems.length ? problems.join("; ") : "готово",
  ]);
}

const width = (i) => Math.max(...rows.map((r) => r[i].length));
const w0 = Math.max(width(0), 9);
console.log(
  `${"страница".padEnd(w0)}  ${"с en".padStart(4)}  ${"без en".padStart(6)}  состояние`,
);
for (const r of rows) {
  console.log(`${r[0].padEnd(w0)}  ${r[1].padStart(4)}  ${r[2].padStart(6)}  ${r[3]}`);
}

if (failed) {
  console.error(`\nне переведено страниц: ${failed}`);
  process.exit(1);
}
console.log("\nвсе статические страницы переведены на английский");
