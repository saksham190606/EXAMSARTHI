import { ESLint } from "eslint";
import tailwindPlugin from "eslint-plugin-tailwindcss";
import tsParser from "@typescript-eslint/parser";

const eslint = new ESLint({
  overrideConfigFile: true,
  overrideConfig: [
    {
      files: ["**/*.{ts,tsx}"],
      plugins: {
        tailwindcss: tailwindPlugin,
      },
      settings: {
        tailwindcss: {
          cssFiles: ["src/app/globals.css"],
        },
      },
      languageOptions: {
        parser: tsParser,
        parserOptions: {
          ecmaFeatures: { jsx: true },
        },
      },
      rules: {
        "tailwindcss/no-contradicting-classname": "error",
      },
    },
  ],
});

async function run() {
  const results = await eslint.lintFiles(["src/**/*.{ts,tsx}"]);
  let count = 0;
  for (const res of results) {
    if (res.messages.length > 0) {
      console.log(`\n${res.filePath}:`);
      for (const msg of res.messages) {
        console.log(`  Line ${msg.line}:${msg.column} [${msg.ruleId}] ${msg.message}`);
        count++;
      }
    }
  }
  console.log(`\nTotal contradicting classname warnings: ${count}`);
}

run().catch(console.error);
