"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-risk-soft text-risk">
        <span aria-hidden className="text-[20px] font-semibold">!</span>
      </div>
      <h1 className="mt-4 text-[20px] font-semibold tracking-[-0.01em] text-ink">Something went wrong</h1>
      <p className="mt-2 text-[13.5px] text-ink-soft">
        This screen could not load. The action may have been rejected, or the record may no longer exist.
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-ink px-3 py-[7px] text-[13px] font-medium text-white transition hover:bg-black"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-md border border-hair-strong bg-canvas px-3 py-1.5 text-[13.5px] font-medium text-ink transition hover:bg-hover"
        >
          Back to the dashboard
        </Link>
      </div>
    </div>
  );
}
