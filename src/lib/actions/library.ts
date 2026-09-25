"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { charterCategories } from "@/config/assessment";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  criterionSchema,
  drillInput,
  drillSchema,
  templateSchema,
  toDrillColumns,
} from "@/lib/validation/assessment";
import { formValues, validationError, type FormState } from "@/lib/validation/form";

const saveFailed = "We couldn't save that. Please try again.";
const uuid = z.uuid();

async function adminClient(next: string) {
  await requireRole(["admin"], next);
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

// ---------------------------------------------------------------------------
// Drill library
// ---------------------------------------------------------------------------

export async function createDrill(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const parsed = drillSchema.safeParse(drillInput(formData));
  if (!parsed.success) return validationError(parsed.error, values);

  const supabase = await adminClient("/admin/drills/new");
  const { error } = await supabase.from("drills").insert(toDrillColumns(parsed.data));
  if (error) return { status: "error", message: saveFailed, values };

  revalidatePath("/admin/drills");
  redirect("/admin/drills?notice=drill-saved");
}

export async function updateDrill(drillId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  if (!uuid.safeParse(drillId).success) return { status: "error", message: saveFailed, values };
  const parsed = drillSchema.safeParse(drillInput(formData));
  if (!parsed.success) return validationError(parsed.error, values);

  const supabase = await adminClient(`/admin/drills/${drillId}/edit`);
  const { data, error } = await supabase
    .from("drills")
    .update(toDrillColumns(parsed.data))
    .eq("id", drillId)
    .select("id");
  if (error || !data?.length) return { status: "error", message: saveFailed, values };

  revalidatePath("/admin/drills");
  redirect("/admin/drills?notice=drill-saved");
}

// ---------------------------------------------------------------------------
// Assessment templates
// ---------------------------------------------------------------------------

function templateInput(formData: FormData) {
  return { ...Object.fromEntries(formData), isActive: formData.get("isActive") === "on" };
}

export async function createTemplate(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const parsed = templateSchema.safeParse(templateInput(formData));
  if (!parsed.success) return validationError(parsed.error, values);

  const supabase = await adminClient("/admin/templates/new");
  const id = crypto.randomUUID();
  const { error } = await supabase.from("assessment_templates").insert({
    id,
    name: parsed.data.name,
    description: parsed.data.description,
    age_group: parsed.data.ageGroup,
    position: parsed.data.position,
    is_active: parsed.data.isActive,
  });
  if (error) return { status: "error", message: saveFailed, values };

  revalidatePath("/admin/templates");
  redirect(`/admin/templates/${id}?notice=template-created`);
}

export async function updateTemplate(
  templateId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  if (!uuid.safeParse(templateId).success) return { status: "error", message: saveFailed, values };
  const parsed = templateSchema.safeParse(templateInput(formData));
  if (!parsed.success) return validationError(parsed.error, values);

  const supabase = await adminClient(`/admin/templates/${templateId}`);
  const { data, error } = await supabase
    .from("assessment_templates")
    .update({
      name: parsed.data.name,
      description: parsed.data.description,
      age_group: parsed.data.ageGroup,
      position: parsed.data.position,
      is_active: parsed.data.isActive,
    })
    .eq("id", templateId)
    .select("id");
  if (error || !data?.length) return { status: "error", message: saveFailed, values };

  revalidatePath("/admin/templates", "layout");
  return { status: "success", message: "Template saved.", values };
}

/** Creates a template with one criterion per charter category, for PBP to edit. */
export async function createStarterTemplate(): Promise<void> {
  const supabase = await adminClient("/admin/templates");
  const id = crypto.randomUUID();
  const { error } = await supabase.from("assessment_templates").insert({
    id,
    name: "PBP core assessment",
    description:
      "Starter template with the charter's five categories. Edit the criteria to match PBP's standards.",
  });
  if (error) redirect("/admin/templates?notice=error");
  await supabase.from("assessment_criteria").insert(
    charterCategories.map((category, i) => ({
      template_id: id,
      category,
      name: category,
      sort_order: (i + 1) * 10,
    })),
  );
  revalidatePath("/admin/templates");
  redirect(`/admin/templates/${id}?notice=template-created`);
}

export async function addCriterion(
  templateId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  if (!uuid.safeParse(templateId).success) return { status: "error", message: saveFailed, values };
  const parsed = criterionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, values);

  const supabase = await adminClient(`/admin/templates/${templateId}`);
  const { error } = await supabase.from("assessment_criteria").insert({
    template_id: templateId,
    category: parsed.data.category,
    name: parsed.data.name,
    description: parsed.data.description,
    sort_order: parsed.data.sortOrder,
  });
  if (error) return { status: "error", message: saveFailed, values };

  revalidatePath(`/admin/templates/${templateId}`);
  redirect(`/admin/templates/${templateId}?notice=criterion-added`);
}

const criterionChange = z.object({
  templateId: z.uuid(),
  criterionId: z.uuid(),
  category: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(200),
  sortOrder: z.coerce.number().int().min(0).max(999),
  isActive: z.enum(["true", "false"]).transform((v) => v === "true"),
});

/** Criteria are never deleted once created (scores may point at them); retire them instead. */
export async function updateCriterion(formData: FormData): Promise<void> {
  const parsed = criterionChange.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/admin/templates?notice=error`);
  const { templateId, criterionId, category, name, sortOrder, isActive } = parsed.data;

  const supabase = await adminClient(`/admin/templates/${templateId}`);
  const { error } = await supabase
    .from("assessment_criteria")
    .update({ category, name, sort_order: sortOrder, is_active: isActive })
    .eq("id", criterionId);

  revalidatePath(`/admin/templates/${templateId}`);
  redirect(`/admin/templates/${templateId}?notice=${error ? "error" : "criterion-saved"}`);
}

// ---------------------------------------------------------------------------
// Publishing
// ---------------------------------------------------------------------------

const publishChange = z.object({ assessmentId: z.uuid() });

/** Publishing is admin-only; the database checks the assessment was approved first. */
export async function publishAssessment(formData: FormData): Promise<void> {
  const parsed = publishChange.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/assessments?notice=error");

  const supabase = await adminClient("/admin/assessments");
  const { data, error } = await supabase
    .from("assessments")
    .update({ status: "published" })
    .eq("id", parsed.data.assessmentId)
    .select("id");

  revalidatePath("/admin/assessments");
  revalidatePath("/coach", "layout");
  revalidatePath("/parent", "layout");
  redirect(`/admin/assessments?notice=${error || !data?.length ? "error" : "assessment-published"}`);
}
