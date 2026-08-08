/**
 * Level A description UX: turn wall-of-text product copy into readable
 * blocks without rewriting content or touching the database.
 *
 * Handles:
 * - Existing paragraph breaks (\n\n / \n)
 * - Sentence-based split for single-block walls of text
 * - Bullet / numbered lists
 * - Short section labels ending with ":"
 */

export type DescriptionBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[] };

/** Soft target length for a paragraph built from sentences. */
const PARA_SOFT_MAX = 280;
/** Prefer at most this many sentences per auto-built paragraph. */
const PARA_MAX_SENTENCES = 3;
/** Short enough + ends with ":" → section heading. */
const HEADING_MAX_LEN = 90;

const BULLET_LINE =
  /^(?:[•·▪▸►●○\-–—*]|\d+[.)])\s+(.+)$/;

/** Capital letter (Latin + Cyrillic incl. Ukrainian extras). */
const CAP = "A-ZА-ЯЁІЇЄҐ";

/**
 * Split on sentence enders while keeping the punctuation on the sentence.
 * Requires a following capital (or end of string) so "384×288." mid-specs
 * is less likely to break wrongly than a naive split.
 */
export function splitSentences(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // Split after . ! ? … when followed by whitespace + capital, or end.
  const parts = trimmed.split(new RegExp(`(?<=[.!?…])\\s+(?=[${CAP}])`));
  return parts.map((s) => s.trim()).filter(Boolean);
}

function stripHtml(input: string): string {
  return input
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"');
}

function normalizeRaw(input: string): string {
  return stripHtml(input)
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function isHeadingLine(line: string): boolean {
  const t = line.trim();
  if (t.length < 3 || t.length > HEADING_MAX_LEN) return false;
  if (!t.endsWith(":")) return false;
  // Avoid treating long mid-sentence colons as headings.
  if (/[.!?]/.test(t.slice(0, -1))) return false;
  return true;
}

function parseBulletLine(line: string): string | null {
  const m = line.trim().match(BULLET_LINE);
  return m ? m[1].trim() : null;
}

/**
 * Group consecutive bullet lines into a list; non-bullets stay as lines.
 */
function extractListsFromLines(lines: string[]): DescriptionBlock[] {
  const blocks: DescriptionBlock[] = [];
  let listBuf: string[] = [];

  const flushList = () => {
    if (listBuf.length === 0) return;
    blocks.push({ type: "list", items: listBuf });
    listBuf = [];
  };

  for (const line of lines) {
    const item = parseBulletLine(line);
    if (item) {
      listBuf.push(item);
      continue;
    }
    flushList();
    const t = line.trim();
    if (!t) continue;
    if (isHeadingLine(t)) {
      blocks.push({ type: "heading", text: t.replace(/:\s*$/, "") });
    } else {
      blocks.push(...paragraphsFromText(t));
    }
  }
  flushList();
  return blocks;
}

/**
 * Turn a plain text chunk (no intentional list structure) into 1+ paragraphs.
 * Wall-of-text: split by sentence and pack into readable groups.
 */
export function paragraphsFromText(text: string): DescriptionBlock[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];

  // Already short enough — one paragraph.
  if (clean.length <= PARA_SOFT_MAX) {
    return [{ type: "paragraph", text: clean }];
  }

  const sentences = splitSentences(clean);
  if (sentences.length <= 1) {
    return [{ type: "paragraph", text: clean }];
  }

  const blocks: DescriptionBlock[] = [];
  let buf: string[] = [];
  let bufLen = 0;

  const flush = () => {
    if (buf.length === 0) return;
    blocks.push({ type: "paragraph", text: buf.join(" ") });
    buf = [];
    bufLen = 0;
  };

  for (const s of sentences) {
    const nextLen = bufLen + (bufLen ? 1 : 0) + s.length;
    const wouldOverflow =
      buf.length > 0 &&
      (buf.length >= PARA_MAX_SENTENCES || nextLen > PARA_SOFT_MAX);

    if (wouldOverflow) flush();
    buf.push(s);
    bufLen += (bufLen ? 1 : 0) + s.length;
  }
  flush();

  return blocks;
}

/**
 * Parse one top-level chunk (between blank lines).
 */
function parseChunk(chunk: string): DescriptionBlock[] {
  const lines = chunk
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  // Multi-line chunk: prefer list/heading detection.
  if (lines.length > 1) {
    const bulletCount = lines.filter((l) => parseBulletLine(l) !== null).length;
    if (bulletCount >= 2 || (bulletCount >= 1 && lines.length >= 2)) {
      return extractListsFromLines(lines);
    }
    // Mixed prose lines without bullets → each non-heading line as text.
    return extractListsFromLines(lines);
  }

  // Single line / single wall of text.
  const only = lines[0];
  if (isHeadingLine(only)) {
    return [{ type: "heading", text: only.replace(/:\s*$/, "") }];
  }
  const bullet = parseBulletLine(only);
  if (bullet) {
    return [{ type: "list", items: [bullet] }];
  }
  return paragraphsFromText(only);
}

/**
 * Format a raw product description for storefront display.
 * Never mutates meaning — only structure for readability.
 */
export function formatDescription(
  input: string | null | undefined
): DescriptionBlock[] {
  if (input == null) return [];
  const raw = normalizeRaw(String(input));
  if (!raw) return [];

  // Prefer blank-line sections; fall back to single newlines as soft breaks
  // only when there are no blank lines (donor often uses \n between sentences).
  const hasBlank = /\n\s*\n/.test(raw);
  const chunks = hasBlank
    ? raw.split(/\n\s*\n+/).map((c) => c.trim()).filter(Boolean)
    : [raw];

  const blocks: DescriptionBlock[] = [];
  for (const chunk of chunks) {
    blocks.push(...parseChunk(chunk));
  }

  // Collapse consecutive single-item lists into one list (rare import noise).
  return mergeAdjacentLists(blocks);
}

function mergeAdjacentLists(blocks: DescriptionBlock[]): DescriptionBlock[] {
  const out: DescriptionBlock[] = [];
  for (const b of blocks) {
    const prev = out[out.length - 1];
    if (b.type === "list" && prev?.type === "list") {
      prev.items.push(...b.items);
    } else {
      out.push(b.type === "list" ? { type: "list", items: [...b.items] } : b);
    }
  }
  return out;
}
