import { readdir } from "node:fs/promises";
import { join } from "node:path";

// Route tests replace module boundaries. Separate processes prevent a mock in
// one test file from changing another file's imports.
const files = (await readdir("tests")).filter(file => file.endsWith(".test.ts")).sort();
if (!files.length) throw new Error("No unit tests found");
for (const file of files) {
  const result = Bun.spawn([process.execPath, "test", join("tests", file)], { stdout: "inherit", stderr: "inherit" });
  if (await result.exited) process.exit(1);
}
