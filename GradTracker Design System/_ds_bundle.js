/* @ds-bundle: {"format":4,"namespace":"GradTrackerDesignSystem_b026b0","components":[{"name":"GradientMesh","sourcePath":"components/brand/GradientMesh.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"LogoMark","sourcePath":"components/core/Wordmark.jsx"},{"name":"Wordmark","sourcePath":"components/core/Wordmark.jsx"},{"name":"ApplicationRow","sourcePath":"components/data/ApplicationRow.jsx"},{"name":"ConfidenceMeter","sourcePath":"components/data/ConfidenceMeter.jsx"},{"name":"DeadlinePill","sourcePath":"components/data/DeadlinePill.jsx"},{"name":"STAGES","sourcePath":"components/data/StageBadge.jsx"},{"name":"StageBadge","sourcePath":"components/data/StageBadge.jsx"},{"name":"StatCard","sourcePath":"components/data/StatCard.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"EmptyState","sourcePath":"components/feedback/EmptyState.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"SearchField","sourcePath":"components/forms/SearchField.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"SidebarNav","sourcePath":"components/navigation/SidebarNav.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"},{"name":"TopBar","sourcePath":"components/navigation/TopBar.jsx"}],"sourceHashes":{"components/brand/GradientMesh.jsx":"b80a35c72403","components/core/Badge.jsx":"48e28870d1c4","components/core/Button.jsx":"56bb563477b0","components/core/Card.jsx":"adb6788ee08b","components/core/Icon.jsx":"33dbfee9d878","components/core/IconButton.jsx":"b6838a763cec","components/core/Tag.jsx":"ece2f5dc1264","components/core/Wordmark.jsx":"030f59ad8f44","components/data/ApplicationRow.jsx":"9958838ce786","components/data/ConfidenceMeter.jsx":"b77b24b1fecb","components/data/DeadlinePill.jsx":"8089afe66400","components/data/StageBadge.jsx":"61c45bff1514","components/data/StatCard.jsx":"f229ae8893f4","components/feedback/Dialog.jsx":"24a81f2c8126","components/feedback/EmptyState.jsx":"f41e0e86afc3","components/feedback/Toast.jsx":"f3d43db870a6","components/feedback/Tooltip.jsx":"ea76522d4714","components/forms/Checkbox.jsx":"0f5e775ceca1","components/forms/Input.jsx":"94d833d3bf25","components/forms/SearchField.jsx":"03e1d581c6e9","components/forms/Select.jsx":"f9598b37925b","components/forms/Switch.jsx":"e1ebccf78261","components/navigation/SidebarNav.jsx":"32e00c5325b5","components/navigation/Tabs.jsx":"8e699fa11dad","components/navigation/TopBar.jsx":"a6f4157249e1","ui_kits/app/AppShell.jsx":"b109fd53762e","ui_kits/app/ConnectView.jsx":"b77ddc799122","ui_kits/app/DetailPanel.jsx":"47aa45ea4b7f","ui_kits/app/PipelineView.jsx":"30a037d94c9c","ui_kits/app/ReviewView.jsx":"20f90b6ae1da","ui_kits/app/SettingsView.jsx":"10677c9f701e","ui_kits/app/data.jsx":"49186a73d638","ui_kits/marketing/FeatureBands.jsx":"69673c77ca61","ui_kits/marketing/LandingHero.jsx":"86d718b88a9a","ui_kits/marketing/LandingPage.jsx":"3aa4395d1e7e","ui_kits/marketing/MockupComposite.jsx":"15532b10830c","ui_kits/marketing/PricingBand.jsx":"4180773c7d0e","ui_kits/marketing/SiteFooter.jsx":"3e2d07b37198","ui_kits/marketing/SiteHeader.jsx":"a1d73b9835e8"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.GradTrackerDesignSystem_b026b0 = window.GradTrackerDesignSystem_b026b0 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/brand/GradientMesh.jsx
try { (() => {
/* The signature atmospheric backdrop: cream -> sherbet -> lavender -> indigo -> pink,
   washed across the upper third of a marketing page. CSS radial-gradient approximation
   of the reference's organic SVG mesh (no mesh asset was supplied). */
function GradientMesh({
  height = 420,
  dark,
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      isolation: "isolate",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    style: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height,
      background: dark ? "var(--mesh-marketing-dark)" : "var(--mesh-marketing)",
      filter: "blur(28px)",
      transform: "translateZ(0)",
      maskImage: "linear-gradient(to bottom, #000 55%, transparent 100%)",
      WebkitMaskImage: "linear-gradient(to bottom, #000 55%, transparent 100%)",
      zIndex: -1,
      pointerEvents: "none"
    }
  }), children);
}
Object.assign(__ds_scope, { GradientMesh });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/GradientMesh.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
const TONES = {
  neutral: {
    background: "var(--surface-sunken)",
    color: "var(--text-muted)",
    border: "var(--border-hairline)"
  },
  indigo: {
    background: "var(--accent-primary-wash)",
    color: "var(--indigo-600)",
    border: "transparent"
  },
  ai: {
    background: "var(--accent-primary-subdued)",
    color: "var(--indigo-700)",
    border: "transparent"
  },
  jade: {
    background: "var(--stage-offer-bg)",
    color: "var(--stage-offer-fg)",
    border: "transparent"
  },
  ruby: {
    background: "var(--stage-rejected-bg)",
    color: "var(--stage-rejected-fg)",
    border: "transparent"
  },
  amber: {
    background: "var(--stage-assessment-bg)",
    color: "var(--stage-assessment-fg)",
    border: "transparent"
  }
};
function Badge({
  children,
  tone = "neutral",
  uppercase = true,
  style
}) {
  const t = TONES[tone] || TONES.neutral;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: "4px 8px",
      borderRadius: "var(--radius-pill)",
      background: t.background,
      color: t.color,
      border: "1px solid " + t.border,
      fontFamily: "var(--font-core)",
      fontSize: uppercase ? "var(--micro-cap-size)" : "var(--micro-size)",
      lineHeight: "var(--micro-cap-lh)",
      letterSpacing: uppercase ? "0.06em" : 0,
      textTransform: uppercase ? "uppercase" : "none",
      fontWeight: "var(--weight-medium)",
      whiteSpace: "nowrap",
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const PAD = {
  none: 0,
  compact: "var(--card-pad-compact)",
  regular: "var(--card-pad)",
  cell: "var(--space-lg)"
};
const SURFACES = {
  card: {
    background: "var(--surface-card)",
    color: "var(--text-body)"
  },
  sunken: {
    background: "var(--surface-sunken)",
    color: "var(--text-body)"
  },
  cream: {
    background: "var(--surface-cream)",
    color: "var(--ink-900)"
  },
  inverse: {
    background: "var(--indigo-900)",
    color: "#ffffff"
  }
};
function Card({
  children,
  surface = "card",
  padding = "regular",
  elevation = 0,
  radius = "lg",
  border = true,
  interactive,
  style,
  onClick,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const shadow = hover && interactive ? "var(--shadow-2)" : elevation === 2 ? "var(--shadow-2)" : elevation === 1 ? "var(--shadow-1)" : "none";
  return /*#__PURE__*/React.createElement("div", _extends({
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      borderRadius: "var(--radius-" + radius + ")",
      padding: PAD[padding],
      border: border ? "1px solid " + (surface === "inverse" ? "rgba(255,255,255,.14)" : "var(--border-hairline)") : "none",
      boxShadow: shadow,
      cursor: interactive ? "pointer" : undefined,
      transition: "box-shadow var(--dur-base) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard)",
      ...SURFACES[surface],
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
/* Lucide (1.75px stroke, 24px grid) is GradTracker's icon set, loaded from CDN.
   No proprietary icon assets were supplied with the brief — see readme.md ICONOGRAPHY. */
const LUCIDE_SRC = "https://unpkg.com/lucide@0.470.0/dist/umd/lucide.min.js";
const waiters = [];
function ensureLucide(cb) {
  if (typeof window === "undefined") return;
  if (window.lucide && window.lucide.icons) return cb();
  waiters.push(cb);
  if (window.__gtLucideLoading) return;
  window.__gtLucideLoading = true;
  const s = document.createElement("script");
  s.src = LUCIDE_SRC;
  s.onload = () => {
    while (waiters.length) waiters.shift()();
  };
  document.head.appendChild(s);
}
function pascal(name) {
  return String(name).replace(/(^|[-_ ])([a-z0-9])/g, (m, a, b) => b.toUpperCase());
}
function camelAttrs(attrs) {
  const out = {};
  Object.keys(attrs || {}).forEach(k => {
    const key = k.replace(/-([a-z])/g, (m, c) => c.toUpperCase());
    out[key] = attrs[k];
  });
  return out;
}
function Icon({
  name,
  size = 16,
  strokeWidth = 1.75,
  color = "currentColor",
  title,
  style,
  className
}) {
  const [, force] = React.useState(0);
  React.useEffect(() => {
    ensureLucide(() => force(n => n + 1));
  }, []);
  const set = typeof window !== "undefined" && window.lucide && window.lucide.icons || null;
  const raw = set ? set[pascal(name)] : null;
  const nodes = !raw ? [] : raw[0] === "svg" ? raw[2] : raw;
  return React.createElement("svg", {
    className,
    role: title ? "img" : "presentation",
    "aria-hidden": title ? undefined : true,
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      flex: "0 0 auto",
      display: "block",
      ...style
    }
  }, title ? React.createElement("title", {
    key: "t"
  }, title) : null, (nodes || []).map((n, i) => React.createElement(n[0], {
    key: i,
    ...camelAttrs(n[1])
  })));
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: {
    padding: "6px 14px",
    fontSize: "var(--button-sm-size)",
    minHeight: 30,
    gap: 6,
    icon: 14
  },
  md: {
    padding: "8px 16px",
    fontSize: "var(--button-md-size)",
    minHeight: 36,
    gap: 8,
    icon: 16
  },
  lg: {
    padding: "11px 20px",
    fontSize: "var(--button-md-size)",
    minHeight: 44,
    gap: 8,
    icon: 16
  }
};
function skin(variant, hover, press) {
  if (variant === "primary") return {
    background: press ? "var(--accent-primary-press)" : hover ? "var(--accent-primary-hover)" : "var(--accent-primary)",
    color: "var(--text-on-primary)",
    border: "1px solid transparent"
  };
  if (variant === "secondary") return {
    background: press ? "var(--accent-primary-wash)" : hover ? "var(--accent-primary-wash)" : "var(--surface-card)",
    color: "var(--accent-primary)",
    border: "1px solid var(--accent-primary)"
  };
  if (variant === "onDark") return {
    background: press ? "#0f1132" : hover ? "#262a68" : "var(--indigo-900)",
    color: "#ffffff",
    border: "1px solid transparent"
  };
  if (variant === "quiet") return {
    background: press ? "var(--surface-selected)" : hover ? "var(--surface-hover)" : "transparent",
    color: "var(--text-secondary)",
    border: "1px solid var(--border-hairline)"
  };
  return {
    background: hover ? "var(--surface-hover)" : "transparent",
    color: "var(--text-secondary)",
    border: "1px solid transparent"
  };
}
function Button({
  children,
  variant = "primary",
  size = "md",
  iconLeft,
  iconRight,
  disabled,
  fullWidth,
  type = "button",
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const s = SIZES[size] || SIZES.md;
  const look = skin(variant, hover && !disabled, press && !disabled);
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setPress(false);
    },
    onMouseDown: () => setPress(true),
    onMouseUp: () => setPress(false),
    style: {
      display: fullWidth ? "flex" : "inline-flex",
      width: fullWidth ? "100%" : undefined,
      alignItems: "center",
      justifyContent: "center",
      gap: s.gap,
      padding: s.padding,
      minHeight: s.minHeight,
      borderRadius: "var(--radius-pill)",
      fontFamily: "var(--font-core)",
      fontSize: s.fontSize,
      fontWeight: "var(--weight-regular)",
      lineHeight: 1,
      letterSpacing: 0,
      fontFeatureSettings: "var(--feature-core)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1,
      transition: "var(--transition-control)",
      ...look,
      ...style
    }
  }, rest), iconLeft ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconLeft,
    size: s.icon
  }) : null, children, iconRight ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconRight,
    size: s.icon
  }) : null);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const BOX = {
  sm: 28,
  md: 32,
  lg: 36
};
function IconButton({
  icon,
  label,
  size = "md",
  variant = "ghost",
  shape = "round",
  active,
  disabled,
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const box = BOX[size] || BOX.md;
  const bg = active ? "var(--surface-selected)" : press ? "var(--surface-selected)" : hover ? "var(--surface-hover)" : variant === "outlined" ? "var(--surface-card)" : "transparent";
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": label,
    title: label,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setPress(false);
    },
    onMouseDown: () => setPress(true),
    onMouseUp: () => setPress(false),
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: box,
      height: box,
      borderRadius: shape === "round" ? "var(--radius-pill)" : "var(--radius-sm)",
      background: bg,
      color: active ? "var(--accent-primary)" : "var(--text-muted)",
      border: variant === "outlined" ? "1px solid var(--border-hairline)" : "1px solid transparent",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1,
      transition: "var(--transition-control)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: size === "sm" ? 14 : 16
  }));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function Tag({
  children,
  icon,
  onRemove,
  selected,
  onClick,
  style
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("span", {
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "5px 10px",
      borderRadius: "var(--radius-pill)",
      background: selected ? "var(--surface-selected)" : hover && onClick ? "var(--surface-hover)" : "var(--surface-card)",
      border: "1px solid " + (selected ? "var(--accent-primary)" : "var(--border-hairline)"),
      color: selected ? "var(--accent-primary)" : "var(--text-secondary)",
      fontSize: "var(--caption-size)",
      letterSpacing: "var(--caption-ls)",
      cursor: onClick ? "pointer" : "default",
      transition: "var(--transition-control)",
      ...style
    }
  }, icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 13
  }) : null, children, onRemove ? /*#__PURE__*/React.createElement("span", {
    onClick: e => {
      e.stopPropagation();
      onRemove(e);
    },
    style: {
      display: "inline-flex",
      cursor: "pointer",
      opacity: 0.6
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 12
  })) : null);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/core/Wordmark.jsx
