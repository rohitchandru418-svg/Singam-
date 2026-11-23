"use client";

import { useRef, useState } from "react";
import { apiUploadFile, ApiError, onUploadProgress, type UploadResult } from "@/lib/client/api";
import { Icon } from "../icons";

/**
 * A real file picker with upload progress.
 *
 * The file is sent as multipart to `/api/v1/founder-upload`, which validates size, type and
 * the per-request allowed formats server-side, writes it under the startup's own folder and
 * returns a reference. The parent decides what to do with the reference — record it on a
 * document request, or attach it to a message.
 */

const ACCEPTED = ".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.mp4,.mov,.zip";
const MAX_MB = 10;

export function FileUploader({
  onUploaded,
  requestId,
  acceptedFormats,
  label = "Choose a file",
  maxMb = MAX_MB,
}: {
  onUploaded: (result: UploadResult) => void;
  requestId?: string;
  acceptedFormats?: string;
  label?: string;
  maxMb?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);

  const accept = acceptedFormats ? acceptedFormats.split(",").map((s) => `.${s.trim()}`).join(",") : ACCEPTED;

  const pick = (selected: File) => {
    setError(null);
    const ext = selected.name.split(".").pop()?.toLowerCase() ?? "";
    if (acceptedFormats) {
      const allowed = acceptedFormats.split(",").map((s) => s.trim().toLowerCase());
      if (!allowed.includes(ext)) {
        setError(`This document accepts: ${allowed.join(", ")}`);
        return;
      }
    }
    if (selected.size > maxMb * 1024 * 1024) {
      setError(`That file is larger than ${maxMb} MB`);
      return;
    }
    setFile({ name: selected.name, size: selected.size });
    void upload(selected);
  };

  const upload = async (selected: File) => {
    setBusy(true);
    setProgress(0);
    onUploadProgress(setProgress);
    try {
      const result = await apiUploadFile(selected, requestId ? { request_id: requestId } : {});
      onUploaded(result);
      setFile({ name: result.name, size: result.size });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Upload failed. Try again.");
      setFile(null);
    } finally {
      onUploadProgress(null);
      setBusy(false);
      setProgress(0);
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const selected = e.target.files?.[0];
          if (selected) pick(selected);
          e.target.value = "";
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-hair-strong bg-canvas px-2.5 py-[6px] text-[12.5px] font-medium text-ink transition hover:bg-hover disabled:cursor-not-allowed disabled:text-faint"
        >
          <Icon name="folder" className="h-[14px] w-[14px] text-faint" />
          {busy ? "Uploading…" : file ? "Replace file" : label}
        </button>
        {file && !busy ? (
          <span className="flex items-center gap-1.5 text-[12px] text-ink-soft">
            <Icon name="check" className="h-[13px] w-[13px] text-ok" />
            {file.name} <span className="text-faint">({Math.max(1, Math.round(file.size / 1024))} KB)</span>
          </span>
        ) : null}
      </div>

      {busy ? (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-hair">
          <div className="h-full rounded-full bg-brand transition-[width] duration-200" style={{ width: `${progress}%` }} />
        </div>
      ) : null}
      {error ? (
        <div className="mt-2 flex items-start justify-between gap-2 rounded-lg border border-risk-line bg-risk-soft px-2.5 py-1.5 text-[11.5px] text-risk">
          <span>{error}</span>
          {file ? (
            <button type="button" className="shrink-0 font-medium underline" onClick={() => inputRef.current?.click()}>
              Retry
            </button>
          ) : null}
        </div>
      ) : null}
      <p className="mt-1 text-[11px] text-faint">
        Accepted: {acceptedFormats ? acceptedFormats.split(",").join(", ") : "pdf, images, office files, video, zip"} · up to {maxMb} MB.
      </p>
    </div>
  );
}
