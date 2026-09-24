import type { Metadata } from "next";

import { ProgramForm } from "@/components/admin/admin-forms";
import { createProgram } from "@/lib/actions/admin";

export const metadata: Metadata = { title: "Create a program" };

export default function NewProgramPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Create a program</h1>
      <ProgramForm action={createProgram} cancelHref="/admin/programs" />
    </div>
  );
}
