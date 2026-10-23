/**
 * A dish name as the guest reads it. Vendors often type names in caps
 * ("MATAR TIKKI CHAAT"), which shouts beside the rest of a menu. A name with
 * any all-caps word of four or more letters was typed with caps on, so its
 * caps words are shown in title case — bar real acronyms. Short caps in an
 * otherwise normal name ("Paneer BBQ") stay. Display only: the stored name is
 * untouched.
 */
const ACRONYMS = new Set(["BBQ", "XL", "XXL"]);

export function displayDishName(name: string): string {
  const tidy = name
    .replace(/\s+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();
  if (!/\b[A-Z]{4,}\b/.test(tidy)) return tidy;
  return tidy.replace(/\b[A-Z]{2,}\b/g, (w) =>
    ACRONYMS.has(w) ? w : w[0] + w.slice(1).toLowerCase(),
  );
}
