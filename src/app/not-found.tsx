import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="font-mono text-[13px] font-medium text-faint">404</p>
      <h1 className="mt-2 text-[20px] font-semibold tracking-[-0.01em] text-ink">Screen not found</h1>
      <p className="mt-2 text-[13.5px] text-ink-soft">
        The page you asked for does not exist. Use the sidebar or search to find the record or module.
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <Link
          href="/"
          className="rounded-lg bg-ink px-3 py-[7px] text-[13px] font-medium text-white transition hover:bg-black"
        >
          Back to the dashboard
        </Link>
      </div>
    </div>
  );
}
