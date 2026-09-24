const notices: Record<string, string> = {
  created: "Player added.",
  updated: "Player details saved.",
  "consent-saved": "Consent saved.",
  "consent-withdrawn": "Consent withdrawn.",
  "consent-error": "We couldn't save that change. Please try again.",
  "password-updated": "Your new password is saved.",
};

/** One-line confirmation shown after a redirect (?notice=...). */
export function NoticeBanner({ notice }: { notice: unknown }) {
  const message = typeof notice === "string" ? notices[notice] : undefined;
  if (!message) return null;
  const isError = notice === "consent-error";
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