try { (() => {
/* The GradTracker mark: a navy mortarboard cap over an indigo funnel (the pipeline).
   Source files live in assets/logo/. Never redraw or re-proportion it. */
function LogoMark({
  size = 24,
  tone = "auto",
  title,
  style
}) {
  const cap = tone === "inverse" ? "#f4f8fc" : "var(--text-heading)";
  const funnel = tone === "inverse" ? "#6a53ff" : "var(--accent-primary)";
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 32 32",
    width: size,
    height: size,
    role: title ? "img" : "presentation",
    "aria-hidden": title ? undefined : true,
    style: {
      display: "block",
      flex: "none",
      ...style
    }
  }, title ? /*#__PURE__*/React.createElement("title", null, title) : null, /*#__PURE__*/React.createElement("path", {
    d: "M16 5 30 12 16 19 2 12Z",
    fill: cap
  }), /*#__PURE__*/React.createElement("path", {
    d: "M7.5 15.2v5.6c0 2.6 3.8 4.7 8.5 4.7s8.5-2.1 8.5-4.7v-5.6",
    stroke: funnel,
    strokeWidth: "3.4",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    fill: "none"
  }));
}
function Wordmark({
  size = 20,
  tone = "auto",
  variant = "lockup",
  showDot = false,
  style
}) {
  const color = tone === "inverse" ? "#f4f8fc" : "var(--text-heading)";
  if (variant === "mark") return /*#__PURE__*/React.createElement(LogoMark, {
    size: Math.round(size * 1.45),
    tone: tone,
    title: "GradTracker",
    style: style
  });
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: Math.round(size * 0.36),
      fontFamily: "var(--font-core)",
      fontSize: size,
      lineHeight: 1,
      letterSpacing: size >= 32 ? "-0.035em" : "-0.03em",
      color,
      fontFeatureSettings: "var(--feature-core)",
      whiteSpace: "nowrap",
      ...style
    }
  }, variant === "lockup" ? /*#__PURE__*/React.createElement(LogoMark, {
    size: Math.round(size * 1.45),
    tone: tone,
    title: "GradTracker"
  }) : null, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 300
    }
  }, "Grad"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 500
    }
  }, "Tracker"), showDot ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: tone === "inverse" ? "#6a53ff" : "var(--accent-primary)",
      fontWeight: 500
    }
  }, ".") : null));
}
Object.assign(__ds_scope, { LogoMark, Wordmark });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Wordmark.jsx", error: String((e && e.message) || e) }); }

// components/data/ConfidenceMeter.jsx
try { (() => {
function ConfidenceMeter({
  value = 0,
  showValue = true,
  width = 64,
  label = "AI confidence",
  style
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value * (value <= 1 ? 100 : 1))));
  const fill = pct >= 80 ? "var(--accent-primary)" : pct >= 55 ? "var(--stage-assessment-dot)" : "var(--text-muted)";
  return /*#__PURE__*/React.createElement("span", {
    title: label + ": " + pct + "%",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      width,
      height: 4,
      borderRadius: "var(--radius-pill)",
      background: "var(--border-hairline)",
      overflow: "hidden",
      flex: "0 0 auto"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      inset: 0,
      width: pct + "%",
      background: fill,
      borderRadius: "var(--radius-pill)",
      transition: "width var(--dur-slow) var(--ease-standard)"
    }
  })), showValue ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--micro-size)",
      color: "var(--text-muted)",
      fontFeatureSettings: "var(--feature-numeric)",
      fontVariantNumeric: "tabular-nums"
    }
  }, pct, "%") : null);
}
Object.assign(__ds_scope, { ConfidenceMeter });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/ConfidenceMeter.jsx", error: String((e && e.message) || e) }); }

