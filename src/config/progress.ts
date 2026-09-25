/** Confidence scale for weekly check-ins (charter section 4.7). */
export const confidenceScale: { value: number; label: string }[] = [
  { value: 1, label: "Not yet" },
  { value: 2, label: "A little" },
  { value: 3, label: "Getting there" },
  { value: 4, label: "Confident" },
  { value: 5, label: "Very confident" },
];

export function confidenceLabel(value: number): string {
  return confidenceScale.find((c) => c.value === value)?.label ?? String(value);
}
