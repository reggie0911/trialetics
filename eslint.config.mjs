import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["app/privacy-policy/**/*", "app/terms-and-conditions/**/*"],
    rules: { "react/no-unescaped-entities": "off" },
  },
  {
    // Centralize all transactional email sending in lib/email/. Any other
    // file that imports `resend` directly bypasses templating, idempotency,
    // and the 21 CFR Part 11 email_log audit trail.
    files: ["**/*.{ts,tsx}"],
    ignores: ["lib/email/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "resend",
              message:
                "Import sendEmail from '@/lib/email' instead of using the Resend SDK directly.",
            },
          ],
        },
      ],
    },
  },
  {
    // The React Compiler ESLint plugin ships with Next.js 15 but this project
    // does not enable the React Compiler (no reactCompiler flag in next.config).
    // Downgrade compiler-only rules from error to warn to avoid blocking CI on
    // patterns that are valid without the compiler (e.g. async data loading in
    // effects, ref updates during render for stale-closure prevention).
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored / scratch (excluded from tsconfig); keep lint focused on the main app
    "lumen-temp/**",
    // Storybook static export (generated); do not lint bundled JS.
    "storybook-static/**",
  ]),
]);

export default eslintConfig;