// components/data/DeadlinePill.jsx
try { (() => {
function DeadlinePill({
  children,
  daysLeft,
  icon = "calendar-clock",
  style
}) {
  const urgent = typeof daysLeft === "number" && daysLeft <= 2;
  const soon = typeof daysLeft === "number" && daysLeft > 2 && daysLeft <= 7;
  const color = urgent ? "var(--stage-rejected-fg)" : soon ? "var(--stage-assessment-fg)" : "var(--text-muted)";
  const bg = urgent ? "var(--stage-rejected-bg)" : soon ? "var(--stage-assessment-bg)" : "transparent";
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: bg === "transparent" ? 0 : "3px 8px",
      borderRadius: "var(--radius-pill)",
      background: bg,
      color,
      fontSize: "var(--body-tabular-size)",
      letterSpacing: "var(--body-tabular-ls)",
      fontFeatureSettings: "var(--feature-numeric)",
      fontVariantNumeric: "tabular-nums",
      whiteSpace: "nowrap",
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 14
  }), children);
}
Object.assign(__ds_scope, { DeadlinePill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/DeadlinePill.jsx", error: String((e && e.message) || e) }); }

// components/data/StageBadge.jsx
try { (() => {
const STAGES = {
  applied: {
    label: "Applied",
    key: "applied"
  },
  assessment: {
    label: "Assessment pending",
    key: "assessment"
  },
  interview: {
    label: "Interview scheduled",
    key: "interview"
  },
  offer: {
    label: "Offer received",
    key: "offer"
  },
  rejected: {
    label: "Rejected",
    key: "rejected"
  },
  withdrawn: {
    label: "Withdrawn",
    key: "withdrawn"
  }
};
function StageBadge({
  stage = "applied",
  size = "md",
  showDot = true,
  label,
  style
}) {
  const s = STAGES[stage] || STAGES.applied;
  const v = part => "var(--stage-" + s.key + "-" + part + ")";
  const sm = size === "sm";
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: sm ? 5 : 6,
      padding: sm ? "3px 8px" : "4px 10px",
      borderRadius: "var(--radius-pill)",
      background: v("bg"),
      color: v("fg"),
      fontFamily: "var(--font-core)",
      fontSize: sm ? "var(--micro-size)" : "var(--caption-size)",
      letterSpacing: sm ? 0 : "var(--caption-ls)",
      fontWeight: "var(--weight-regular)",
      whiteSpace: "nowrap",
      ...style
    }
  }, showDot ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: "var(--radius-pill)",
      background: v("dot"),
      flex: "0 0 auto"
    }
  }) : null, label || s.label);
}
Object.assign(__ds_scope, { STAGES, StageBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/StageBadge.jsx", error: String((e && e.message) || e) }); }

// components/data/ApplicationRow.jsx
try { (() => {
function ApplicationRow({
  company,
  role,
  stage,
  nextAction,
  deadline,
  daysLeft,
  source = "Gmail",
  selected,
  onClick,
  style
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: "grid",
      gridTemplateColumns: "minmax(200px,1.4fr) 170px minmax(160px,1fr) 150px 28px",
      alignItems: "center",
      gap: "var(--space-lg)",
      padding: "var(--cell-pad-y) var(--cell-pad-x)",
      borderBottom: "1px solid var(--border-hairline)",
      background: selected ? "var(--surface-selected)" : hover ? "var(--surface-hover)" : "transparent",
      cursor: "pointer",
      transition: "background-color var(--dur-fast) var(--ease-standard)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 22,
      flex: "0 0 auto",
      borderRadius: "var(--radius-xs)",
      background: "var(--surface-sunken)",
      border: "1px solid var(--border-hairline)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 10,
      color: "var(--text-muted)",
      fontWeight: "var(--weight-medium)"
    }
  }, String(company || "?").slice(0, 1)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--body-md-size)",
      color: "var(--text-heading)",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, company)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--caption-size)",
      letterSpacing: "var(--caption-ls)",
      color: "var(--text-muted)",
      paddingLeft: 30,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, role)), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(__ds_scope.StageBadge, {
    stage: stage
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--body-tabular-size)",
      letterSpacing: "var(--body-tabular-ls)",
      color: "var(--text-secondary)",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, nextAction), /*#__PURE__*/React.createElement("span", null, deadline ? /*#__PURE__*/React.createElement(__ds_scope.DeadlinePill, {
    daysLeft: daysLeft
  }, deadline) : /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-muted)",
      fontSize: "var(--body-tabular-size)"
    }
  }, "\u2014")), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      justifyContent: "flex-end",
      color: hover ? "var(--text-muted)" : "transparent"
    },
    title: "Detected from " + source
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-right",
    size: 16
  })));
}
Object.assign(__ds_scope, { ApplicationRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/ApplicationRow.jsx", error: String((e && e.message) || e) }); }

// components/data/StatCard.jsx
try { (() => {
function StatCard({
  label,
  value,
  delta,
  deltaTone = "neutral",
  icon,
  style
}) {
  const tone = deltaTone === "up" ? "var(--stage-offer-fg)" : deltaTone === "down" ? "var(--stage-rejected-fg)" : "var(--text-muted)";
  return /*#__PURE__*/React.createElement(__ds_scope.Card, {
    padding: "cell",
    elevation: 0,
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8,
      minWidth: 0,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      color: "var(--text-muted)",
      fontSize: "var(--micro-cap-size)",
      letterSpacing: "0.06em",
      textTransform: "uppercase"
    }
  }, icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 13
  }) : null, label), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--display-md-size)",
      lineHeight: "var(--display-md-lh)",
      letterSpacing: "var(--display-md-ls)",
      fontWeight: "var(--weight-thin)",
      color: "var(--text-heading)",
      fontFeatureSettings: "var(--feature-numeric)",
      fontVariantNumeric: "tabular-nums"
    }
  }, value), delta ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--caption-size)",
      letterSpacing: "var(--caption-ls)",
      color: tone,
      fontFeatureSettings: "var(--feature-numeric)"
    }
  }, delta) : null));
}
Object.assign(__ds_scope, { StatCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/StatCard.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
function Dialog({
  open = true,
  title,
  description,
  children,
  footer,
  width = 460,
  onClose,
  style
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      zIndex: 50,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--scrim)",
      padding: "var(--space-xl)",
      backdropFilter: "blur(2px)",
      WebkitBackdropFilter: "blur(2px)"
    },
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    role: "dialog",
    "aria-modal": "true",
    onClick: e => e.stopPropagation(),
    style: {
      width,
      maxWidth: "100%",
      boxSizing: "border-box",
      background: "var(--surface-card)",
      border: "1px solid var(--border-hairline)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-3)",
      padding: "var(--card-pad-compact)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-lg)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: "var(--space-lg)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      flex: 1
    }
  }, title ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--heading-md-size)",
      lineHeight: 1.2,
      letterSpacing: "var(--heading-md-ls)",
      color: "var(--text-heading)"
    }
  }, title) : null, description ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--body-md-size)",
      color: "var(--text-muted)"
    }
  }, description) : null), onClose ? /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "x",
    label: "Close",
    onClick: onClose
  }) : null), children, footer ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "flex-end",
      gap: "var(--space-sm)"
    }
  }, footer) : null));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/EmptyState.jsx
try { (() => {
function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
  compact,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      gap: "var(--space-md)",
      padding: compact ? "var(--space-xxl) var(--space-xl)" : "var(--space-huge) var(--space-xl)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: 44,
      height: 44,
      borderRadius: "var(--radius-pill)",
      background: "var(--accent-primary-wash)",
      color: "var(--accent-primary)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 22
  })), title ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--heading-sm-size)",
      color: "var(--text-heading)"
    }
  }, title) : null, description ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--body-md-size)",
      color: "var(--text-muted)",
      maxWidth: 380
    }
  }, description) : null, action);
}
Object.assign(__ds_scope, { EmptyState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/EmptyState.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
const TONES = {
  info: {
    icon: "info",
    color: "var(--accent-primary)"
  },
  success: {
    icon: "check-circle-2",
    color: "var(--stage-offer-fg)"
  },
  warning: {
    icon: "alert-triangle",
    color: "var(--stage-assessment-fg)"
  },
  error: {
    icon: "alert-circle",
    color: "var(--stage-rejected-fg)"
  }
};
function Toast({
  children,
  tone = "info",
  action,
  onDismiss,
  style
}) {
  const t = TONES[tone] || TONES.info;
  return /*#__PURE__*/React.createElement("div", {
    role: "status",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "var(--space-md)",
      padding: "10px 12px 10px 14px",
      borderRadius: "var(--radius-md)",
      background: "var(--surface-card)",
      border: "1px solid var(--border-hairline)",
      boxShadow: "var(--shadow-2)",
      color: "var(--text-body)",
      fontSize: "var(--body-tabular-size)",
      letterSpacing: "var(--body-tabular-ls)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: t.color,
      display: "flex"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: t.icon,
    size: 16
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, children), action, onDismiss ? /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "x",
    label: "Dismiss",
    size: "sm",
    onClick: onDismiss
  }) : null);
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tooltip.jsx
try { (() => {
function Tooltip({
  label,
  children,
  placement = "top",
  style
}) {
  const [show, setShow] = React.useState(false);
  const pos = placement === "bottom" ? {
    top: "calc(100% + 6px)",
    left: "50%",
    transform: "translateX(-50%)"
  } : {
    bottom: "calc(100% + 6px)",
    left: "50%",
    transform: "translateX(-50%)"
  };
  return /*#__PURE__*/React.createElement("span", {
    onMouseEnter: () => setShow(true),
    onMouseLeave: () => setShow(false),
    style: {
      position: "relative",
      display: "inline-flex",
      ...style
    }
  }, children, show ? /*#__PURE__*/React.createElement("span", {
    role: "tooltip",
    style: {
      position: "absolute",
      zIndex: 40,
      ...pos,
      whiteSpace: "nowrap",
      pointerEvents: "none",
      padding: "5px 8px",
      borderRadius: "var(--radius-xs)",
      background: "var(--indigo-900)",
      color: "#fff",
      fontSize: "var(--micro-size)",
      lineHeight: 1.3,
      boxShadow: "var(--shadow-2)"
    }
  }, label) : null);
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function Checkbox({
  checked,
  onChange,
  label,
  description,
  disabled,
  style
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      alignItems: description ? "flex-start" : "center",
      gap: 10,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: !!checked,
    disabled: disabled,
    onChange: e => onChange && onChange(e.target.checked, e),
    style: {
      position: "absolute",
      opacity: 0,
      width: 0,
      height: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: 18,
      height: 18,
      flex: "0 0 auto",
      marginTop: description ? 1 : 0,
      borderRadius: "var(--radius-xs)",
      color: "#fff",
      background: checked ? "var(--accent-primary)" : "var(--surface-card)",
      border: "1px solid " + (checked ? "var(--accent-primary)" : "var(--border-input)"),
      transition: "var(--transition-control)"
    }
  }, checked ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 12,
    strokeWidth: 2.5
  }) : null), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2
    }
  }, label ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--body-md-size)",
      color: "var(--text-body)"
    }
  }, label) : null, description ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--caption-size)",
      letterSpacing: "var(--caption-ls)",
      color: "var(--text-muted)"
    }
  }, description) : null));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Input({
  label,
  hint,
  error,
  iconLeft,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
  numeric,
  id,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const fid = id || React.useId();
  const border = error ? "var(--ruby)" : focus ? "var(--accent-primary)" : "var(--border-input)";
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: fid,
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      ...style
    }
  }, label ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--caption-size)",
      letterSpacing: "var(--caption-ls)",
      color: "var(--text-secondary)",
      fontWeight: "var(--weight-regular)"
    }
  }, label) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 12px",
      background: disabled ? "var(--surface-sunken)" : "var(--surface-card)",
      border: "1px solid " + border,
      borderRadius: "var(--radius-sm)",
      boxShadow: focus ? "var(--focus-ring)" : "none",
      transition: "var(--transition-control)",
      minHeight: "var(--control-h-lg)",
      boxSizing: "border-box"
    }
  }, iconLeft ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-muted)",
      display: "flex"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconLeft,
    size: 15
  })) : null, /*#__PURE__*/React.createElement("input", _extends({
    id: fid,
    type: type,
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      all: "unset",
      flex: 1,
      minWidth: 0,
      fontFamily: "var(--font-core)",
      fontSize: "var(--body-md-size)",
      fontWeight: "var(--weight-thin)",
      color: "var(--text-body)",
      fontFeatureSettings: numeric ? "var(--feature-numeric)" : "var(--feature-core)",
      fontVariantNumeric: numeric ? "tabular-nums" : undefined
    }
  }, rest))), error || hint ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--micro-size)",
      color: error ? "var(--ruby-deep)" : "var(--text-muted)"
    }
  }, error || hint) : null);
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/SearchField.jsx
try { (() => {
function SearchField({
  value,
  onChange,
  placeholder = "Search applications",
  shortcut = "/",
  width,
  style
}) {
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      width: width || 280,
      boxSizing: "border-box",
      padding: "7px 10px",
      borderRadius: "var(--radius-sm)",
      background: focus ? "var(--surface-card)" : "var(--surface-sunken)",
      border: "1px solid " + (focus ? "var(--accent-primary)" : "var(--border-hairline)"),
      transition: "var(--transition-control)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-muted)",
      display: "flex"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "search",
    size: 15
  })), /*#__PURE__*/React.createElement("input", {
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      all: "unset",
      flex: 1,
      minWidth: 0,
      fontFamily: "var(--font-core)",
      fontSize: "var(--body-tabular-size)",
      fontWeight: "var(--weight-thin)",
      color: "var(--text-body)"
    }
  }), shortcut && !focus ? /*#__PURE__*/React.createElement("kbd", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 10,
      color: "var(--text-muted)",
      border: "1px solid var(--border-hairline)",
      borderRadius: "var(--radius-xs)",
      padding: "1px 5px",
      background: "var(--surface-card)"
    }
  }, shortcut) : null);
}
Object.assign(__ds_scope, { SearchField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SearchField.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function Select({
  label,
  value,
  onChange,
  options = [],
  hint,
  disabled,
  id,
  style
}) {
  const [focus, setFocus] = React.useState(false);
  const fid = id || React.useId();
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: fid,
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      ...style
    }
  }, label ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--caption-size)",
      letterSpacing: "var(--caption-ls)",
      color: "var(--text-secondary)"
    }
  }, label) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center",
      background: disabled ? "var(--surface-sunken)" : "var(--surface-card)",
      border: "1px solid " + (focus ? "var(--accent-primary)" : "var(--border-input)"),
      borderRadius: "var(--radius-sm)",
      minHeight: "var(--control-h-lg)",
      boxSizing: "border-box",
      boxShadow: focus ? "var(--focus-ring)" : "none",
      transition: "var(--transition-control)"
    }
  }, /*#__PURE__*/React.createElement("select", {
    id: fid,
    value: value,
    disabled: disabled,
    onChange: e => onChange && onChange(e.target.value, e),
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      all: "unset",
      flex: 1,
      padding: "8px 32px 8px 12px",
      cursor: "pointer",
      fontFamily: "var(--font-core)",
      fontSize: "var(--body-md-size)",
      fontWeight: "var(--weight-thin)",
      color: "var(--text-body)"
    }
  }, options.map(o => {
    const val = typeof o === "string" ? o : o.value;
    const lbl = typeof o === "string" ? o : o.label;
    return /*#__PURE__*/React.createElement("option", {
      key: val,
      value: val
    }, lbl);
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      right: 10,
      color: "var(--text-muted)",
      pointerEvents: "none",
      display: "flex"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 15
  }))), hint ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--micro-size)",
      color: "var(--text-muted)"
    }
  }, hint) : null);
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
  style
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2
    }
  }, label ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--body-md-size)",
      color: "var(--text-body)"
    }
  }, label) : null, description ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--caption-size)",
      letterSpacing: "var(--caption-ls)",
      color: "var(--text-muted)"
    }
  }, description) : null), /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: !!checked,
    disabled: disabled,
    onChange: e => onChange && onChange(e.target.checked, e),
    style: {
      position: "absolute",
      opacity: 0,
      width: 0,
      height: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      flex: "0 0 auto",
      width: 36,
      height: 20,
      borderRadius: "var(--radius-pill)",
      background: checked ? "var(--accent-primary)" : "var(--border-strong)",
      transition: "background-color var(--dur-base) var(--ease-standard)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 2,
      left: checked ? 18 : 2,
      width: 16,
      height: 16,
      borderRadius: "var(--radius-pill)",
      background: "#fff",
      boxShadow: "var(--shadow-1)",
      transition: "left var(--dur-base) var(--ease-standard)"
    }
  })));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/navigation/SidebarNav.jsx
