"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { accountConsentTypes, legalDocuments } from "@/config/legal";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ConsentType } from "@/lib/supabase/types";
import { formValues, validationError, type FormState } from "@/lib/validation/form";
import { parentProfileSchema, playerSchema, toPlayerColumns } from "@/lib/validation/player";

const saveFailed = "We couldn't save your changes. Please try again.";

/** Every parent action runs as the signed-in parent; Row Level Security applies to each query. */
async function parentClient(next: string) {
  const user = await requireRole(["parent"], next);
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  return { user, supabase };
}

const uuid = z.uuid();

export async function createPlayer(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const parsed = playerSchema.safeParse(Object.fromEntries(formData));
  const consent = formData.get("parentalConsent") === "on";
  if (!parsed.success || !consent) {
    const state = parsed.success
      ? { status: "error" as const, values }
      : validationError(parsed.error, values);
    return {
      ...state,
      message: "Please fix the highlighted fields.",
      fieldErrors: {
        ...state.fieldErrors,
        ...(consent ? {} : { parentalConsent: ["You need to give parental consent to add a player."] }),
      },
    };
  }

  const { supabase } = await parentClient("/parent/players/new");

  // The id is generated here so the row can be found again without needing
  // read access at insert time; a database trigger links the player to this parent.
  const id = crypto.randomUUID();
  const { error } = await supabase.from("players").insert({ id, ...toPlayerColumns(parsed.data) });
  if (error) return { status: "error", message: saveFailed, values };

  await supabase.from("consent_records").insert({
    player_id: id,
    consent_type: "parental_consent",
    document_version: legalDocuments.parental_consent.version,
    granted: true,
  });

  revalidatePath("/parent");
  redirect(`/parent/players/${id}?notice=created`);
}

export async function updatePlayer(
  playerId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  if (!uuid.safeParse(playerId).success) return { status: "error", message: saveFailed, values };
  const parsed = playerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, values);

  const { supabase } = await parentClient(`/parent/players/${playerId}/edit`);
  const { data, error } = await supabase
    .from("players")
    .update(toPlayerColumns(parsed.data))
    .eq("id", playerId)
    .select("id");
  if (error || !data?.length) return { status: "error", message: saveFailed, values };

  revalidatePath("/parent");
  redirect(`/parent/players/${playerId}?notice=updated`);
}

export async function acceptAccountAgreements(_prev: FormState, formData: FormData): Promise<FormState> {
  const missing = accountConsentTypes.filter((type) => formData.get(type) !== "on");
  if (missing.length > 0) {
    return {
      status: "error",
      message: "Please accept both documents to continue.",
      fieldErrors: Object.fromEntries(
        missing.map((type) => [type, [`Accept the ${legalDocuments[type].title}.`]]),
      ),
    };
  }

  const { supabase } = await parentClient("/parent/consent");
  const { error } = await supabase.from("consent_records").insert(
    accountConsentTypes.map((type) => ({
      consent_type: type,
      document_version: legalDocuments[type].version,
      granted: true,
    })),
  );
  if (error) return { status: "error", message: saveFailed };

  revalidatePath("/parent", "layout");
  redirect("/parent?notice=consent-saved");
}

const consentChange = z.object({
  consentType: z.enum(["terms_of_service", "privacy_policy", "parental_consent"]),
  playerId: z.union([z.literal(""), z.uuid()]).transform((v) => (v === "" ? null : v)),
  granted: z.enum(["true", "false"]).transform((v) => v === "true"),
});

/** Gives or withdraws one consent. Consent history is append-only, so both add a new record. */
export async function changeConsent(formData: FormData): Promise<void> {
  const parsed = consentChange.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/parent/consent?notice=consent-error");

  const { consentType, playerId, granted } = parsed.data;
  const type = consentType as ConsentType;
  // Parental consent is per player; the account documents are not.
  if ((type === "parental_consent") !== (playerId !== null)) redirect("/parent/consent?notice=consent-error");

  const { supabase } = await parentClient("/parent/consent");
  const { error } = await supabase.from("consent_records").insert({
    consent_type: type,
    player_id: playerId,
    document_version: legalDocuments[type].version,
    granted,
  });

  revalidatePath("/parent", "layout");
  redirect(
    `/parent/consent?notice=${error ? "consent-error" : granted ? "consent-saved" : "consent-withdrawn"}`,
  );
}

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const parsed = parentProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, values);

  const { user, supabase } = await parentClient("/parent/account");
  const { error } = await supabase
    .from("profiles")
    .update({ first_name: parsed.data.firstName, last_name: parsed.data.lastName, phone: parsed.data.phone })
    .eq("id", user.id);
  if (error) return { status: "error", message: saveFailed, values };

  revalidatePath("/", "layout");
  return { status: "success", message: "Your details are saved.", values };
}
