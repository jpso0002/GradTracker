import { useId, type ButtonHTMLAttributes, type CSSProperties, type ChangeEvent, type ReactNode } from "react";
import type { Stage } from "@gradtracker/shared";
import { Icon } from "../ds";

/**
 * GradTracker's own components, in Will's design (D41).
 *
 * The same names and props as the design-system components the screens used,
 * so a screen moves across by changing its import, not its logic. Styles are
 * the classes in `theme/gradtracker.css`.
 *
 * What the design system still provides, unchanged, is re-exported at the
 * bottom: the icons and the logo — the one part of the old look kept.
 */

// ── Button ──────────────────────────────────────────────────────────────────

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "style"> {
  children?: ReactNode;
  /** primary = lavender · ink = Will's dark button · secondary = lavender outline ·
   *  quiet = hairline · ghost = no chrome · danger = coral outline. `onDark`
   *  (the old name for a dark fill) maps to ink. */
  variant?: "primary" | "ink" | "secondary" | "quiet" | "ghost" | "danger" | "onDark";
  size?: "sm" | "md" | "lg";
  iconLeft?: string;
  iconRight?: string;
  fullWidth?: boolean;
  style?: CSSProperties;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  iconLeft,
  iconRight,
  fullWidth,
  type = "button",
  className,
  ...rest
}: ButtonProps) {
  const tone = variant === "onDark" ? "ink" : variant;
  const classes = ["gt-button", tone, `size-${size}`, fullWidth ? "full" : "", className ?? ""].filter(Boolean).join(" ");
  return (
    <button type={type} className={classes} {...rest}>
      {iconLeft ? <Icon name={iconLeft} size={size === "sm" ? 14 : 16} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} size={size === "sm" ? 14 : 16} /> : null}
    </button>
  );
}

/** A square button with an icon and a name — the name is for everyone who
 *  cannot see the icon. */
export function IconButton({
  icon,
  label,
  onClick,
  style,
}: {
  icon: string;
  label: string;
  onClick?: () => void;
  style?: CSSProperties;
}) {
  return (
    <button type="button" className="gt-icon-button" aria-label={label} title={label} onClick={onClick} style={style}>
      <Icon name={icon} size={17} />
    </button>
  );
}

// ── Stage ───────────────────────────────────────────────────────────────────

/** Will's stage names: one word each. */
export const STAGES: Record<Stage, { label: string; key: Stage }> = {
  applied: { label: "Applied", key: "applied" },
  assessment: { label: "Assessment", key: "assessment" },
  interview: { label: "Interview", key: "interview" },
  offer: { label: "Offer", key: "offer" },
  rejected: { label: "Rejected", key: "rejected" },
  withdrawn: { label: "Withdrawn", key: "withdrawn" },
};

export interface StageBadgeProps {
  stage?: Stage;
  size?: "sm" | "md";
  showDot?: boolean;
  label?: string;
  style?: CSSProperties;
}

export function StageBadge({ stage = "applied", showDot = true, label, style }: StageBadgeProps) {
  return (
    <span
      className="gt-stage"
      style={{ background: `var(--stage-${stage}-bg)`, color: `var(--stage-${stage}-fg)`, ...style }}
    >
      {showDot ? <i aria-hidden="true" style={{ background: `var(--stage-${stage}-dot)` }} /> : null}
      {label ?? STAGES[stage].label}
    </span>
  );
}

// ── Top bar ─────────────────────────────────────────────────────────────────

export function TopBar({ title, subtitle, children }: { title?: string; subtitle?: string; children?: ReactNode; sticky?: boolean; style?: CSSProperties }) {
  return (
    <header className="gt-topbar">
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* The view's own <h1> is the page heading (ViewTitle); this is the
            bar's visible label. */}
        <span style={{ font: "700 18px var(--font-display)" }}>
          {title}
        </span>
        {subtitle ? <span style={{ fontSize: 13, color: "var(--muted)" }}>{subtitle}</span> : null}
      </div>
      {children ? <div className="gt-topbar-actions">{children}</div> : null}
    </header>
  );
}

