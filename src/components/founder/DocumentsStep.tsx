"use client";

import { useState } from "react";
import { Button, Card, EmptyState, InfoNote, Textarea } from "../ui";
import { Icon } from "../icons";
import type { StartupSideData, FounderDocumentRequest } from "@/lib/client/api";
import { DOC_STATUS, humanDate } from "./shared";
import { FileUploader } from "./FileUploader";

/**
 * The document checklist.
 *
 * Each item the team has asked for is one row with its own status, so a founder can see
 * exactly what is outstanding. Uploading attaches a real file and moves the item to
 * "under verification"; when the team asks a clarification, the note and a reply box appear
 * on the same row.
 */

export function DocumentsStep({
  data,
  onAction,
  push,
}: {
  data: StartupSideData;
  onAction: (a: string, p: Record<string, unknown>, d: string) => Promise<boolean>;
  push: (text: string, tone?: "success" | "danger" | "info") => void;
}) {
  const requests = data.documentRequests;
  const mandatory = requests.filter((r) => r.mandatory === 1);
  const verified = mandatory.filter((r) => r.status === "verified").length;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-hair bg-canvas p-4 shadow-card">
        <h2 className="text-[15px] font-semibold text-ink">Your document checklist</h2>
        <p className="mt-0.5 text-[12.5px] text-ink-soft">
          Upload each document the team asks for. A document is verified by the team after review.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-hair">
            <div
              className="h-full rounded-full bg-ok transition-[width] duration-500"
              style={{ width: `${mandatory.length ? (verified / mandatory.length) * 100 : 100}%` }}
            />
          </div>
          <span className="ss-num shrink-0 text-[12px] text-ink-soft">
            {verified}/{mandatory.length} verified
          </span>
        </div>
      </div>

      {requests.length === 0 ? (
        <EmptyState
          title="No documents requested yet"
          hint="When the team needs a document from you, it appears here with instructions and a status."
        />
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => (
            <DocumentRow key={r.id} request={r} onAction={onAction} push={push} />
          ))}
        </ul>
      )}

      {data.documents.length > 0 ? (
        <Card title="Documents on file" subtitle="Everything you and the team have recorded against your startup." padded={false}>
          <ul className="divide-y divide-hair">
            {data.documents.map((d) => (
              <li key={String(d.id)} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-ink">{String(d.title)}</p>
                  <p className="text-[11.5px] text-faint">
                    {String(d.purpose).replace(/_/g, " ")} · version {String(d.version)} · {humanDate(String(d.uploaded_on))}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-md bg-hover px-1.5 py-[1px] text-[10.5px] font-medium capitalize text-ink-soft">
                    {String(d.status)}
                  </span>
                  {String(d.file_ref) ? (
                    <a
                      href={`/api/v1/founder-upload?ref=${encodeURIComponent(String(d.file_ref))}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[12px] font-medium text-brand-ink hover:underline"
                    >
                      <Icon name="file-text" className="h-[13px] w-[13px]" /> View
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

function DocumentRow({
  request,
  onAction,
  push,
}: {
  request: FounderDocumentRequest;
  onAction: (a: string, p: Record<string, unknown>, d: string) => Promise<boolean>;
  push: (text: string, tone?: "success" | "danger" | "info") => void;
}) {
  const [uploadedRef, setUploadedRef] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const meta = DOC_STATUS[request.status] ?? DOC_STATUS.not_uploaded;
  const needsAction = request.status === "info_required" || request.status === "resubmission_required" || request.status === "not_uploaded";
  const canUpload = request.status !== "verified";

  const submitUpload = async () => {
    if (!uploadedRef) {
      push("Choose a file first", "danger");
      return;
    }
    setBusy(true);
    const ok = await onAction(
      "founder_side.document_upload",
      { request_id: request.id, file_ref: uploadedRef, title: request.title },
      "Document uploaded",
    );
    if (ok) setUploadedRef(null);
    setBusy(false);
  };

  const sendReply = async () => {
    if (!reply.trim()) return;
    setBusy(true);
    const ok = await onAction("founder_side.document_respond", { request_id: request.id, message: reply.trim() }, "Response sent");
    if (ok) setReply("");
    setBusy(false);
  };

  return (
    <li className="rounded-xl border border-hair bg-canvas p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
            {request.title}
            {request.mandatory === 0 ? <span className="text-[11px] font-normal text-faint">(optional)</span> : null}
          </p>
          {request.instructions ? <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">{request.instructions}</p> : null}
        </div>
        <span className={`shrink-0 rounded-md px-2 py-[3px] text-[11px] font-medium ${meta.chip}`}>{meta.label}</span>
      </div>

      {request.clarification ? (
        <InfoNote tone="warning">
          <span className="font-medium">The team asked: </span>
          {request.clarification}
        </InfoNote>
      ) : null}

      {request.submitted_on ? (
        <p className="mt-2 text-[11.5px] text-faint">
          Submitted {humanDate(request.submitted_on)}
          {request.verified_on ? ` · verified ${humanDate(request.verified_on)}` : ""}
        </p>
      ) : null}

      {canUpload ? (
        <div className="mt-3 space-y-2">
          <FileUploader
            requestId={request.id}
            acceptedFormats={request.accepted_formats}
            maxMb={request.max_size_mb}
            label={needsAction && request.status !== "not_uploaded" ? "Upload corrected file" : "Upload file"}
            onUploaded={(r) => setUploadedRef(r.file_ref)}
          />
          {uploadedRef ? (
            <Button size="sm" onClick={() => void submitUpload()} disabled={busy}>
              {busy ? "Submitting…" : "Submit this document"}
            </Button>
          ) : null}
        </div>
      ) : null}

      {request.status === "info_required" || request.status === "resubmission_required" ? (
        <div className="mt-3 border-t border-hair pt-3">
          <p className="text-[12px] font-medium text-ink-soft">Reply to the team</p>
          <Textarea value={reply} onChange={setReply} rows={2} placeholder="Explain or add anything that helps verification…" />
          <div className="mt-2">
            <Button size="sm" variant="secondary" onClick={() => void sendReply()} disabled={busy || !reply.trim()}>
              Send reply
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}
