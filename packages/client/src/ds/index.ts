/**
 * The design system's public surface, as the app sees it.
 *
 * Everything in `src/` imports from here and never from `vendor/` directly.
 * That gives one place to see what the app actually uses, one place to shim a
 * component if it ever needs it, and one import path to change if the system
 * later ships as a package.
 *
 * Re-exports only. No component is defined, wrapped or restyled here — the
 * design system owns how these look, and `ds.sync.test.ts` proves the copy has
 * not drifted from the source.
 */

// ── core ────────────────────────────────────────────────────────────────────
export { Badge } from "./vendor/components/core/Badge";
export { Button } from "./vendor/components/core/Button";
export { Card } from "./vendor/components/core/Card";
export { Icon } from "./vendor/components/core/Icon";
export { IconButton } from "./vendor/components/core/IconButton";
export { Tag } from "./vendor/components/core/Tag";
export { Wordmark, LogoMark } from "./vendor/components/core/Wordmark";

// ── forms ───────────────────────────────────────────────────────────────────
export { Checkbox } from "./vendor/components/forms/Checkbox";
export { Input } from "./vendor/components/forms/Input";
export { SearchField } from "./vendor/components/forms/SearchField";
export { Select } from "./vendor/components/forms/Select";
export { Switch } from "./vendor/components/forms/Switch";

// ── data ────────────────────────────────────────────────────────────────────
export { ApplicationRow } from "./vendor/components/data/ApplicationRow";
export { ConfidenceMeter } from "./vendor/components/data/ConfidenceMeter";
export { DeadlinePill } from "./vendor/components/data/DeadlinePill";
export { StageBadge, STAGES } from "./vendor/components/data/StageBadge";
export { StatCard } from "./vendor/components/data/StatCard";

// ── navigation ──────────────────────────────────────────────────────────────
export { SidebarNav } from "./vendor/components/navigation/SidebarNav";
export { Tabs } from "./vendor/components/navigation/Tabs";
export { TopBar } from "./vendor/components/navigation/TopBar";

// ── feedback ────────────────────────────────────────────────────────────────
export { Dialog } from "./vendor/components/feedback/Dialog";
export { EmptyState } from "./vendor/components/feedback/EmptyState";
export { Toast } from "./vendor/components/feedback/Toast";
export { Tooltip } from "./vendor/components/feedback/Tooltip";

// ── brand ───────────────────────────────────────────────────────────────────
// Product surfaces never get the mesh (readme.md → Depth). Exported for the
// Connect view and any future marketing surface only.
export { GradientMesh } from "./vendor/components/brand/GradientMesh";

// ── types ───────────────────────────────────────────────────────────────────
export type { ButtonProps } from "./vendor/components/core/Button";
export type { StageBadgeProps } from "./vendor/components/data/StageBadge";
export type { ApplicationRowProps } from "./vendor/components/data/ApplicationRow";
export type { SidebarNavItem, SidebarNavProps } from "./vendor/components/navigation/SidebarNav";
export type { TabItem } from "./vendor/components/navigation/Tabs";
