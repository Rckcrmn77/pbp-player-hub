import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const controlClass =
  "mt-1 block w-full rounded-md border border-navy/20 bg-white px-3 py-2 text-base text-navy shadow-sm " +
  "placeholder:text-navy/40 focus:border-carolina-dark focus:ring-2 focus:ring-carolina/40 focus:outline-none " +
  "aria-invalid:border-orange aria-invalid:ring-orange/30";

type FieldProps = {
  name: string;
  /** Defaults to `name`; set it when a page has several forms with the same field names. */
  id?: string;
  label: string;
  hint?: ReactNode;
  errors?: string[];
  optional?: boolean;
};

function FieldShell({
  name,
  id,
  label,
  hint,
  errors,
  optional,
  children,
}: FieldProps & { children: ReactNode }) {
  const fieldId = id ?? name;
  return (
    <div>
      <label htmlFor={fieldId} className="block text-sm font-medium">
        {label}
        {optional && <span className="font-normal text-navy/70"> (optional)</span>}
      </label>
      {children}
      {hint && !errors?.length && (
        <p id={`${fieldId}-hint`} className="mt-1 text-sm text-navy/70">
          {hint}
        </p>
      )}
      {errors?.length ? (
        <p id={`${fieldId}-error`} className="mt-1 text-sm font-medium text-orange-dark">
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(name: string, hint: unknown, errors?: string[]) {
  if (errors?.length) return `${name}-error`;
  return hint ? `${name}-hint` : undefined;
}

export function TextField({
  name,
  id,
  label,
  hint,
  errors,
  optional,
  ...input
}: FieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, "name">) {
  return (
    <FieldShell name={name} id={id} label={label} hint={hint} errors={errors} optional={optional}>
      <input
        id={id ?? name}
        name={name}
        required={!optional}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={describedBy(id ?? name, hint, errors)}
        className={controlClass}
        {...input}
      />
    </FieldShell>
  );
}

export function TextAreaField({
  name,
  id,
  label,
  hint,
  errors,
  optional,
  ...input
}: FieldProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "name">) {
  return (
    <FieldShell name={name} id={id} label={label} hint={hint} errors={errors} optional={optional}>
      <textarea
        id={id ?? name}
        name={name}
        rows={3}
        required={!optional}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={describedBy(id ?? name, hint, errors)}
        className={controlClass}
        {...input}
      />
    </FieldShell>
  );
}

export function SelectField({
  name,
  id,
  label,
  hint,
  errors,
  optional,
  options,
  placeholder = "Choose…",
  ...select
}: FieldProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "name"> & {
    options: { value: string | number; label: string }[];
    placeholder?: string;
  }) {
  return (
    <FieldShell name={name} id={id} label={label} hint={hint} errors={errors} optional={optional}>
      <select
        // Remount when the default changes (e.g. values returned after a failed submit):
        // React only applies a select's default choice on mount, and forms reset to it.
        key={String(select.defaultValue ?? "")}
        id={id ?? name}
        name={name}
        required={!optional}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={describedBy(id ?? name, hint, errors)}
        className={controlClass}
        {...select}
      >
        <option value="">{optional ? "None" : placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function CheckboxField({
  name,
  label,
  errors,
  ...input
}: { name: string; label: ReactNode; errors?: string[] } & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "name"
>) {
  return (
    <div>
      <div className="flex items-start gap-3">
        <input
          id={name}
          name={name}
          type="checkbox"
          required
          aria-invalid={errors?.length ? true : undefined}
          aria-describedby={errors?.length ? `${name}-error` : undefined}
          className="mt-1 size-4 shrink-0 accent-orange"
          {...input}
        />
        <label htmlFor={name} className="text-sm">
          {label}
        </label>
      </div>
      {errors?.length ? (
        <p id={`${name}-error`} className="mt-1 text-sm font-medium text-orange-dark">
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}
