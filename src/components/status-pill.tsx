const tones = {
  neutral: "bg-navy/5 text-navy",
  good: "bg-carolina-light text-navy",
  warn: "bg-orange/10 text-orange-dark",
} as const;

export function StatusPill({
  tone = "neutral",
  children,
}: {
  tone?: keyof typeof tones;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
