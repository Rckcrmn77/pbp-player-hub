import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddCriterionForm, TemplateForm } from "@/components/admin/library-forms";
import { NoticeBanner } from "@/components/notice-banner";
import { addCriterion, updateCriterion, updateTemplate } from "@/lib/actions/library";
import { getCriteria, getTemplate } from "@/lib/data/assessments";

export const metadata: Metadata = { title: "Assessment template" };

const input = "rounded-md border border-navy/20 bg-white px-2 py-1 text-sm";
const smallButton =
  "rounded-md border border-navy/20 px-2.5 py-1 text-sm font-semibold hover:border-carolina-dark";

export default async function TemplatePage({ params, searchParams }: PageProps<"/admin/templates/[id]">) {
  const [{ id }, { notice }] = await Promise.all([params, searchParams]);
  const template = await getTemplate(id);
  if (!template) notFound();
  const criteria = await getCriteria(id);
  const nextSortOrder = (criteria.at(-1)?.sort_order ?? 0) + 10;

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <NoticeBanner notice={notice} />
      <div>
        <Link href="/admin/templates" className="text-sm font-medium text-carolina-dark underline">
          All templates
        </Link>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{template.name}</h1>
      </div>

      <section className="flex flex-col gap-4 rounded-xl border border-navy/10 bg-white p-5">
        <h2 className="text-lg font-semibold">Details</h2>
        <TemplateForm action={updateTemplate.bind(null, id)} template={template} />
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-navy/10 bg-white p-5">
        <h2 className="text-lg font-semibold">
          Criteria ({criteria.filter((c) => c.is_active).length} in use)
        </h2>
        <p className="text-sm text-navy/70">
          Coaches rate every criterion in use from 1 to 5 with a comment. Retire a criterion instead of
          deleting it, so past assessments keep their scores.
        </p>
        {criteria.length > 0 && (
          <ul className="divide-y divide-navy/10">
            {criteria.map((c) => (
              <li key={c.id} className="py-3">
                <form action={updateCriterion} className="flex flex-col gap-2 md:flex-row md:items-end">
                  <input type="hidden" name="templateId" value={id} />
                  <input type="hidden" name="criterionId" value={c.id} />
                  <input type="hidden" name="isActive" value={String(c.is_active)} />
                  <label className="flex flex-1 flex-col text-xs text-navy/60">
                    Category
                    <input name="category" defaultValue={c.category} className={input} required />
                  </label>
                  <label className="flex flex-1 flex-col text-xs text-navy/60">
                    What is rated
                    <input name="name" defaultValue={c.name} className={input} required />
                  </label>
                  <label className="flex w-20 flex-col text-xs text-navy/60">
                    Order
                    <input
                      name="sortOrder"
                      defaultValue={c.sort_order}
                      inputMode="numeric"
                      className={input}
                    />
                  </label>
                  <div className="flex gap-2">
                    <button type="submit" className={smallButton}>
                      Save
                    </button>
                  </div>
                </form>
                <form action={updateCriterion} className="mt-2">
                  <input type="hidden" name="templateId" value={id} />
                  <input type="hidden" name="criterionId" value={c.id} />
                  <input type="hidden" name="category" value={c.category} />
                  <input type="hidden" name="name" value={c.name} />
                  <input type="hidden" name="sortOrder" value={c.sort_order} />
                  <input type="hidden" name="isActive" value={String(!c.is_active)} />
                  <button type="submit" className="text-sm font-medium text-carolina-dark underline">
                    {c.is_active ? "Retire this criterion" : "Put back in use"}
                  </button>
                  {!c.is_active && <span className="ml-2 text-sm text-orange-dark">Retired</span>}
                </form>
              </li>
            ))}
          </ul>
        )}
        <details className="rounded-lg border border-navy/10 p-4" open={criteria.length === 0}>
          <summary className="cursor-pointer font-semibold">Add a criterion</summary>
          <div className="mt-4">
            <AddCriterionForm action={addCriterion.bind(null, id)} nextSortOrder={nextSortOrder} />
          </div>
        </details>
      </section>
    </div>
  );
}
