import type { Metadata } from "next";

import { DrillForm } from "@/components/admin/library-forms";
import { createDrill } from "@/lib/actions/library";

export const metadata: Metadata = { title: "Add a drill" };

export default function NewDrillPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Add a drill</h1>
      <DrillForm action={createDrill} />
    </div>
  );
}
