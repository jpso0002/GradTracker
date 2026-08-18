import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    /* The design system is vendored verbatim into the client and verified
       against its source by ds.sync.test.ts. Linting it would demand edits
       that the drift test would then reject — so it is not ours to lint. */
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "GradTracker Design System/**",
      "packages/client/src/ds/vendor/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    /* Plain .mjs build scripts run in Node. They are typechecked by the
       client tsconfig (allowJs), so no-undef here is redundant noise — but
       declaring the globals is cheaper than an exception. */
    files: ["**/*.mjs"],
    languageOptions: {
      globals: { process: "readonly", console: "readonly" },
    },
  },
  {
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // ── Port boundary (T2.1) ───────────────────────────────────────────────
    //
    // No vendor SDK may be imported anywhere in the server EXCEPT under
    // `adapters/`. This is the property the entire test strategy rests on: if
    // domain, routes or db code can reach the Gmail or Anthropic SDK directly,
    // then swapping in the fakes no longer exercises the real code path and
    // every offline test becomes a lie.
    //
    // Enforced here rather than by convention, because a convention that
    // matters is a convention that will eventually be broken by someone in a
    // hurry at 2am in week 11.
    files: ["packages/server/src/**/*.ts"],
    ignores: ["packages/server/src/adapters/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "googleapis",
              message:
                "Only adapters/gmail/ may import the Gmail SDK. Depend on the GmailClient port (ports/gmail-client.ts).",
            },
            {
              name: "google-auth-library",
              message:
                "Only adapters/gmail/ may import Google auth. Depend on the GmailClient port (ports/gmail-client.ts).",
            },
            {
              name: "@anthropic-ai/sdk",
              message:
                "Only adapters/classifier/ may import the Anthropic SDK. Depend on the EmailClassifier port (ports/email-classifier.ts).",
            },
          ],
          patterns: [
            {
              group: ["googleapis/*", "@anthropic-ai/sdk/*"],
              message:
                "Vendor SDK subpaths are restricted to adapters/ for the same reason as the packages themselves.",
            },
          ],
        },
      ],
    },
  },
);
