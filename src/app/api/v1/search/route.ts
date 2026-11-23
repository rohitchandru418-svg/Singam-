import { fail, ok } from "@/lib/server/api";
import { all } from "@/lib/db/client";
import { ENTITIES } from "@/lib/server/registry";
import { actorFromRequest, assertModuleAccess } from "@/lib/server/session";
import { seasonFromRequest, seasonScopeSql } from "@/lib/server/season";

export const dynamic = "force-dynamic";

/**
 * Global search across every searchable column the role is allowed to open, plus
 * searchable meeting minutes, which the brief calls out explicitly.
 */
export async function GET(request: Request) {
  try {
    const session = actorFromRequest(request);
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    if (q.length < 2) return ok({ query: q, results: [] });
    const like = `%${q.toLowerCase()}%`;
    const seasonId = seasonFromRequest(request);

    const results: { entity: string; entityLabel: string; id: string; title: string; subtitle: string }[] = [];

    for (const entity of ENTITIES) {
      try {
        assertModuleAccess(session, entity.module);
      } catch {
        continue;
      }
      const columns = entity.searchable.filter((c) => c !== "id");
      if (columns.length === 0) continue;
      const predicate = columns.map((c) => `lower(${c}) LIKE ?`).join(" OR ");
      const scope = seasonScopeSql(entity.table, seasonId);
      const rows = all<Record<string, unknown>>(
        `SELECT * FROM ${entity.table} WHERE (${predicate})${scope ? ` AND ${scope.sql}` : ""} LIMIT 5`,
        ...columns.map(() => like),
        ...(scope?.params ?? []),
      );
      for (const row of rows) {
        const titleColumn = ["name", "title", "reference_no", "label", "code", "document_ref", "invoice_no", "episode_no", "file_name"].find(
          (c) => row[c] !== undefined && row[c] !== null && row[c] !== "",
        );
        results.push({
          entity: entity.key,
          entityLabel: entity.label,
          id: String(row.id),
          title: titleColumn ? String(row[titleColumn]) : String(row.id),
          subtitle: entity.plural,
        });
      }
    }

    return ok({ query: q, total: results.length, results: results.slice(0, 60) });
  } catch (error) {
    return fail(error);
  }
}
