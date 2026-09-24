const notices: Record<string, string> = {
  created: "Player added.",
  updated: "Player details saved.",
  "consent-saved": "Consent saved.",
  "consent-withdrawn": "Consent withdrawn.",
  "consent-error": "We couldn't save that change. Please try again.",
  "password-updated": "Your new password is saved.",
  "program-created": "Program created. Add sessions, coaches, and players below.",
  "program-saved": "Program details saved.",
  "session-added": "Session added.",
  "sessions-added": "Sessions added.",
  "session-cancelled": "Session cancelled.",
  "session-restored": "Session restored.",
  "coach-assigned": "Coach assigned.",
  "coach-removed": "Coach removed from this program.",
  "player-enrolled": "Player added to the roster.",
  "roster-updated": "Roster updated.",
  "role-changed": "Role updated.",
  "own-role": "You can't change your own role. Ask another administrator.",
  "coach-activated": "Coach reactivated.",
  "coach-deactivated": "Coach deactivated. They no longer see any players.",
  "attendance-saved": "Attendance saved.",
  "drill-saved": "Drill saved.",
  "template-created": "Template created. Add or edit its criteria below.",
  "criterion-added": "Criterion added.",
  "criterion-saved": "Criterion saved.",
  "assessment-published": "Assessment published. The family can see it now.",
  "assessment-started": "Assessment started. Rate each criterion and add a comment.",
  "assessment-saved": "Draft saved.",
  "assessment-submitted": "Submitted for approval.",
  "assessment-approved": "Approved. An administrator will publish it to the family.",
  "assessment-returned": "Returned to draft.",
  "blueprint-created": "Blueprint started. Add priorities and drills, then make it active.",
  "blueprint-saved": "Blueprint saved.",
  "blueprint-activated": "Blueprint is now active and visible to the family.",
  "priority-saved": "Priority saved.",
  "priority-removed": "Priority removed.",
  "drill-assigned": "Drill assigned.",
  "drill-removed": "Drill removed from this Blueprint.",
  error: "We couldn't save that change. Please try again.",
};

const errorNotices = new Set(["consent-error", "error", "own-role"]);

/** One-line confirmation shown after a redirect (?notice=...). */
export function NoticeBanner({ notice }: { notice: unknown }) {
  const message = typeof notice === "string" ? notices[notice] : undefined;
  if (!message) return null;
  const isError = errorNotices.has(notice as string);
  return (
    <p
      role={isError ? "alert" : "status"}
      className={`rounded-md p-3 text-sm font-medium ${
        isError ? "bg-orange/10 text-orange-dark" : "bg-carolina-light text-navy"
      }`}
    >
      {message}
    </p>
  );
}
