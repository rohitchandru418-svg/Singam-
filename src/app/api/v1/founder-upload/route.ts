import { NextResponse } from "next/server";
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { fail, ok } from "@/lib/server/api";
import { actorFromRequest, HttpError } from "@/lib/server/session";
import { all, get } from "@/lib/db/client";
import { placeholderPdf } from "@/lib/server/placeholderDoc";
import type { Row } from "@/lib/server/repo";

export const dynamic = "force-dynamic";

/**
 * Founder document upload.
 *
 * A real multipart upload, not a file-name field. The file is written under
 * `data/uploads/<startupId>/` and served back through the same route, scoped to the startup
 * that owns the folder, so one founder can never read another founder's file.
 *
 * Validation is server-side and authoritative: size, extension and a per-request allowed
 * format list. The browser checks the same rules for a fast message, but the server does not
 * trust it.
 */

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXT = new Set(["pdf", "png", "jpg", "jpeg", "webp", "doc", "docx", "xls", "xlsx", "csv", "ppt", "pptx", "mp4", "mov", "zip"]);

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  mp4: "video/mp4",
  mov: "video/quicktime",
  zip: "application/zip",
};

function uploadRoot(): string {
  const dir = path.join(process.cwd(), "data", "uploads");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

/** Strip any path from the client-supplied name so it can never escape the startup folder. */
function safeName(name: string): string {
  const base = path.basename(name || "upload");
  return base.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120) || "upload";
}

function extensionOf(name: string): string {
  return path.extname(name).replace(".", "").toLowerCase();
}

export async function POST(request: Request) {
  try {
    const session = actorFromRequest(request);
    if (session.actor.kind !== "founder" || !session.actor.startupId) {
      throw new HttpError(403, "Only a startup-side login can upload a document");
    }
    const startupId = session.actor.startupId;

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new HttpError(422, "Attach a file to upload");
    if (file.size === 0) throw new HttpError(422, "That file is empty");
    if (file.size > MAX_BYTES) throw new HttpError(413, "That file is larger than 10 MB");

    const ext = extensionOf(file.name);
    if (!ALLOWED_EXT.has(ext)) {
      throw new HttpError(422, `Files of type .${ext || "unknown"} are not accepted. Allowed: ${[...ALLOWED_EXT].join(", ")}`);
    }

    // A per-request allowed-format list narrows the general rule when the team asks for one.
    const requestId = String(form.get("request_id") ?? "");
    if (requestId) {
      const row = all<{ accepted_formats: string; startup_id: string }>("SELECT accepted_formats, startup_id FROM document_requests WHERE id = ?", requestId)[0];
      if (row && String(row.startup_id) === startupId) {
        const allowed = String(row.accepted_formats ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
        if (allowed.length && !allowed.includes(ext)) throw new HttpError(422, `This document accepts: ${allowed.join(", ")}`);
      }
    }

    const folder = path.join(uploadRoot(), startupId);
    if (!existsSync(folder)) mkdirSync(folder, { recursive: true });
    const stored = `${randomBytes(6).toString("hex")}-${safeName(file.name)}`;
    writeFileSync(path.join(folder, stored), Buffer.from(await file.arrayBuffer()));

    const fileRef = `uploads/${startupId}/${stored}`;
    return ok({
      file_ref: fileRef,
      url: `/api/v1/founder-upload?ref=${encodeURIComponent(fileRef)}`,
      name: file.name,
      size: file.size,
      mime: MIME[ext] ?? "application/octet-stream",
    });
  } catch (error) {
    return fail(error, "upload");
  }
}

export async function GET(request: Request) {
  try {
    const session = actorFromRequest(request);
    const url = new URL(request.url);
    const ref = url.searchParams.get("ref") ?? "";
    if (ref.includes("..") || ref.startsWith("/")) throw new HttpError(400, "Invalid file reference");

    const isStaff = session.actor.kind !== "founder" && session.actor.kind !== "investor";
    const uploaded = ref.startsWith("uploads/");
    if (uploaded) {
      const owner = ref.split("/")[1] ?? "";
      const isOwner = session.actor.kind === "founder" && session.actor.startupId === owner;
      if (!isOwner && !isStaff) throw new HttpError(403, "You cannot open that file");

      const resolved = path.resolve(path.join(uploadRoot(), "..", ref));
      if (!resolved.startsWith(path.resolve(uploadRoot()))) throw new HttpError(400, "Invalid file reference");
      if (existsSync(resolved) && statSync(resolved).isFile()) return fileResponse(resolved);

      // A seeded proof points at a file the seed data never shipped. Render its placeholder
      // rather than a dead link, but only for the startup that owns the folder.
      return placeholderFor(ref, ["Placeholder. The live system stores the uploaded file here."]);
    }

    // A seeded document carries a logical reference, not a binary. Rather than break the
    // link, render a placeholder page — but only for a record the actor is allowed to see.
    const document = get<Row>(
      "SELECT title, purpose, category, version, status, uploaded_on, notes, entity_type, entity_id FROM documents WHERE file_ref = ? LIMIT 1",
      ref,
    );
    if (!document) throw new HttpError(404, "File not found");
    if (!canSeeDocument(session, document)) throw new HttpError(403, "You cannot open that file");

    const resolved = path.resolve(path.join(uploadRoot(), "..", ref));
    if (existsSync(resolved) && statSync(resolved).isFile()) return fileResponse(resolved);

    return placeholderFor(ref, [
      `Purpose: ${String(document.purpose).replace(/_/g, " ")}`,
      `Category: ${String(document.category ?? "")}   Version: ${String(document.version ?? 1)}   Status: ${String(document.status ?? "")}`,
      `Recorded on: ${String(document.uploaded_on ?? "")}`,
      "",
      String(document.notes ?? ""),
      "",
      "Placeholder. The live system stores the signed or uploaded file here.",
    ], String(document.title));
  } catch (error) {
    return fail(error, "download");
  }
}

/** A one-page PDF that stands in for a document or upload with no stored binary. */
function placeholderFor(ref: string, lines: string[], title?: string): NextResponse {
  const pdf = placeholderPdf(title ?? path.basename(ref), [...lines, `Reference: ${ref}`]);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${safeName(path.basename(ref)) || "document.pdf"}"`,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}

function fileResponse(resolved: string): NextResponse {
  const ext = extensionOf(resolved);
  return new NextResponse(createReadStream(resolved) as unknown as ReadableStream, {
    headers: {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${safeName(path.basename(resolved))}"`,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}

/** Staff see every record; a founder sees only records attached to their own startup. */
function canSeeDocument(session: ReturnType<typeof actorFromRequest>, document: Row): boolean {
  if (session.actor.kind !== "founder") return session.actor.kind !== "investor";
  if (String(document.entity_type) !== "startup") return false;
  return String(document.entity_id) === String(session.actor.startupId ?? "");
}
