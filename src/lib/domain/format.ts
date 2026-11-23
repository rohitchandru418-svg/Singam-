/** Short words that stay lower-case inside a label, and acronyms that stay upper-case. */
const SMALL_WORDS = new Set(["of", "to", "on", "at", "by", "in", "for", "and", "or", "the", "per"]);
const ACRONYMS = new Set([
  "id", "irr", "mou", "av", "hni", "pan", "cin", "gst", "tds", "ip", "nda", "ipa",
  "kpi", "sop", "sla", "ama", "fy26", "mba", "ceo", "cfo", "gmv", "arr", "mrr", "esop",
]);

/** Column and field keys are snake_case identifiers; screens show them as readable labels. */
export function humanise(key: string): string {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[_-]+|\s+/)
    .filter(Boolean);
  return words
    .map((word, i) => {
      const lower = word.toLowerCase();
      if (ACRONYMS.has(lower)) return lower.toUpperCase();
      if (i > 0 && SMALL_WORDS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}
