import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BlueprintView } from "@/components/assessment/blueprint-view";
import { AssignDrillForm, BlueprintDetailsForm, PriorityForm } from "@/components/coach/assessment-forms";
import { NoticeBanner } from "@/components/notice-banner";
import { StatusPill } from "@/components/status-pill";
import { blueprintStatusLabels } from "@/config/assessment";
import {
  assignDrill,
  removeAssignedDrill,
  removePriority,
  savePriority,
  setBlueprintStatus,
  updateBlueprint,
} from "@/lib/actions/assessments";
import { getBlueprintDetail, getPlayer, listDrills } from "@/lib/data/assessments";
import type { BlueprintStatus } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Blueprint" };

const smallButton =
  "rounded-md border border-navy/20 px-2.5 py-1 text-sm font-semibold hover:border-carolina-dark";

function StatusButton({
  blueprintId,
  playerId,
  status,
  label,
  primary = false,
}: {
  blueprintId: string;
  playerId: string;
  status: BlueprintStatus;
  label: string;
  primary?: boolean;
}) {
  return (
    <form action={setBlueprintStatus}>
      <input type="hidden" name="blueprintId" value={blueprintId} />
      <input type="hidden" name="playerId" value={playerId} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className={
          primary
            ? "rounded-md bg-orange px-4 py-2.5 font-semibold text-white hover:bg-orange-dark"
            : "rounded-md border border-navy/20 bg-white px-4 py-2.5 font-semibold hover:border-carolina-dark"
        }
      >
        {label}
      </button>
    </form>
  );
}

export default async function BlueprintPage({ params, searchParams }: PageProps<"/coach/blueprints/[id]">) {
  const [{ id }, { notice }] = await Promise.all([params, searchParams]);
  const detail = await getBlueprintDetail(id);
  if (!detail) notFound();
  const { blueprint, priorities, drills } = detail;
  const [player, library] = await Promise.all([getPlayer(blueprint.player_id), listDrills()]);
  const assigned = new Set(drills.map((d) => d.drill_id));
  const available = library
    .filter((d) => d.is_active && !assigned.has(d.id))
    .map((d) => ({ id: d.id, label: `${d.title} (${d.skill_category})` }));
  const byRank = new Map(priorities.map((p) => [p.rank, p]));

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <NoticeBanner notice={notice} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {player && (
            <Link
              href={`/coach/players/${player.id}`}
              className="text-sm font-medium text-carolina-dark underline"
            >
              {player.first_name} {player.last_name}
            </Link>
          )}
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Blueprint</h1>
          <div className="mt-2">
            <StatusPill tone={blueprint.status === "active" ? "good" : "neutral"}>
              {blueprintStatusLabels[blueprint.status]}
            </StatusPill>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {blueprint.status === "draft" && (
            <StatusButton
              blueprintId={id}
              playerId={blueprint.player_id}
              status="active"
              label="Make active for the family"
              primary
            />
          )}
          {blueprint.status === "active" && (
            <StatusButton
              blueprintId={id}
              playerId={blueprint.player_id}
              status="completed"
              label="Mark completed"
            />
          )}
          {(blueprint.status === "completed" || blueprint.status === "active") && (
            <StatusButton blueprintId={id} playerId={blueprint.player_id} status="archived" label="Archive" />
          )}
        </div>
      </div>

      <section className="flex flex-col gap-4 rounded-xl border border-navy/10 bg-white p-5">
        <h2 className="text-lg font-semibold">Goals and dates</h2>
        <BlueprintDetailsForm action={updateBlueprint.bind(null, id)} blueprint={blueprint} />
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-navy/10 bg-white p-5">
        <h2 className="text-lg font-semibold">Development priorities (up to 3)</h2>
        <div className="grid gap-5 lg:grid-cols-3">
          {[1, 2, 3].map((rank) => {
            const priority = byRank.get(rank);
            return (
              <div key={rank} className="flex flex-col gap-2">
                <PriorityForm action={savePriority.bind(null, id)} rank={rank} priority={priority} />
                {priority && (
                  <form action={removePriority}>
                    <input type="hidden" name="blueprintId" value={id} />
                    <input type="hidden" name="itemId" value={priority.id} />
                    <button type="submit" className="text-sm font-medium text-carolina-dark underline">
                      Remove priority {rank}
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-navy/10 bg-white p-5">
        <h2 className="text-lg font-semibold">Drills ({drills.length})</h2>
        {drills.length > 0 && (
          <ul className="divide-y divide-navy/10">
            {drills.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div>
                  <p className="font-medium">{d.drill?.title ?? "Drill"}</p>
                  <p className="text-sm text-navy/60">
                    {[
                      d.weekly_reps_target && `${d.weekly_reps_target} reps`,
                      d.weekly_minutes_target && `${d.weekly_minutes_target} min`,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "No set target"}{" "}
                    per week · {d.is_at_home ? "at home" : "at sessions"}
                  </p>
                </div>
                <form action={removeAssignedDrill}>
                  <input type="hidden" name="blueprintId" value={id} />
                  <input type="hidden" name="itemId" value={d.id} />
                  <button type="submit" className={smallButton}>
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <details className="rounded-lg border border-navy/10 p-4" open={drills.length === 0}>
          <summary className="cursor-pointer font-semibold">Assign a drill</summary>
          <div className="mt-4">
            <AssignDrillForm action={assignDrill.bind(null, id)} drills={available} />
          </div>
        </details>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">What the family sees</h2>
        {blueprint.status === "draft" && (
          <p className="text-sm text-navy/70">Families see this once you make the Blueprint active.</p>
        )}
        <div className="rounded-xl bg-surface p-4 ring-1 ring-navy/10">
          <BlueprintView detail={detail} />
        </div>
      </section>
    </div>
  );
}
