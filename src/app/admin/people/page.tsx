import type { Metadata } from "next";

import { NoticeBanner } from "@/components/notice-banner";
import { StatusPill } from "@/components/status-pill";
import { changeRole, setCoachActive } from "@/lib/actions/admin";
import { getSessionUser } from "@/lib/auth/session";
import { listPeople } from "@/lib/data/staff";
import type { AppRole } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "People" };

const roleLabels: Record<AppRole, string> = { parent: "Parent", coach: "Coach", admin: "Admin" };

const smallButton =
  "rounded-md border border-navy/20 px-2.5 py-1 text-sm font-semibold hover:border-carolina-dark";

export default async function PeoplePage({ searchParams }: PageProps<"/admin/people">) {
  const [{ notice }, me, people] = await Promise.all([searchParams, getSessionUser(), listPeople()]);

  return (
    <div className="flex flex-col gap-6">
      <NoticeBanner notice={notice} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">People</h1>
        <p className="mt-2 max-w-2xl text-navy/80">
          Everyone signs up as a parent. To add a coach, ask them to create an account, then change their role
          here. Coaches only see players in the programs you assign them to.
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {people.map((person) => {
          const isMe = person.id === me?.id;
          return (
            <li
              key={person.id}
              className="flex flex-col gap-3 rounded-xl border border-navy/10 bg-white p-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0">
                <p className="font-semibold">
                  {person.name} {isMe && <span className="font-normal text-navy/70">(you)</span>}
                </p>
                <p className="text-sm break-all text-navy/70">{person.email || "No email on file"}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <StatusPill tone={person.role === "parent" ? "neutral" : "good"}>
                    {roleLabels[person.role]}
                  </StatusPill>
                  {person.role !== "parent" && person.coachActive === false && (
                    <StatusPill tone="warn">Coach access paused</StatusPill>
                  )}
                </div>
              </div>

              {!isMe && (
                <div className="flex flex-wrap items-center gap-3">
                  <form action={changeRole} className="flex items-center gap-2">
                    <input type="hidden" name="profileId" value={person.id} />
                    <label htmlFor={`role-${person.id}`} className="sr-only">
                      Role for {person.name}
                    </label>
                    <select
                      id={`role-${person.id}`}
                      name="role"
                      defaultValue={person.role}
                      className="rounded-md border border-navy/20 bg-white px-2 py-1 text-sm"
                    >
                      {(Object.keys(roleLabels) as AppRole[]).map((role) => (
                        <option key={role} value={role}>
                          {roleLabels[role]}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className={smallButton}>
                      Change role
                    </button>
                  </form>
                  {person.role === "coach" && person.coachActive !== null && (
                    <form action={setCoachActive}>
                      <input type="hidden" name="profileId" value={person.id} />
                      <input type="hidden" name="active" value={person.coachActive ? "false" : "true"} />
                      <button type="submit" className={smallButton}>
                        {person.coachActive ? "Pause coach access" : "Restore coach access"}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
