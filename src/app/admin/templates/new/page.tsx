import type { Metadata } from "next";

import { TemplateForm } from "@/components/admin/library-forms";
import { createTemplate } from "@/lib/actions/library";

export const metadata: Metadata = { title: "New template" };

export default function NewTemplatePage() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">New assessment template</h1>
      <TemplateForm action={createTemplate} />
    </div>
  );
}
