export const processHeavyTests = [
  "tests/tooling/coverage-governance.test.ts",
  "tests/architecture/server-only-boundaries.test.ts",
  // ESLint creates a full TypeScript project: isolate these tooling contracts
  // from parallel coverage workers; each assertion keeps its own deadline.
  "tests/tooling/eslint-console-boundaries.test.ts",
  "tests/tooling/type-aware-lint.test.ts",
  "tests/tooling/react-lint-policy.test.ts",
];
