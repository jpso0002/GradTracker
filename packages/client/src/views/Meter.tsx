import { ConfidenceMeter } from "../ds";

/**
 * The design system's `ConfidenceMeter`, given the meter role and a text
 * alternative (design.md §10.3): "AI confidence 52 percent". The bar and its
 * figure are drawn by the design system; this only says what they mean.
 */
export function Meter({ value, label = "AI confidence", id }: { value: number; label?: string; id?: string }) {
  const percent = Math.max(0, Math.min(100, Math.round(value * (value <= 1 ? 100 : 1))));
  return (
    <span
      id={id}
      role="meter"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${label} ${percent} percent`}
      style={{ display: "inline-flex" }}
    >
      <ConfidenceMeter value={value} showValue label={label} />
    </span>
  );
}
