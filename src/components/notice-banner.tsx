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