// ── Tabs ────────────────────────────────────────────────────────────────────

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export function Tabs({ tabs = [], activeId, onSelect, style }: { tabs?: TabItem[]; activeId?: string; onSelect?: (id: string) => void; style?: CSSProperties }) {
  return (
    <div role="tablist" className="gt-tabs" style={style}>
      {tabs.map((tab) => (
        <button key={tab.id} type="button" role="tab" aria-selected={tab.id === activeId} onClick={() => onSelect?.(tab.id)}>
          {tab.label}
          {tab.count != null ? <span className="count">{tab.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

// ── Search ──────────────────────────────────────────────────────────────────

export function SearchField({
  value,
  onChange,
  placeholder,
  shortcut,
  width,
  style,
}: {
  value?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  shortcut?: string;
  width?: number | string;
  style?: CSSProperties;
}) {
  return (
    <span className="gt-search" style={{ ...(width !== undefined ? { width } : {}), ...style }}>
      <Icon name="search" size={17} />
      <input type="text" value={value} onChange={onChange} placeholder={placeholder} />
      {shortcut ? <kbd aria-hidden="true">{shortcut}</kbd> : null}
    </span>
  );
}

// ── Empty state ─────────────────────────────────────────────────────────────

export function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
  compact,
}: {
  icon?: string;
  title?: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div className={`gt-blank${compact ? " compact" : ""}`}>
      <span className="gt-blank-icon" aria-hidden="true">
        <Icon name={icon} size={24} />
      </span>
      {title ? <h3>{title}</h3> : null}
      {description ? <p>{description}</p> : null}
      {action ? <div className="gt-blank-action">{action}</div> : null}
    </div>
  );
}

// ── Toast ───────────────────────────────────────────────────────────────────

export function Toast({
  children,
  tone = "success",
  action,
  onDismiss,
}: {
  children?: ReactNode;
  tone?: "info" | "success" | "warning" | "error";
  action?: ReactNode;
  onDismiss?: () => void;
}) {
  const icon = tone === "error" ? "alert-circle" : tone === "info" ? "info" : tone === "warning" ? "triangle-alert" : "check";
  return (
    <div className={`gt-toast ${tone}`} role="status">
      <span className="gt-toast-icon" style={{ display: "flex" }}>
        <Icon name={icon} size={16} />
      </span>
      <span>{children}</span>
      {action}
      {onDismiss ? (
        <button type="button" className="gt-toast-close" aria-label="Dismiss" onClick={onDismiss}>
          <Icon name="x" size={14} />
        </button>
      ) : null}
    </div>
  );
}

// ── Toggle (Will's switch) ──────────────────────────────────────────────────

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked?: boolean;
  onChange?: (checked: boolean, e: ChangeEvent<HTMLInputElement>) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  style?: CSSProperties;
}) {
  const id = useId();
  return (
    <label className="gt-toggle-row" htmlFor={id} style={disabled ? { opacity: 0.5, cursor: "not-allowed" } : undefined}>
      <span className="text">
        {label ? <span>{label}</span> : null}
        {description ? <span>{description}</span> : null}
      </span>
      <input id={id} type="checkbox" checked={!!checked} disabled={disabled} onChange={(e) => onChange?.(e.target.checked, e)} />
      <span className="gt-toggle" aria-hidden="true" />
    </label>
  );
}

// ── Company initials (Will's coloured squares) ──────────────────────────────

const TONES = ["purple", "blue", "amber", "green", "coral"] as const;

/** "Deloitte" → "DE", "REA Group" → "RG"; the colour is stable per company. */
export function CompanyLogo({ company, large }: { company: string; large?: boolean }) {
  const words = company.trim().split(/\s+/).filter(Boolean);
  const initials = (words.length > 1 ? words[0]![0]! + words[1]![0]! : company.slice(0, 2)).toUpperCase();
  let hash = 0;
  for (const ch of company) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return (
    <span className={`gt-company-logo tone-${TONES[hash % TONES.length]}${large ? " large" : ""}`} aria-hidden="true">
      {initials}
    </span>
  );
}

// ── Kept from the design system ─────────────────────────────────────────────

export { Icon, Wordmark, LogoMark, Input, Select, Card, Tag, Badge, ConfidenceMeter, Dialog, Tooltip, DeadlinePill } from "../ds";
