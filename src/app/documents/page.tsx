"use client";

import { EntityBrowser, RefCell, LinkCell, RecordRef } from "@/components/EntityBrowser";
import { ModuleActions } from "@/components/ModuleActions";
import {
  PageIntro, Badge, Card, StatusBadge } from "@/components/ui";
import { DOCUMENT_PURPOSES } from "@/lib/domain/documents";

export default function DocumentsPage() {
  return (
    <div className="space-y-4">
      <PageIntro summary="Documents are versioned by purpose, not title, so the version shared with each investor is preserved.">
        Documents are versioned by <strong>purpose</strong>, not by title. Uploading another document with the same purpose
        creates a new version and leaves the earlier one in place, so the version shared with each investor is always
        recoverable.
      </PageIntro>

      <ModuleActions
        actions={["document.create", "document.verify"]}
        label="Document actions"
        documentPurposes={DOCUMENT_PURPOSES.map((d) => ({ key: d.key, label: d.label }))}
      />

      <Card title="Document purposes" subtitle="The purpose decides when a document is required; the title is descriptive only">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {DOCUMENT_PURPOSES.map((p) => (
            <div key={p.key} className="rounded-lg border border-hair p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-ink">{p.label}</p>
                {p.confidential ? <Badge tone="danger">Confidential</Badge> : <Badge tone="neutral">Shareable</Badge>}
              </div>
              <p className="mt-1 font-mono text-[11px] text-faint">{p.key}</p>
              <p className="mt-1 text-xs text-ink-soft">Audience: {p.audience.join(", ")}</p>
            </div>
          ))}
        </div>
      </Card>

      <EntityBrowser
        entity="documents"
        module="documents"
        title="Document register"
        description="Every document with its purpose, version, status, file reference and uploader."
        searchPlaceholder="Search title, purpose, category or notes"
        filters={[
          {
            column: "status",
            label: "Status",
            options: [
              { value: "requested", label: "Requested" },
              { value: "received", label: "Received" },
              { value: "verified", label: "Verified" },
              { value: "expired", label: "Expired" },
            ],
          },
          {
            column: "entity_type",
            label: "Record type",
            options: [
              { value: "startup", label: "Startup" },
              { value: "match", label: "Match" },
              { value: "deal", label: "Deal" },
              { value: "investor", label: "Investor" },
            ],
          },
        ]}
        columns={[
          { key: "title", label: "Document", render: (r) => <LinkCell entity="documents" id={r.id} label={String(r.title)} /> },
          { key: "purpose", label: "Purpose" },
          { key: "category", label: "Category" },
          { key: "entity_type", label: "Record type" },
          { key: "entity_id", label: "Record", render: (r) => <RecordRef type={r.entity_type} id={r.entity_id} /> },
          { key: "version", label: "Version", align: "right" },
          { key: "status", label: "Status", render: (r) => <StatusBadge registry="document" value={r.status} /> },
          { key: "file_ref", label: "File reference" },
          { key: "uploaded_by_id", label: "Uploaded by", render: (r) => <RefCell entity="users" id={r.uploaded_by_id} label={r.uploaded_by_id_label} /> },
          { key: "uploaded_on", label: "Uploaded" },
          { key: "notes", label: "Notes" },
        ]}
      />
    </div>
  );
}
