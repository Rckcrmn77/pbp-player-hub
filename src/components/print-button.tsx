"use client";

export function PrintButton({ label = "Print or save as PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md border border-navy/20 bg-white px-3 py-2 text-sm font-semibold hover:border-carolina-dark print:hidden"
    >
      {label}
    </button>
  );
}
