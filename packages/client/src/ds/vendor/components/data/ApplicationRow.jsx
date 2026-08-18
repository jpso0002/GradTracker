import React from "react";
import { StageBadge } from "./StageBadge.jsx";
import { DeadlinePill } from "./DeadlinePill.jsx";
import { Icon } from "../core/Icon.jsx";

export function ApplicationRow({ company, role, stage, nextAction, deadline, daysLeft, source = "Gmail", selected, onClick, style }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "grid", gridTemplateColumns: "minmax(200px,1.4fr) 170px minmax(160px,1fr) 150px 28px",
        alignItems: "center", gap: "var(--space-lg)",
        padding: "var(--cell-pad-y) var(--cell-pad-x)",
        borderBottom: "1px solid var(--border-hairline)",
        background: selected ? "var(--surface-selected)" : hover ? "var(--surface-hover)" : "transparent",
        cursor: "pointer", transition: "background-color var(--dur-fast) var(--ease-standard)", ...style,
      }}
    >
      <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{
            width: 22, height: 22, flex: "0 0 auto", borderRadius: "var(--radius-xs)",
            background: "var(--surface-sunken)", border: "1px solid var(--border-hairline)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, color: "var(--text-muted)", fontWeight: "var(--weight-medium)",
          }}>{String(company || "?").slice(0, 1)}</span>
          <span style={{ fontSize: "var(--body-md-size)", color: "var(--text-heading)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{company}</span>
        </span>
        <span style={{ fontSize: "var(--caption-size)", letterSpacing: "var(--caption-ls)", color: "var(--text-muted)", paddingLeft: 30, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{role}</span>
      </span>
      <span><StageBadge stage={stage} /></span>
      <span style={{ fontSize: "var(--body-tabular-size)", letterSpacing: "var(--body-tabular-ls)", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nextAction}</span>
      <span>{deadline ? <DeadlinePill daysLeft={daysLeft}>{deadline}</DeadlinePill> : <span style={{ color: "var(--text-muted)", fontSize: "var(--body-tabular-size)" }}>—</span>}</span>
      <span style={{ display: "flex", justifyContent: "flex-end", color: hover ? "var(--text-muted)" : "transparent" }} title={"Detected from " + source}>
        <Icon name="chevron-right" size={16} />
      </span>
    </div>
  );
}
