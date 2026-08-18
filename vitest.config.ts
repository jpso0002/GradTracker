import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The scaffold ships with a schema test (T1.3), but this keeps `npm test`
    // green in any package that does not yet have one — the T1.2 done-when.
    passWithNoTests: true,
    include: ["packages/*/src/**/*.test.ts", "packages/*/src/**/*.test.tsx", "fixtures/**/*.test.ts"],
    environment: "node",
  },
});
