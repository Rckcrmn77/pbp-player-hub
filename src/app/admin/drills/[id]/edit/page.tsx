import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DrillForm } from "@/components/admin/library-forms";
import { updateDrill } from "@/lib/actions/library";
import { getDrill } from "@/lib/data/assessments";

export const metadata: Metadata = { title: "Edit drill" };

export default async function EditDrillPage({ params }: PageProps<"/admin/drills/[id]/edit">) {
  const { id } = await params;
  const drill = await getDrill(id);
  if (!drill) notFound();
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Edit {drill.title}</h1>
      <DrillForm action={updateDrill.bind(null, id)} drill={drill} />
    </div>
  );
}
