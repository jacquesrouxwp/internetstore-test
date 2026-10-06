/**
 * Validation for PATCH /api/admin/products { action: "descriptions" }.
 *
 * PUT rebuilds the whole product, and on a partial body it recomputes fields
 * the caller never sent: it writes the detection-range row into the specs
 * (453 of the 493 feed products would have got one on 6 October) and derives
 * the sale flag again (13 of them would have flipped). Bulk work on texts
 * therefore goes through this action, which writes the two description
 * columns and nothing else. What is left to refuse is a body that would wipe a
 * description or hit the wrong row.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A real description is a paragraph at least; an empty string or one line is a mistake. */
export const MIN_DESCRIPTION_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 5000;

export interface DescriptionPatch {
  id: string;
  descriptionUk: string;
  descriptionRu: string;
}

export type ParsedDescriptionPatch =
  | { ok: true; patch: DescriptionPatch }
  | { ok: false; error: string };

export function parseDescriptionPatch(body: unknown): ParsedDescriptionPatch {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;

  const id = typeof b.id === "string" ? b.id.trim() : "";
  if (!UUID.test(id)) return { ok: false, error: "id must be a product uuid" };

  const texts = { descriptionUk: "", descriptionRu: "" };
  for (const field of ["descriptionUk", "descriptionRu"] as const) {
    const value = b[field];
    if (typeof value !== "string") return { ok: false, error: `${field} must be a string` };
    const text = value.trim();
    if (text.length < MIN_DESCRIPTION_LENGTH || text.length > MAX_DESCRIPTION_LENGTH) {
      return {
        ok: false,
        error: `${field} must be ${MIN_DESCRIPTION_LENGTH}-${MAX_DESCRIPTION_LENGTH} characters, got ${text.length}`,
      };
    }
    texts[field] = text;
  }

  return { ok: true, patch: { id, ...texts } };
}
