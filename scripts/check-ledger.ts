import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

async function collectTypeScriptFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return collectTypeScriptFiles(path);
      return entry.isFile() && path.endsWith(".ts") ? [path] : [];
    }),
  );
  return nested.flat();
}

const patterns = [
  /\b(?:ctx\.)?db\.(?:patch|delete|replace)\(\s*[^)]{0,200}materialFlowLedger/g,
  /\b(?:ctx\.)?db\.(?:patch|delete|replace)\(\s*ledger(?:\.|,|\))/g,
];

const files = await collectTypeScriptFiles("convex");
const violations: string[] = [];

for (const path of files) {
  const source = await readFile(path, "utf8");
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const line = source.slice(0, match.index).split("\n").length;
      violations.push(`${path}:${line}`);
    }
  }
}

if (violations.length > 0) {
  console.error("FAIL: Material Flow Ledger harus append-only.");
  console.error(violations.join("\n"));
  process.exit(1);
}

console.log("OK: tidak ada patch, delete, atau replace pada Material Flow Ledger.");
