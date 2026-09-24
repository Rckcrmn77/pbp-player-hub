import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProgramForm } from "@/components/admin/admin-forms";
import { updateProgram } from "@/lib/actions/admin";
import { getProgram } from "@/lib/data/staff";

export const metadata: Metadata = { title: "Edit program" };

export default async function EditProgramPage({ params }: PageProps<"/admin/programs/[id]/edit">) {
  const { id } = await params;
  const program = await getProgram(id);
  if (!program) notFound();
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Edit {program.name}</h1>
      <ProgramForm
        action={updateProgram.bind(null, id)}
        program={program}
        cancelHref={`/admin/programs/${id}`}
      />
    </div>
  );
}
