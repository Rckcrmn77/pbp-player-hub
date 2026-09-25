"use client";

import { useActionState, useState } from "react";

import { FormMessage, SubmitButton } from "@/components/forms/form-status";
import { attendanceOptions } from "@/config/program-options";
import type { AttendanceStatus } from "@/lib/supabase/types";
import { idleState, type FormState } from "@/lib/validation/form";

type Row = { playerId: string; name: string; detail: string; status: AttendanceStatus | null };

export function AttendanceForm({
  action,
  rows,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  rows: Row[];
}) {
  const [state, formAction] = useActionState(action, idleState);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus | "">>(() =>
    Object.fromEntries(rows.map((r) => [r.playerId, r.status ?? ""])),
  );
  const unmarked = rows.filter((r) => !statuses[r.playerId]).length;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormMessage state={state} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-navy/70">
          {unmarked === 0 ? "Everyone is marked." : `${unmarked} of ${rows.length} not marked yet.`}
        </p>
        <button
          type="button"
          onClick={() =>
            setStatuses((current) =>
              Object.fromEntries(rows.map((r) => [r.playerId, current[r.playerId] || "present"])),
            )
          }
          className="rounded-md border border-navy/20 bg-white px-3 py-1.5 text-sm font-semibold hover:border-carolina-dark"
        >
          Mark everyone else present
        </button>
      </div>

      <ul className="divide-y divide-navy/10 rounded-xl border border-navy/10 bg-white">
        {rows.map((row) => (
          <li
            key={row.playerId}
            className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <p className="font-medium">{row.name}</p>
              <p className="text-sm text-navy/70">{row.detail}</p>
            </div>
            <fieldset>
              <legend className="sr-only">Attendance for {row.name}</legend>
              <input type="hidden" name={`status:${row.playerId}`} value={statuses[row.playerId]} />
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
                {attendanceOptions.map((option) => {
                  const selected = statuses[row.playerId] === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`cursor-pointer rounded-md border px-3 py-1.5 text-center text-sm font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-carolina ${
                        selected
                          ? option.value === "present"
                            ? "border-carolina-dark bg-carolina-light"
                            : "border-orange bg-orange/10 text-orange-dark"
                          : "border-navy/15 text-navy/80 hover:border-navy/40"
                      }`}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        name={`choice:${row.playerId}`}
                        value={option.value}
                        checked={selected}
                        onChange={() => setStatuses((s) => ({ ...s, [row.playerId]: option.value }))}
                      />
                      {option.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </li>
        ))}
      </ul>
      <div>
        <SubmitButton pendingText="Saving…">Save attendance</SubmitButton>
      </div>
    </form>
  );
}
