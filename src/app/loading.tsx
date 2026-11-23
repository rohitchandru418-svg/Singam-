export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-3">
        <div className="h-7 w-64 ss-shimmer rounded" />
        <div className="h-4 w-full max-w-2xl ss-shimmer rounded" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[76px] ss-shimmer rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-44 ss-shimmer rounded-xl" />
        ))}
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
