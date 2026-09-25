import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CheckinForm, type CheckinDefaults } from "@/components/parent/checkin-form";
import { saveCheckin } from "@/lib/actions/progress";
import { getActiveBlueprint } from "@/lib/data/assessments";
import { getMyPlayer } from "@/lib/data/parent";
import { listCheckins } from "@/lib/data/progress";
import { checkinWeeks } from "@/lib/progress";
import { dateKey, formatWeek } from "@/lib/time";

export const metadata: Metadata = { title: "Weekly check-in" };

export default async function CheckinPage({
  params,
  searchParams,
}: PageProps<"/parent/players/[id]/check-in">) {
  const [{ id }, { week }] = await Promise.all([params, searchParams]);
  const player = await getMyPlayer(id);
  if (!player) notFound();
  const [blueprint, checkins] = await Promise.all([getActiveBlueprint(id), listCheckins(id)]);

  if (!blueprint) {
    return (
      <div className="flex max-w-2xl flex-col gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Weekly check-in</h1>
        <p className="rounded-xl border border-dashed border-navy/20 bg-white p-4 text-navy/70">
          Check-ins open once {player.first_name}&apos;s coach makes a Blueprint active.
        </p>
        <Link href={`/parent/players/${id}`} className="font-medium text-carolina-dark underline">
          Back to {player.first_name}
        </Link>
      </div>
    );
  }

  const weeks = checkinWeeks(blueprint.blueprint.start_date, dateKey(new Date()));
  const selected = typeof week === "string" && weeks.includes(week) ? week : weeks[0];
  const existing = checkins.find(
    (c) => c.blueprint_id === blueprint.blueprint.id && c.week_start === selected,
  );
  const defaults: CheckinDefaults = existing
    ? {
        assignmentCompleted: existing.assignment_completed ? "yes" : "no",
        repsCompleted: existing.reps_completed?.toString() ?? "",
        minutesCompleted: existing.minutes_completed?.toString() ?? "",
        confidence: String(existing.confidence),
        reflection: existing.reflection ?? "",
        questionForCoach: existing.question_for_coach ?? "",
      }
    : {};
  const targets = blueprint.drills
    .filter((d) => d.is_at_home)
    .map((d) =>
      [
        d.drill?.title ?? "Drill",
        [
          d.weekly_reps_target && `${d.weekly_reps_target} reps`,
          d.weekly_minutes_target && `${d.weekly_minutes_target} min`,
        ]
          .filter(Boolean)
          .join(" · "),
      ]
        .filter(Boolean)
        .join(": "),
    );

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <Link href={`/parent/players/${id}`} className="text-sm font-medium text-carolina-dark underline">
          {player.first_name} {player.last_name}
        </Link>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Weekly check-in</h1>
        <p className="mt-1 text-navy/70">
          {existing
            ? `You already checked in for ${selected === weeks[0] ? "this week" : "last week"}. Update it if anything changed.`
            : "Takes about a minute. Fill it in with your player."}
        </p>
      </div>
      {targets.length > 0 && (
        <section className="rounded-xl bg-carolina-light p-4 text-sm">
          <h2 className="font-semibold">This week&apos;s at-home work</h2>
          <ul className="mt-1 list-disc pl-5">
            {targets.map((t) => (
              <li key={t}>{t} per week</li>
            ))}
          </ul>
        </section>
      )}
      {weeks.length > 1 && (
        <nav aria-label="Choose a week" className="flex flex-wrap gap-2 text-sm">
          {weeks.map((w) => (
            <Link
              key={w}
              href={`/parent/players/${id}/check-in?week=${w}`}
              aria-current={w === selected ? "page" : undefined}
              className="rounded-full border border-navy/15 px-3 py-1 font-medium aria-[current=page]:border-carolina-dark aria-[current=page]:bg-carolina-light"
            >
              {w === weeks[0] ? "This week" : "Last week"}
              {checkins.some((c) => c.blueprint_id === blueprint.blueprint.id && c.week_start === w) && " ✓"}
            </Link>
          ))}
        </nav>
      )}
      <div className="rounded-xl border border-navy/10 bg-white p-5">
        <CheckinForm
          key={selected}
          action={saveCheckin.bind(null, id)}
          weekStart={selected}
          weekLabel={formatWeek(selected)}
          defaults={defaults}
          playerName={player.first_name}
          editing={!!existing}
        />
      </div>
    </div>
  );
}
