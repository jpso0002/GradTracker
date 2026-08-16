import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/node_modules/**", "GradTracker Design System/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
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
    // ── Port boundary (rules.md → Architecture) ────────────────────────────
    // No vendor SDK may be imported above the port line. The full rule lands
    // with the ports in T2.1; this stub documents the intent and already
    // blocks the two SDKs from the domain layer.
    files: ["packages/server/src/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "googleapis",
              message:
                "Domain code must not import the Gmail SDK. Depend on the GmailClient port instead (rules.md → Architecture).",
            },
            {
              name: "@anthropic-ai/sdk",
              message:
                "Domain code must not import the Anthropic SDK. Depend on the EmailClassifier port instead (rules.md → Architecture).",
            },
          ],
        },
      ],
    },
  },
);
