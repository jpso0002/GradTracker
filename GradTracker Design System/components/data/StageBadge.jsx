import React from "react";

export const STAGES = {
  applied: { label: "Applied", key: "applied" },
  assessment: { label: "Assessment pending", key: "assessment" },
  interview: { label: "Interview scheduled", key: "interview" },
  offer: { label: "Offer received", key: "offer" },
  rejected: { label: "Rejected", key: "rejected" },
  withdrawn: { label: "Withdrawn", key: "withdrawn" },
};

export function StageBadge({ stage = "applied", size = "md", showDot = true, label, style }) {
  const s = STAGES[stage] || STAGES.applied;
  const v = (part) => "var(--stage-" + s.key + "-" + part + ")";
  const sm = size === "sm";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: sm ? 5 : 6,
      padding: sm ? "3px 8px" : "4px 10px", borderRadius: "var(--radius-pill)",
      background: v("bg"), color: v("fg"),
      fontFamily: "var(--font-core)", fontSize: sm ? "var(--micro-size)" : "var(--caption-size)",
      letterSpacing: sm ? 0 : "var(--caption-ls)", fontWeight: "var(--weight-regular)",
      whiteSpace: "nowrap", ...style,
    }}>
      {showDot ? <span style={{ width: 6, height: 6, borderRadius: "var(--radius-pill)", background: v("dot"), flex: "0 0 auto" }} /> : null}
      {label || s.label}
    </span>
  );
}
