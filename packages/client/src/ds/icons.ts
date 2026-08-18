import {
  AlertCircle,
  AlertTriangle,
  Archive,
  BookOpen,
  Briefcase,
  CalendarCheck,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FilterX,
  Inbox,
  Info,
  Layers,
  Loader,
  Mail,
  MailCheck,
  MailSearch,
  Moon,
  MoreHorizontal,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Star,
  Sun,
  TrendingDown,
  TriangleAlert,
  WifiOff,
  X,
} from "lucide";

/**
 * Hands the design system's `Icon` its glyph set from the bundled `lucide`
 * package instead of the CDN.
 *
 * `Icon` reads `window.lucide.icons[PascalName]` and only fetches
 * `unpkg.com/lucide` when that is missing. Populating it first means the app
 * has **no runtime network dependency for its own chrome** — which matters
 * because the product ships an offline banner (T5.7), and a banner rendered
 * with a missing icon would be a poor way to announce that you are offline.
 *
 * Named imports, not `import { icons }`: the full set is 2,021 glyphs and cost
 * ~530 kB of the bundle. `icons.test.ts` walks the source for every icon name
 * the app and the design system reference and fails if one is missing here, so
 * trimming the set cannot produce a blank square at runtime.
 */
export const ICONS = {
  AlertCircle,
  AlertTriangle,
  Archive,
  BookOpen,
  Briefcase,
  CalendarCheck,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FilterX,
  Inbox,
  Info,
  Layers,
  Loader,
  Mail,
  MailCheck,
  MailSearch,
  Moon,
  MoreHorizontal,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Star,
  Sun,
  TrendingDown,
  TriangleAlert,
  WifiOff,
  X,
};

declare global {
  interface Window {
    lucide?: { icons: Record<string, unknown> };
  }
}

export function installIcons(): void {
  if (typeof window === "undefined") return;
  if (window.lucide?.icons) return;
  window.lucide = { icons: ICONS as unknown as Record<string, unknown> };
}
