export default function Loading() {
  return (
    <div role="status" className="flex items-center gap-3">
      <span className="size-5 animate-spin rounded-full border-2 border-carolina border-t-transparent" />
      <span className="text-navy/70">Loading…</span>
    </div>
  );
}
