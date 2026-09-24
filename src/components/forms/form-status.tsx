"use client";

import { useFormStatus } from "react-dom";

import type { FormState } from "@/lib/validation/form";

export function SubmitButton({ children, pendingText }: { children: React.ReactNode; pendingText: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="inline-flex items-center justify-center rounded-md bg-orange px-4 py-2.5 font-semibold text-white hover:bg-orange-dark disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? pendingText : children}
    </button>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (state.status === "idle" || !state.message) return null;
  const isError = state.status === "error";
  return (
    <p
      role={isError ? "alert" : "status"}
      className={`rounded-md p-3 text-sm font-medium ${
        isError ? "bg-orange/10 text-orange-dark" : "bg-carolina-light text-navy"
      }`}
    >
      {state.message}
    </p>
  );
}
