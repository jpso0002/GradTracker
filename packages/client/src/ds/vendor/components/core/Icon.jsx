import React from "react";

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
  s.onload = () => { while (waiters.length) waiters.shift()(); };
  document.head.appendChild(s);
}

function pascal(name) {
  return String(name).replace(/(^|[-_ ])([a-z0-9])/g, (m, a, b) => b.toUpperCase());
}
function camelAttrs(attrs) {
  const out = {};
  Object.keys(attrs || {}).forEach((k) => {
    const key = k.replace(/-([a-z])/g, (m, c) => c.toUpperCase());
    out[key] = attrs[k];
  });
  return out;
}

export function Icon({ name, size = 16, strokeWidth = 1.75, color = "currentColor", title, style, className }) {
  const [, force] = React.useState(0);
  React.useEffect(() => { ensureLucide(() => force((n) => n + 1)); }, []);

  const set = (typeof window !== "undefined" && window.lucide && window.lucide.icons) || null;
  const raw = set ? set[pascal(name)] : null;
  const nodes = !raw ? [] : (raw[0] === "svg" ? raw[2] : raw);

  return React.createElement(
    "svg",
    {
      className, role: title ? "img" : "presentation", "aria-hidden": title ? undefined : true,
      width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color,
      strokeWidth, strokeLinecap: "round", strokeLinejoin: "round",
      style: { flex: "0 0 auto", display: "block", ...style },
    },
    title ? React.createElement("title", { key: "t" }, title) : null,
    (nodes || []).map((n, i) => React.createElement(n[0], { key: i, ...camelAttrs(n[1]) }))
  );
}