try { (() => {
function SidebarNav({
  items = [],
  activeId,
  onSelect,
  footer,
  header = true,
  style
}) {
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      width: "var(--sidebar-w)",
      flex: "0 0 auto",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-xl)",
      padding: "var(--space-lg)",
      background: "var(--surface-sunken)",
      borderRight: "1px solid var(--border-hairline)",
      ...style
    }
  }, header ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "6px 8px"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Wordmark, {
    size: 19
  })) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2
    }
  }, items.map(it => {
    if (it.section) return /*#__PURE__*/React.createElement("div", {
      key: it.section,
      style: {
        padding: "14px 8px 6px",
        fontSize: "var(--micro-cap-size)",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--text-muted)"
      }
    }, it.section);
    const active = it.id === activeId;
    return /*#__PURE__*/React.createElement(SidebarItem, {
      key: it.id,
      item: it,
      active: active,
      onSelect: onSelect
    });
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "auto"
    }
  }, footer));
}
function SidebarItem({
  item,
  active,
  onSelect
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => onSelect && onSelect(item.id),
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      all: "unset",
      boxSizing: "border-box",
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "8px 8px",
      borderRadius: "var(--radius-sm)",
      cursor: "pointer",
      background: active ? "var(--surface-card)" : hover ? "var(--surface-hover)" : "transparent",
      boxShadow: active ? "var(--shadow-1)" : "none",
      color: active ? "var(--text-heading)" : "var(--text-nav)",
      fontFamily: "var(--font-core)",
      fontSize: "var(--body-tabular-size)",
      fontWeight: active ? "var(--weight-regular)" : "var(--weight-thin)",
      letterSpacing: "var(--body-tabular-ls)",
      transition: "var(--transition-control)"
    }
  }, item.icon ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      color: active ? "var(--accent-primary)" : "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: item.icon,
    size: 16
  })) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, item.label), item.count != null ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--micro-size)",
      color: "var(--text-muted)",
      fontFeatureSettings: "var(--feature-numeric)",
      fontVariantNumeric: "tabular-nums"
    }
  }, item.count) : null);
}
Object.assign(__ds_scope, { SidebarNav });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/SidebarNav.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function Tabs({
  tabs = [],
  activeId,
  onSelect,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    role: "tablist",
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-xl)",
      borderBottom: "1px solid var(--border-hairline)",
      ...style
    }
  }, tabs.map(t => {
    const active = t.id === activeId;
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      role: "tab",
      "aria-selected": active,
      onClick: () => onSelect && onSelect(t.id),
      style: {
        all: "unset",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "10px 0",
        marginBottom: -1,
        borderBottom: "2px solid " + (active ? "var(--accent-primary)" : "transparent"),
        color: active ? "var(--text-heading)" : "var(--text-muted)",
        fontFamily: "var(--font-core)",
        fontSize: "var(--body-tabular-size)",
        letterSpacing: "var(--body-tabular-ls)",
        transition: "var(--transition-control)"
      }
    }, t.label, t.count != null ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: "var(--micro-size)",
        color: "var(--text-muted)",
        fontVariantNumeric: "tabular-nums"
      }
    }, t.count) : null);
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/navigation/TopBar.jsx
try { (() => {
function TopBar({
  title,
  subtitle,
  children,
  sticky = true,
  style
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: sticky ? "sticky" : "static",
      top: 0,
      zIndex: 5,
      boxSizing: "border-box",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "var(--space-lg)",
      minHeight: "var(--topbar-h)",
      padding: "10px var(--space-xl)",
      background: "var(--surface-page)",
      borderBottom: "1px solid var(--border-hairline)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 1,
      minWidth: 0
    }
  }, title ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--heading-md-size)",
      lineHeight: 1.2,
      letterSpacing: "var(--heading-md-ls)",
      fontWeight: "var(--weight-thin)",
      color: "var(--text-heading)"
    }
  }, title) : null, subtitle ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--caption-size)",
      letterSpacing: "var(--caption-ls)",
      color: "var(--text-muted)"
    }
  }, subtitle) : null), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-sm)"
    }
  }, children));
}
Object.assign(__ds_scope, { TopBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/TopBar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/AppShell.jsx
try { (() => {
const {
  SidebarNav,
  TopBar,
  SearchField,
  Button,
  IconButton,
  Dialog,
  Toast,
  Card,
  Badge,
  Icon,
  Wordmark
} = window.GradTrackerDesignSystem_b026b0;
function AppShell() {
  const [view, setView] = React.useState("connect");
  const [theme, setTheme] = React.useState("light");
  const [apps, setApps] = React.useState(window.APPLICATIONS);
  const [queue, setQueue] = React.useState(window.REVIEW_QUEUE);
  const [selected, setSelected] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const [confirmWithdraw, setConfirmWithdraw] = React.useState(false);
  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);
  }, [theme]);
  const flash = (msg, tone) => {
    setToast({
      msg,
      tone: tone || "success"
    });
    window.clearTimeout(window.__gtT);
    window.__gtT = window.setTimeout(() => setToast(null), 3200);
  };
  if (view === "connect") return /*#__PURE__*/React.createElement("div", {
    "data-theme": theme,
    style: {
      height: "100%",
      background: "var(--surface-sunken)"
    }
  }, /*#__PURE__*/React.createElement(ConnectView, {
    onConnect: () => {
      setView("pipeline");
      flash("Gmail connected · 23 applications found");
    }
  }));
  const titles = {
    pipeline: ["Pipeline", "Synced 4 minutes ago · " + apps.length + " live"],
    review: ["Needs review", queue.length + " emails GradTracker isn't sure about"],
    settings: ["Settings", "Detection, reminders, and profile"],
    calendar: ["Calendar", "Interviews and deadlines"],
    archive: ["Archive", "Closed applications"]
  };
  const [title, subtitle] = titles[view] || titles.pipeline;
  return /*#__PURE__*/React.createElement("div", {
    "data-theme": theme,
    style: {
      display: "flex",
      height: "100%",
      background: "var(--surface-page)",
      color: "var(--text-body)",
      position: "relative",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement(SidebarNav, {
    activeId: view,
    onSelect: id => {
      setView(id);
      setSelected(null);
    },
    items: [{
      id: "pipeline",
      label: "Pipeline",
      icon: "layers",
      count: apps.length
    }, {
      id: "calendar",
      label: "Calendar",
      icon: "calendar-days"
    }, {
      section: "Inbox"
    }, {
      id: "review",
      label: "Needs review",
      icon: "sparkles",
      count: queue.length
    }, {
      id: "archive",
      label: "Archive",
      icon: "archive",
      count: 61
    }, {
      section: "Account"
    }, {
      id: "settings",
      label: "Settings",
      icon: "settings"
    }],
    footer: /*#__PURE__*/React.createElement(Card, {
      padding: "cell",
      surface: "card",
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 26,
        height: 26,
        borderRadius: 99,
        background: "var(--accent-primary)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11,
        flex: "0 0 auto"
      }
    }, "AS"), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: "var(--caption-size)",
        color: "var(--text-heading)",
        overflow: "hidden",
        textOverflow: "ellipsis"
      }
    }, "Ana Silva"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: "var(--micro-size)",
        color: "var(--text-muted)"
      }
    }, "Manchester \xB7 2027")), /*#__PURE__*/React.createElement(IconButton, {
      icon: theme === "light" ? "moon" : "sun",
      label: "Toggle theme",
      size: "sm",
      onClick: () => setTheme(theme === "light" ? "dark" : "light")
    }))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    title: title,
    subtitle: subtitle
  }, /*#__PURE__*/React.createElement(SearchField, {
    width: 220
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "bell",
    label: "Notifications",
    variant: "outlined",
    shape: "square"
  }), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    iconLeft: "sparkles",
    onClick: () => flash("Scanned 18 new emails · 2 look like applications", "info")
  }, "Scan inbox")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      overflowY: "auto"
    }
  }, view === "pipeline" ? /*#__PURE__*/React.createElement(PipelineView, {
    apps: apps,
    selectedId: selected && selected.id,
    onOpen: setSelected
  }) : null, view === "review" ? /*#__PURE__*/React.createElement(ReviewView, {
    queue: queue,
    onConfirm: id => {
      setQueue(q => q.filter(x => x.id !== id));
      flash("Added to your pipeline");
    },
    onDismiss: id => {
      setQueue(q => q.filter(x => x.id !== id));
      flash("Dismissed · we won't ask again", "info");
    }
  }) : null, view === "settings" ? /*#__PURE__*/React.createElement(SettingsView, null) : null, view === "calendar" || view === "archive" ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--space-huge) var(--section-pad-app)",
      color: "var(--text-muted)",
      fontSize: "var(--body-md-size)",
      display: "flex",
      gap: 10,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "construction",
    size: 18
  }), " Not part of the supplied brief \u2014 intentionally left blank.") : null), selected && view === "pipeline" ? /*#__PURE__*/React.createElement(DetailPanel, {
    app: selected,
    onClose: () => setSelected(null),
    onStageChange: () => flash("Stage updated"),
    onWithdraw: () => setConfirmWithdraw(true)
  }) : null)), /*#__PURE__*/React.createElement(Dialog, {
    open: confirmWithdraw,
    title: "Withdraw this application?",
    description: "It moves to Withdrawn and drops out of your ranked pipeline. Nothing is deleted.",
    onClose: () => setConfirmWithdraw(false),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      size: "sm",
      onClick: () => setConfirmWithdraw(false)
    }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      onClick: () => {
        setApps(a => a.map(x => x.id === selected.id ? {
          ...x,
          stage: "withdrawn",
          nextAction: "—"
        } : x));
        setConfirmWithdraw(false);
        setSelected(null);
        flash("Moved to Withdrawn");
      }
    }, "Withdraw"))
  }), toast ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 24,
      bottom: 24,
      zIndex: 60
    }
  }, /*#__PURE__*/React.createElement(Toast, {
    tone: toast.tone,
    onDismiss: () => setToast(null)
  }, toast.msg)) : null);
}
Object.assign(window, {
  AppShell
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/AppShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/ConnectView.jsx
try { (() => {
const {
  Card,
  Button,
  Wordmark,
  Icon,
  Checkbox,
  Badge
} = window.GradTrackerDesignSystem_b026b0;
function ConnectView({
  onConnect
}) {
  const [ok, setOk] = React.useState(true);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "var(--space-huge) var(--space-xl)",
      background: "var(--surface-sunken)"
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padding: "regular",
    elevation: 2,
    style: {
      width: 420,
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-xl)"
    }
  }, /*#__PURE__*/React.createElement(Wordmark, {
    size: 22
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-sm)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--display-md-size)",
      lineHeight: "var(--display-md-lh)",
      letterSpacing: "var(--display-md-ls)",
      fontWeight: 300,
      color: "var(--text-heading)"
    }
  }, "Connect Gmail to build your pipeline"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--body-md-size)",
      color: "var(--text-muted)"
    }
  }, "It takes about a minute. GradTracker only reads mail \u2014 it never sends anything on your behalf.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-md)"
    }
  }, [["mail-search", "Finds application emails across every job board"], ["wand-sparkles", "Extracts company, role, stage, and deadline"], ["lock", "Read-only access you can revoke any time"]].map(([icon, text]) => /*#__PURE__*/React.createElement("span", {
    key: text,
    style: {
      display: "flex",
      gap: 10,
      alignItems: "flex-start",
      fontSize: "var(--body-tabular-size)",
      letterSpacing: "var(--body-tabular-ls)",
      color: "var(--text-secondary)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--accent-primary)",
      display: "flex",
      marginTop: 1
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 15
  })), text))), /*#__PURE__*/React.createElement(Checkbox, {
    checked: ok,
    onChange: setOk,
    label: "I understand GradTracker reads my inbox",
    description: "Only emails it identifies as applications are stored."
  }), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    fullWidth: true,
    iconLeft: "mail",
    disabled: !ok,
    onClick: onConnect
  }, "Continue with Google"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontSize: "var(--micro-size)",
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "neutral"
  }, "Student"), " Free while you're at university.")));
}
Object.assign(window, {
  ConnectView
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/ConnectView.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/DetailPanel.jsx
try { (() => {
const {
  StageBadge,
  DeadlinePill,
  Badge,
  Button,
  IconButton,
  Select,
  ConfidenceMeter,
  Card,
  Tooltip
} = window.GradTrackerDesignSystem_b026b0;
function DetailPanel({
  app,
  onClose,
  onStageChange,
  onWithdraw
}) {
  if (!app) return null;
  const labels = {
    applied: "Applied",
    assessment: "Assessment pending",
    interview: "Interview scheduled",
    offer: "Offer received",
    rejected: "Rejected",
    withdrawn: "Withdrawn"
  };
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 380,
      flex: "0 0 auto",
      boxSizing: "border-box",
      height: "100%",
      overflowY: "auto",
      borderLeft: "1px solid var(--border-hairline)",
      background: "var(--surface-card)",
      padding: "var(--space-xl)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-xl)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: "var(--space-md)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--heading-lg-size)",
      lineHeight: "var(--heading-lg-lh)",
      letterSpacing: "var(--heading-lg-ls)",
      color: "var(--text-heading)"
    }
  }, app.company), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--body-md-size)",
      color: "var(--text-muted)"
    }
  }, app.role), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginTop: 4,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement(StageBadge, {
    stage: app.stage
  }), /*#__PURE__*/React.createElement(Tooltip, {
    label: "Detected from a " + app.source + " email"
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "ai"
  }, "AI detected")))), /*#__PURE__*/React.createElement(IconButton, {
    icon: "x",
    label: "Close panel",
    onClick: onClose
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-md)"
    }
  }, /*#__PURE__*/React.createElement(Select, {
    label: "Stage",
    value: labels[app.stage],
    onChange: onStageChange,
    options: Object.values(labels)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-sm)"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    iconLeft: "check",
    style: {
      flex: 1
    }
  }, "Mark action done"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "quiet",
    iconLeft: "bell",
    style: {
      flex: 1
    }
  }, "Remind me"))), /*#__PURE__*/React.createElement(Card, {
    surface: "sunken",
    padding: "cell",
    border: false,
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-md)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--micro-cap-size)",
      letterSpacing: ".08em",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, "Extracted fields"), [["Next action", app.nextAction, app.confidence], ["Deadline", app.deadline ? app.deadline + " · 23:59" : "None found", app.confidence - 0.1], ["Salary", app.salary, app.confidence - 0.05], ["Location", app.location, app.confidence - 0.2]].map(([k, v, c]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--caption-size)",
      letterSpacing: "var(--caption-ls)",
      color: "var(--text-muted)",
      width: 92,
      flex: "0 0 auto"
    }
  }, k), /*#__PURE__*/React.createElement("span", {
    className: "gt-num",
    style: {
      flex: 1,
      fontSize: "var(--body-tabular-size)",
      color: "var(--text-body)"
    }
  }, v), /*#__PURE__*/React.createElement(ConfidenceMeter, {
    value: Math.max(0.2, c),
    showValue: false,
    width: 40
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-md)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--micro-cap-size)",
      letterSpacing: ".08em",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, "Timeline"), app.timeline.map(([date, text], i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      gap: "var(--space-md)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "gt-num",
    style: {
      width: 52,
      flex: "0 0 auto",
      fontSize: "var(--caption-size)",
      color: "var(--text-muted)"
    }
  }, date), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      width: 1,
      background: "var(--border-hairline)",
      flex: "0 0 auto"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 5,
      left: -2.5,
      width: 6,
      height: 6,
      borderRadius: 99,
      background: i === app.timeline.length - 1 ? "var(--accent-primary)" : "var(--border-strong)"
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--body-tabular-size)",
      letterSpacing: "var(--body-tabular-ls)",
      color: "var(--text-secondary)",
      paddingLeft: 8
    }
  }, text)))), app.deadline ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(DeadlinePill, {
    daysLeft: app.daysLeft
  }, app.daysLeft <= 2 ? "Due in " + app.daysLeft + " days" : app.deadline)) : null, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm",
    iconLeft: "circle-slash",
    onClick: onWithdraw,
    style: {
      alignSelf: "flex-start"
    }
  }, "Withdraw application"));
}
Object.assign(window, {
  DetailPanel
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/DetailPanel.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/PipelineView.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  StatCard,
  ApplicationRow,
  Card,
  Tabs,
  Tag,
  EmptyState,
  Button
} = window.GradTrackerDesignSystem_b026b0;
function PipelineView({
  apps,
  onOpen,
  selectedId
}) {
  const [tab, setTab] = React.useState("all");
  const [filter, setFilter] = React.useState(null);
  const active = ["applied", "assessment", "interview"];
  let rows = apps;
  if (tab === "active") rows = apps.filter(a => active.includes(a.stage));
  if (tab === "waiting") rows = apps.filter(a => a.stage === "applied" || a.stage === "assessment");
  if (tab === "closed") rows = apps.filter(a => ["rejected", "withdrawn", "offer"].includes(a.stage));
  if (filter) rows = rows.filter(a => a.stage === filter);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--space-xl) var(--section-pad-app) var(--space-huge)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-xl)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4,1fr)",
      gap: "var(--space-md)"
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    label: "Live applications",
    value: "23",
    delta: "+3 this week",
    deltaTone: "up",
    icon: "layers"
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "Needs action",
    value: "6",
    delta: "2 due in 48h",
    deltaTone: "down",
    icon: "alarm-clock"
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "Interviews",
    value: "4",
    delta: "+1 this week",
    deltaTone: "up",
    icon: "calendar-check"
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "Response rate",
    value: "38%",
    delta: "-4 pts",
    deltaTone: "down",
    icon: "trending-down"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-lg)"
    }
  }, /*#__PURE__*/React.createElement(Tabs, {
    activeId: tab,
    onSelect: setTab,
    tabs: [{
      id: "all",
      label: "All",
      count: apps.length
    }, {
      id: "active",
      label: "Active",
      count: apps.filter(a => active.includes(a.stage)).length
    }, {
      id: "waiting",
      label: "Waiting on them",
      count: apps.filter(a => ["applied", "assessment"].includes(a.stage)).length
    }, {
      id: "closed",
      label: "Closed",
      count: apps.filter(a => ["rejected", "withdrawn", "offer"].includes(a.stage)).length
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-sm)",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--micro-cap-size)",
      letterSpacing: ".08em",
      textTransform: "uppercase",
      color: "var(--text-muted)",
      marginRight: 4
    }
  }, "Stage"), [["interview", "Interview"], ["assessment", "Assessment"], ["offer", "Offer"], ["rejected", "Rejected"]].map(([k, l]) => /*#__PURE__*/React.createElement(Tag, {
    key: k,
    selected: filter === k,
    onClick: () => setFilter(filter === k ? null : k)
  }, l)), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--caption-size)",
      letterSpacing: "var(--caption-ls)",
      color: "var(--text-muted)"
    }
  }, "Ranked by what's due next")), /*#__PURE__*/React.createElement(Card, {
    padding: "none",
    style: {
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "minmax(200px,1.4fr) 170px minmax(160px,1fr) 150px 28px",
      gap: "var(--space-lg)",
      padding: "8px var(--cell-pad-x)",
      background: "var(--surface-sunken)",
      borderBottom: "1px solid var(--border-hairline)",
      fontSize: "var(--micro-cap-size)",
      letterSpacing: ".08em",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement("span", null, "Company & role"), /*#__PURE__*/React.createElement("span", null, "Stage"), /*#__PURE__*/React.createElement("span", null, "Next action"), /*#__PURE__*/React.createElement("span", null, "Deadline"), /*#__PURE__*/React.createElement("span", null)), rows.length ? rows.map(a => /*#__PURE__*/React.createElement(ApplicationRow, _extends({
    key: a.id
  }, a, {
    selected: a.id === selectedId,
    onClick: () => onOpen(a)
  }))) : /*#__PURE__*/React.createElement(EmptyState, {
    compact: true,
    icon: "filter-x",
    title: "Nothing in this view",
    description: "Clear the stage filter to see the rest of your pipeline.",
    action: /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "sm",
      onClick: () => setFilter(null)
    }, "Clear filter")
  }))));
}
Object.assign(window, {
  PipelineView
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/PipelineView.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/ReviewView.jsx
try { (() => {
const {
  Card,
  Badge,
  Button,
  ConfidenceMeter,
  StageBadge,
  EmptyState,
  Tooltip,
  IconButton
} = window.GradTrackerDesignSystem_b026b0;
function ReviewView({
  queue,
  onConfirm,
  onDismiss
}) {
  if (!queue.length) return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--space-xl) var(--section-pad-app)"
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padding: "none"
  }, /*#__PURE__*/React.createElement(EmptyState, {
    icon: "mail-check",
    title: "Inbox is clear",
    description: "Everything GradTracker detected has been confirmed. We'll scan again in 15 minutes.",
    action: /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "sm",
      iconLeft: "refresh-cw"
    }, "Scan now")
  })));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--space-xl) var(--section-pad-app) var(--space-huge)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-lg)",
      maxWidth: 880
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "var(--body-md-size)",
      color: "var(--text-muted)",
      maxWidth: 560
    }
  }, "These emails look like applications. Confirm what GradTracker read, or dismiss the ones that aren't."), queue.map(item => /*#__PURE__*/React.createElement(Card, {
    key: item.id,
    padding: "compact",
    elevation: 1,
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-lg)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: "var(--space-md)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--heading-sm-size)",
      color: "var(--text-heading)"
    }
  }, item.subject), /*#__PURE__*/React.createElement("span", {
    className: "gt-num",
    style: {
      fontSize: "var(--caption-size)",
      letterSpacing: "var(--caption-ls)",
      color: "var(--text-muted)"
    }
  }, item.from, " \xB7 ", item.received)), /*#__PURE__*/React.createElement(Tooltip, {
    label: "How sure the model is about this email"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "ai"
  }, "AI"), /*#__PURE__*/React.createElement(ConfidenceMeter, {
    value: item.confidence
  }))), /*#__PURE__*/React.createElement(IconButton, {
    icon: "external-link",
    label: "Open in Gmail"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(2,1fr)",
      gap: "var(--space-md) var(--space-xl)"
    }
  }, item.fields.map(([k, v, c]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-md)",
      paddingBottom: 8,
      borderBottom: "1px solid var(--border-hairline)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 74,
      flex: "0 0 auto",
      fontSize: "var(--caption-size)",
      letterSpacing: "var(--caption-ls)",
      color: "var(--text-muted)"
    }
  }, k), /*#__PURE__*/React.createElement("span", {
    className: "gt-num",
    style: {
      flex: 1,
      fontSize: "var(--body-tabular-size)",
      color: "var(--text-body)"
    }
  }, v), c < 0.55 ? /*#__PURE__*/React.createElement(Badge, {
    tone: "amber",
    uppercase: false
  }, "Needs review") : /*#__PURE__*/React.createElement(ConfidenceMeter, {
    value: c,
    showValue: false,
    width: 36
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-sm)"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    iconLeft: "check",
    onClick: () => onConfirm(item.id)
  }, "Add to pipeline"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "quiet",
    iconLeft: "pencil"
  }, "Edit fields"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "ghost",
    onClick: () => onDismiss(item.id)
  }, "Not an application"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(StageBadge, {
    stage: item.fields[2][1].toLowerCase().indexOf("interview") === 0 ? "interview" : item.fields[2][1].toLowerCase().indexOf("assessment") === 0 ? "assessment" : "applied",
    size: "sm"
  })))));
}
Object.assign(window, {
  ReviewView
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/ReviewView.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/SettingsView.jsx
try { (() => {
const {
  Card,
  Switch,
  Button,
  Badge,
  Input,
  Select,
  Checkbox,
  Icon,
  Toast
} = window.GradTrackerDesignSystem_b026b0;
function SettingsView() {
  const [auto, setAuto] = React.useState(true);
  const [digest, setDigest] = React.useState(true);
  const [urgent, setUrgent] = React.useState(true);
  const [cal, setCal] = React.useState(false);
  const [freq, setFreq] = React.useState("Every 15 minutes");
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--space-xl) var(--section-pad-app) var(--space-huge)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-xl)",
      maxWidth: 720
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padding: "compact",
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-lg)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 40,
      height: 40,
      borderRadius: "var(--radius-pill)",
      background: "var(--accent-primary-wash)",
      color: "var(--accent-primary)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flex: "0 0 auto"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "mail",
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      gap: 3
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--heading-sm-size)",
      color: "var(--text-heading)"
    }
  }, "ana.silva@uni.ac.uk"), /*#__PURE__*/React.createElement("span", {
    className: "gt-num",
    style: {
      fontSize: "var(--caption-size)",
      letterSpacing: "var(--caption-ls)",
      color: "var(--text-muted)"
    }
  }, "Read-only Gmail access \xB7 last scan 4 minutes ago \xB7 612 emails read")), /*#__PURE__*/React.createElement(Badge, {
    tone: "jade"
  }, "Connected"), /*#__PURE__*/React.createElement(Button, {
    variant: "quiet",
    size: "sm"
  }, "Disconnect")), /*#__PURE__*/React.createElement(Card, {
    padding: "compact",
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-lg)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--micro-cap-size)",
      letterSpacing: ".08em",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, "Detection"), /*#__PURE__*/React.createElement(Switch, {
    checked: auto,
    onChange: setAuto,
    label: "Auto-detect applications",
    description: "GradTracker reads new mail and files it into your pipeline."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: "var(--border-hairline)"
    }
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Scan frequency",
    value: freq,
    onChange: setFreq,
    options: ["Every 15 minutes", "Hourly", "Twice a day", "Manually only"],
    style: {
      maxWidth: 260
    }
  }), /*#__PURE__*/React.createElement(Checkbox, {
    checked: true,
    label: "Ask before adding low-confidence matches",
    description: "Anything under 55% confidence waits in Needs review."
  })), /*#__PURE__*/React.createElement(Card, {
    padding: "compact",
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-lg)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--micro-cap-size)",
      letterSpacing: ".08em",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, "Reminders"), /*#__PURE__*/React.createElement(Switch, {
    checked: digest,
    onChange: setDigest,
    label: "Morning digest",
    description: "One email at 08:00 with what's due today."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: "var(--border-hairline)"
    }
  }), /*#__PURE__*/React.createElement(Switch, {
    checked: urgent,
    onChange: setUrgent,
    label: "Deadline alerts",
    description: "A nudge 48 hours before anything closes."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: "var(--border-hairline)"
    }
  }), /*#__PURE__*/React.createElement(Switch, {
    checked: cal,
    onChange: setCal,
    label: "Add interviews to Google Calendar",
    description: "Creates a calendar event when an interview is confirmed."
  })), /*#__PURE__*/React.createElement(Card, {
    padding: "compact",
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-lg)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--micro-cap-size)",
      letterSpacing: ".08em",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, "Profile"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "var(--space-lg)"
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Name",
    value: "Ana Silva"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "University",
    value: "University of Manchester"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Graduating",
    numeric: true,
    value: "June 2027"
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Looking for",
    value: "Internships & graduate roles",
    options: ["Internships & graduate roles", "Internships only", "Graduate roles only"]
  }))), /*#__PURE__*/React.createElement(Toast, {
    tone: "info"
  }, "Changes save as you make them."));
}
Object.assign(window, {
  SettingsView
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/SettingsView.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/data.jsx
try { (() => {
const APPLICATIONS = [{
  id: "monzo",
  company: "Monzo",
  role: "Backend Engineering Intern",
  stage: "interview",
  nextAction: "Confirm Thursday 14:00 slot",
  deadline: "14 Sep",
  daysLeft: 2,
  salary: "£38,000",
  location: "London · Hybrid",
  source: "Greenhouse",
  confidence: 0.96,
  score: 94,
  timeline: [["11 Aug", "Applied via Monzo careers"], ["27 Aug", "Online assessment passed"], ["09 Sep", "Interview invitation received"]]
}, {
  id: "arup",
  company: "Arup",
  role: "Graduate Structural Engineer",
  stage: "assessment",
  nextAction: "Finish numerical test",
  deadline: "19 Sep",
  daysLeft: 7,
  salary: "£31,500",
  location: "Manchester · On-site",
  source: "Workday",
  confidence: 0.88,
  score: 87,
  timeline: [["02 Sep", "Applied via Workday"], ["08 Sep", "Numerical test link sent"]]
}, {
  id: "deloitte",
  company: "Deloitte",
  role: "Audit Graduate Scheme",
  stage: "applied",
  nextAction: "Wait for screening",
  deadline: null,
  daysLeft: null,
  salary: "£33,000",
  location: "Birmingham · Hybrid",
  source: "Gmail",
  confidence: 0.74,
  score: 71,
  timeline: [["29 Aug", "Application submitted"]]
}, {
  id: "revolut",
  company: "Revolut",
  role: "Product Analyst Intern",
  stage: "offer",
  nextAction: "Reply by 22 Sep",
  deadline: "22 Sep",
  daysLeft: 10,
  salary: "£42,000",
  location: "London · On-site",
  source: "Greenhouse",
  confidence: 0.98,
  score: 99,
  timeline: [["14 Jul", "Applied"], ["03 Aug", "Two interviews completed"], ["11 Sep", "Offer received"]]
}, {
  id: "nhs",
  company: "NHS Digital",
  role: "Data Science Placement",
  stage: "assessment",
  nextAction: "Book assessment centre",
  deadline: "16 Sep",
  daysLeft: 4,
  salary: "£29,800",
  location: "Leeds · Hybrid",
  source: "Gmail",
  confidence: 0.81,
  score: 78,
  timeline: [["21 Aug", "Applied"], ["05 Sep", "Invited to assessment centre"]]
}, {
  id: "ocado",
  company: "Ocado Technology",
  role: "Software Engineer Grad",
  stage: "rejected",
  nextAction: "Ask for feedback",
  deadline: null,
  daysLeft: null,
  salary: "£40,000",
  location: "Hatfield · Hybrid",
  source: "Lever",
  confidence: 0.91,
  score: 32,
  timeline: [["04 Aug", "Applied"], ["30 Aug", "Rejected after tech screen"]]
}, {
  id: "pwc",
  company: "PwC",
  role: "Technology Consulting Grad",
  stage: "withdrawn",
  nextAction: "—",
  deadline: null,
  daysLeft: null,
  salary: "£35,000",
  location: "London · Hybrid",
  source: "Gmail",
  confidence: 0.69,
  score: 12,
  timeline: [["19 Jul", "Applied"], ["25 Aug", "Withdrawn — accepted other process"]]
}, {
  id: "bloomberg",
  company: "Bloomberg",
  role: "Engineering Summer Intern",
  stage: "applied",
  nextAction: "Wait for screening",
  deadline: "30 Sep",
  daysLeft: 18,
  salary: "£45,000",
  location: "London · On-site",
  source: "Gmail",
  confidence: 0.86,
  score: 64,
  timeline: [["09 Sep", "Applied via referral"]]
}];
const REVIEW_QUEUE = [{
  id: "r1",
  subject: "Your application to Stripe — next steps",
  from: "no-reply@greenhouse.io",
  received: "12 minutes ago",
  confidence: 0.93,
  fields: [["Company", "Stripe", 0.97], ["Role", "Payments Engineering Intern", 0.9], ["Stage", "Assessment pending", 0.86], ["Deadline", "21 Sep, 23:59", 0.79]]
}, {
  id: "r2",
  subject: "Interview confirmation — Wednesday",
  from: "talent@wise.com",
  received: "1 hour ago",
  confidence: 0.71,
  fields: [["Company", "Wise", 0.95], ["Role", "Graduate Data Analyst", 0.68], ["Stage", "Interview scheduled", 0.88], ["Deadline", "18 Sep, 10:30", 0.52]]
}, {
  id: "r3",
  subject: "Thanks for applying to Octopus Energy",
  from: "careers@octopus.energy",
  received: "3 hours ago",
  confidence: 0.64,
  fields: [["Company", "Octopus Energy", 0.94], ["Role", "Grad Software Engineer", 0.6], ["Stage", "Applied", 0.83], ["Deadline", "—", 0.2]]
}];
Object.assign(window, {
  APPLICATIONS,
  REVIEW_QUEUE
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/data.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/FeatureBands.jsx
try { (() => {
const {
  Card,
  Icon,
  Badge,
  StageBadge,
  Button
} = window.GradTrackerDesignSystem_b026b0;
function FeatureBands() {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--surface-sunken)",
      borderTop: "1px solid var(--border-hairline)",
      borderBottom: "1px solid var(--border-hairline)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container-max)",
      margin: "0 auto",
      padding: "var(--section-pad-marketing) var(--space-xl)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-xxl)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-md)",
      maxWidth: 620
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--micro-cap-size)",
      letterSpacing: ".08em",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, "How it works"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: "var(--display-xl-size)",
      lineHeight: "var(--display-xl-lh)",
      letterSpacing: "var(--display-xl-ls)",
      fontWeight: 300,
      color: "var(--text-heading)"
    }
  }, "Three things happen the minute you connect.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      gap: "var(--space-xl)"
    }
  }, [["mail-search", "It finds the applications", "Greenhouse, Workday, Lever, or a recruiter typing by hand — the model reads them all and ignores the newsletters."], ["wand-sparkles", "It extracts the details", "Company, role, stage, deadline, and the single next action, each with a confidence score you can check."], ["list-ordered", "It ranks what matters", "Your pipeline sorts by what closes soonest, so the top row is always the thing to do today."]].map(([icon, title, body]) => /*#__PURE__*/React.createElement(Card, {
    key: title,
    padding: "regular",
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-md)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 36,
      height: 36,
      borderRadius: "var(--radius-pill)",
      background: "var(--accent-primary-wash)",
      color: "var(--accent-primary)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 18
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--display-md-size)",
      lineHeight: "var(--display-md-lh)",
      letterSpacing: "var(--display-md-ls)",
      fontWeight: 300,
      color: "var(--text-heading)"
    }
  }, title), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--body-md-size)",
      lineHeight: 1.5,
      color: "var(--text-muted)"
    }
  }, body)))))), /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: "var(--container-max)",
      margin: "0 auto",
      padding: "var(--section-pad-marketing) var(--space-xl)",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "var(--space-huge)",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-lg)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--micro-cap-size)",
      letterSpacing: ".08em",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, "Six stages"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: "var(--display-lg-size)",
      lineHeight: "var(--display-lg-lh)",
      letterSpacing: "var(--display-lg-ls)",
      fontWeight: 300,
      color: "var(--text-heading)"
    }
  }, "You always know where each one stands."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "var(--body-lg-size)",
      lineHeight: 1.5,
      color: "var(--text-muted)"
    }
  }, "Stage changes are read from the email itself. When GradTracker isn't sure, it asks instead of guessing."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 8
    }
  }, ["applied", "assessment", "interview", "offer", "rejected", "withdrawn"].map(s => /*#__PURE__*/React.createElement(StageBadge, {
    key: s,
    stage: s
  })))), /*#__PURE__*/React.createElement(Card, {
    surface: "cream",
    padding: "regular",
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-lg)"
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "ai"
  }, "Needs review"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--display-md-size)",
      lineHeight: "var(--display-md-lh)",
      letterSpacing: "var(--display-md-ls)",
      fontWeight: 300,
      color: "var(--ink-900)"
    }
  }, "\"Interview confirmation \u2014 Wednesday\""), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--body-md-size)",
      lineHeight: 1.5,
      color: "var(--ink-700)"
    }
  }, "Confidence on the deadline is 52%, so this one waits for you. One tap adds it; one tap says it isn't an application."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-sm)"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "sm"
  }, "Add to pipeline"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "secondary"
  }, "Not an application")))));
}
Object.assign(window, {
  FeatureBands
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/FeatureBands.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/LandingHero.jsx
try { (() => {
const {
  GradientMesh,
  Button,
  Badge
} = window.GradTrackerDesignSystem_b026b0;
function LandingHero({
  onCta
}) {
  return /*#__PURE__*/React.createElement(GradientMesh, {
    height: 520
  }, /*#__PURE__*/React.createElement(SiteHeader, {
    onCta: onCta
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container-max)",
      margin: "0 auto",
      padding: "var(--space-huge) var(--space-xl) var(--space-xxl)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-xl)"
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "ai",
    style: {
      alignSelf: "flex-start"
    }
  }, "Reads your inbox, not your CV"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      maxWidth: 760,
      fontSize: "var(--display-xxl-size)",
      lineHeight: "var(--display-xxl-lh)",
      letterSpacing: "var(--display-xxl-ls)",
      fontWeight: 300,
      color: "var(--text-heading)"
    }
  }, "Twenty applications, one ranked list of what's due next."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      maxWidth: 540,
      fontSize: "var(--body-lg-size)",
      lineHeight: 1.5,
      color: "var(--text-secondary)"
    }
  }, "GradTracker connects to your Gmail, works out which emails are applications, and pulls out the company, role, stage, and deadline. No spreadsheet. No forgotten assessment."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-md)"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    iconLeft: "mail",
    onClick: onCta
  }, "Connect Gmail"), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    variant: "secondary",
    iconRight: "arrow-right"
  }, "See a live pipeline")), /*#__PURE__*/React.createElement("span", {
    className: "gt-num",
    style: {
      fontSize: "var(--caption-size)",
      letterSpacing: "var(--caption-ls)",
      color: "var(--text-muted)"
    }
  }, "Free for students \xB7 read-only access \xB7 41,200 applications tracked this season"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "var(--space-xl)"
    }
  }, /*#__PURE__*/React.createElement(MockupComposite, null))));
}
Object.assign(window, {
  LandingHero
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/LandingHero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/LandingPage.jsx
try { (() => {
const {
  Dialog,
  Button,
  Input,
  Checkbox,
  Toast
} = window.GradTrackerDesignSystem_b026b0;
function LandingPage() {
  const [open, setOpen] = React.useState(false);
  const [done, setDone] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface-page)",
      position: "relative",
      minHeight: "100%"
    }
  }, /*#__PURE__*/React.createElement(LandingHero, {
    onCta: () => setOpen(true)
  }), /*#__PURE__*/React.createElement(FeatureBands, null), /*#__PURE__*/React.createElement(PricingBand, {
    onCta: () => setOpen(true)
  }), /*#__PURE__*/React.createElement(SiteFooter, null), /*#__PURE__*/React.createElement(Dialog, {
    open: open,
    title: "Connect your university Gmail",
    description: "Read-only access. GradTracker never sends mail on your behalf.",
    onClose: () => setOpen(false),
    width: 420,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      size: "sm",
      onClick: () => setOpen(false)
    }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      iconLeft: "mail",
      onClick: () => {
        setOpen(false);
        setDone(true);
        window.setTimeout(() => setDone(false), 3200);
      }
    }, "Continue with Google"))
  }, /*#__PURE__*/React.createElement(Input, {
    label: "University email",
    iconLeft: "mail",
    value: "ana.silva@uni.ac.uk"
  }), /*#__PURE__*/React.createElement(Checkbox, {
    checked: true,
    label: "Send me a morning digest of what's due"
  })), done ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      left: 24,
      bottom: 24,
      zIndex: 70
    }
  }, /*#__PURE__*/React.createElement(Toast, {
    tone: "success"
  }, "Gmail connected \xB7 building your pipeline")) : null);
}
Object.assign(window, {
  LandingPage
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/LandingPage.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/MockupComposite.jsx
try { (() => {
const {
  Card,
  StageBadge,
  DeadlinePill,
  Badge,
  ConfidenceMeter
} = window.GradTrackerDesignSystem_b026b0;

/* The composited product mockup: pipeline table centre, extraction card right — the brand's
   "look at the actual product" argument, rendered at reduced scale. */
function MockupComposite() {
  const rows = [["Revolut", "Product Analyst Intern", "offer", "Reply by 22 Sep", 10], ["Monzo", "Backend Engineering Intern", "interview", "14 Sep", 2], ["NHS Digital", "Data Science Placement", "assessment", "16 Sep", 4], ["Bloomberg", "Engineering Summer Intern", "applied", "30 Sep", 18]];
  return /*#__PURE__*/React.createElement(Card, {
    padding: "none",
    radius: "xl",
    elevation: 2,
    style: {
      overflow: "hidden",
      display: "grid",
      gridTemplateColumns: "1.6fr 1fr"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      borderRight: "1px solid var(--border-hairline)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 16px",
      borderBottom: "1px solid var(--border-hairline)",
      background: "var(--surface-sunken)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--caption-size)",
      color: "var(--text-heading)"
    }
  }, "Pipeline"), /*#__PURE__*/React.createElement("span", {
    className: "gt-num",
    style: {
      fontSize: "var(--micro-size)",
      color: "var(--text-muted)"
    }
  }, "23 live \xB7 synced 4 min ago")), rows.map(([c, r, s, d, dl]) => /*#__PURE__*/React.createElement("div", {
    key: c,
    style: {
      display: "grid",
      gridTemplateColumns: "1.3fr 150px 110px",
      alignItems: "center",
      gap: 12,
      padding: "11px 16px",
      borderBottom: "1px solid var(--border-hairline)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      flexDirection: "column",
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--body-tabular-size)",
      color: "var(--text-heading)"
    }
  }, c), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--micro-size)",
      color: "var(--text-muted)",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, r)), /*#__PURE__*/React.createElement(StageBadge, {
    stage: s,
    size: "sm"
  }), /*#__PURE__*/React.createElement(DeadlinePill, {
    daysLeft: dl,
    style: {
      fontSize: "var(--micro-size)"
    }
  }, d)))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "16px",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      background: "var(--surface-card)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "ai"
  }, "AI detected"), /*#__PURE__*/React.createElement(ConfidenceMeter, {
    value: 0.96
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--caption-size)",
      color: "var(--text-muted)",
      lineHeight: 1.5
    }
  }, "\"Hi Ana \u2014 we'd love to book your first interview for the Backend Engineering Intern role\u2026\""), [["Company", "Monzo"], ["Role", "Backend Eng. Intern"], ["Stage", "Interview scheduled"], ["Deadline", "14 Sep · 09:00"]].map(([k, v]) => /*#__PURE__*/React.createElement("span", {
    key: k,
    style: {
      display: "flex",
      justifyContent: "space-between",
      gap: 8,
      paddingBottom: 6,
      borderBottom: "1px solid var(--border-hairline)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--micro-size)",
      color: "var(--text-muted)"
    }
  }, k), /*#__PURE__*/React.createElement("span", {
    className: "gt-num",
    style: {
      fontSize: "var(--micro-size)",
      color: "var(--text-body)"
    }
  }, v)))));
}
Object.assign(window, {
  MockupComposite
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/MockupComposite.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/PricingBand.jsx
try { (() => {
const {
  Card,
  Button,
  Icon,
  Badge
} = window.GradTrackerDesignSystem_b026b0;
function PricingBand({
  onCta
}) {
  const tiers = [{
    name: "Student",
    price: "Free",
    note: "While you're enrolled",
    featured: false,
    cta: "Connect Gmail",
    features: ["Unlimited applications", "Gmail detection every 15 minutes", "Deadline reminders", "Six-stage pipeline"]
  }, {
    name: "Student Plus",
    price: "£4",
    note: "per month, cancel any time",
    featured: true,
    cta: "Start free trial",
    features: ["Everything in Student", "Calendar sync for interviews", "Offer comparison view", "CV version per application", "Priority inbox scanning"]
  }, {
    name: "Careers service",
    price: "Talk to us",
    note: "For university teams",
    featured: false,
    cta: "Book a walkthrough",
    features: ["Cohort dashboards", "Anonymised outcome reporting", "SSO", "Bulk student onboarding"]
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--surface-sunken)",
      borderTop: "1px solid var(--border-hairline)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container-max)",
      margin: "0 auto",
      padding: "var(--section-pad-marketing) var(--space-xl)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-xxl)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-md)",
      maxWidth: 560
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--micro-cap-size)",
      letterSpacing: ".08em",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, "Pricing"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: "var(--display-xl-size)",
      lineHeight: "var(--display-xl-lh)",
      letterSpacing: "var(--display-xl-ls)",
      fontWeight: 300,
      color: "var(--text-heading)"
    }
  }, "Free while you're a student.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      gap: "var(--space-xl)",
      alignItems: "stretch"
    }
  }, tiers.map(t => /*#__PURE__*/React.createElement(Card, {
    key: t.name,
    surface: t.featured ? "inverse" : "card",
    padding: "regular",
    elevation: t.featured ? 2 : 0,
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-lg)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--heading-lg-size)",
      lineHeight: "var(--heading-lg-lh)",
      letterSpacing: "var(--heading-lg-ls)",
      fontWeight: 300,
      color: t.featured ? "#fff" : "var(--text-heading)"
    }
  }, t.name), t.featured ? /*#__PURE__*/React.createElement(Badge, {
    tone: "indigo"
  }, "Most picked") : null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "gt-num",
    style: {
      fontSize: "var(--display-md-size)",
      lineHeight: "var(--display-md-lh)",
      letterSpacing: "var(--display-md-ls)",
      fontWeight: 300,
      color: t.featured ? "#fff" : "var(--text-heading)"
    }
  }, t.price), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--caption-size)",
      letterSpacing: "var(--caption-ls)",
      color: t.featured ? "rgba(255,255,255,.66)" : "var(--text-muted)"
    }
  }, t.note)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-sm)",
      flex: 1
    }
  }, t.features.map(fe => /*#__PURE__*/React.createElement("span", {
    key: fe,
    style: {
      display: "flex",
      gap: 8,
      alignItems: "flex-start",
      fontSize: "var(--body-tabular-size)",
      letterSpacing: "var(--body-tabular-ls)",
      color: t.featured ? "rgba(255,255,255,.8)" : "var(--text-secondary)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: t.featured ? "var(--indigo-300)" : "var(--accent-primary)",
      display: "flex",
      marginTop: 2
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 14
  })), fe))), /*#__PURE__*/React.createElement(Button, {
    fullWidth: true,
    variant: t.featured ? "primary" : "secondary",
    onClick: onCta
  }, t.cta))))));
}
Object.assign(window, {
  PricingBand
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/PricingBand.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/SiteFooter.jsx
try { (() => {
const {
  Wordmark,
  Icon
} = window.GradTrackerDesignSystem_b026b0;
function SiteFooter() {
  const cols = [["Product", ["How it works", "Six stages", "Reminders", "Pricing"]], ["Students", ["Getting started", "Privacy & permissions", "Deadline calendar", "Help centre"]], ["Universities", ["Careers services", "Cohort reporting", "Book a walkthrough"]], ["Company", ["About", "Blog", "Status", "Contact"]]];
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      borderTop: "1px solid var(--border-hairline)",
      background: "var(--surface-page)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container-max)",
      margin: "0 auto",
      padding: "var(--space-huge) var(--space-xl)",
      display: "grid",
      gridTemplateColumns: "1.4fr repeat(4,1fr)",
      gap: "var(--space-xxl)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-md)"
    }
  }, /*#__PURE__*/React.createElement(Wordmark, {
    size: 19
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--caption-size)",
      letterSpacing: "var(--caption-ls)",
      color: "var(--text-muted)",
      maxWidth: 220
    }
  }, "Built for application season, in Manchester."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-md)",
      color: "var(--text-muted)"
    }
  }, ["github", "linkedin", "instagram"].map(i => /*#__PURE__*/React.createElement("a", {
    key: i,
    href: "#",
    style: {
      color: "inherit",
      display: "flex"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: i,
    size: 16
  }))))), cols.map(([head, links]) => /*#__PURE__*/React.createElement("div", {
    key: head,
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-sm)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--micro-cap-size)",
      letterSpacing: ".08em",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, head), links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    style: {
      fontSize: "var(--caption-size)",
      letterSpacing: "var(--caption-ls)",
      color: "var(--text-secondary)",
      textDecoration: "none"
    }
  }, l))))), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container-max)",
      margin: "0 auto",
      padding: "0 var(--space-xl) var(--space-xxl)",
      display: "flex",
      gap: "var(--space-xl)",
      fontSize: "var(--micro-size)",
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement("span", null, "\xA9 2026 GradTracker Ltd"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      color: "inherit",
      textDecoration: "none"
    }
  }, "Privacy"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      color: "inherit",
      textDecoration: "none"
    }
  }, "Terms"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      color: "inherit",
      textDecoration: "none"
    }
  }, "Cookie choices")));
}
Object.assign(window, {
  SiteFooter
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/SiteFooter.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/SiteHeader.jsx
try { (() => {
const {
  Wordmark,
  Button
} = window.GradTrackerDesignSystem_b026b0;
function SiteHeader({
  onCta
}) {
  const links = ["How it works", "For students", "Universities", "Pricing"];
  return /*#__PURE__*/React.createElement("header", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-xxl)",
      padding: "var(--space-lg) var(--space-xl)",
      maxWidth: "var(--container-max)",
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement(Wordmark, {
    size: 20
  }), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      gap: "var(--space-xl)",
      flex: 1
    }
  }, links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    style: {
      fontSize: "var(--body-md-size)",
      color: "var(--text-nav)",
      textDecoration: "none"
    }
  }, l))), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      fontSize: "var(--body-md-size)",
      color: "var(--text-nav)",
      textDecoration: "none"
    }
  }, "Sign in"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    onClick: onCta
  }, "Connect Gmail"));
}
Object.assign(window, {
  SiteHeader
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/SiteHeader.jsx", error: String((e && e.message) || e) }); }

__ds_ns.GradientMesh = __ds_scope.GradientMesh;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.LogoMark = __ds_scope.LogoMark;

__ds_ns.Wordmark = __ds_scope.Wordmark;

__ds_ns.ApplicationRow = __ds_scope.ApplicationRow;

__ds_ns.ConfidenceMeter = __ds_scope.ConfidenceMeter;

__ds_ns.DeadlinePill = __ds_scope.DeadlinePill;

__ds_ns.STAGES = __ds_scope.STAGES;

__ds_ns.StageBadge = __ds_scope.StageBadge;

__ds_ns.StatCard = __ds_scope.StatCard;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.EmptyState = __ds_scope.EmptyState;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.SearchField = __ds_scope.SearchField;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.SidebarNav = __ds_scope.SidebarNav;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.TopBar = __ds_scope.TopBar;

})();
