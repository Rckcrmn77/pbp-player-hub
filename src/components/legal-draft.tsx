import type { ReactNode } from "react";

import { legalDocumentsAreDrafts, type LegalDocument } from "@/config/legal";

/** Layout for legal pages. Shows a prominent warning while the wording is a placeholder. */
export function LegalPage({ document, children }: { document: LegalDocument; children: ReactNode }) {
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-6">
      {legalDocumentsAreDrafts && (
        <div role="note" className="rounded-lg border-2 border-dashed border-orange bg-orange/5 p-4">
          <p className="font-bold text-orange-dark">Draft placeholder: not for use with real families</p>
          <p className="mt-1 text-sm text-navy/80">
            This wording is temporary development text. It has not been reviewed and must be replaced after a
            legal and privacy review before the Player Hub launches.
          </p>
        </div>
      )}
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{document.title}</h1>
        <p className="mt-1 text-sm text-navy/60">Version {document.version}</p>
      </header>
      <div className="flex flex-col gap-4 leading-relaxed [&_h2]:mt-2 [&_h2]:text-lg [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-6">
        {children}
      </div>
    </article>
  );
}
