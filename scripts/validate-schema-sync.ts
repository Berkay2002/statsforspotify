import { existsSync } from "node:fs";

const requiredFiles = [
  ".github/workflows/sync-supabase-schema.yml", "supabase/schema/schema.sql",
  "lib/supabase/database.ts", "SCHEMA_SYNC.md", ".github/README.md", ".github/SECRETS_SETUP.md",
];
for (const path of requiredFiles) {
  if (!existsSync(path)) throw new Error(`Missing schema-sync file: ${path}`);
}
const text = await Bun.file(requiredFiles[0]).text();
const workflow = Bun.YAML.parse(text) as {
  on?: { schedule?: unknown; workflow_dispatch?: unknown };
  jobs?: Record<string, { steps?: Array<{ run?: string }> }>;
};
if (!workflow.on?.schedule || !("workflow_dispatch" in workflow.on)) {
  throw new Error("Schema sync must support scheduled and manual runs");
}
const commands = Object.values(workflow.jobs ?? {}).flatMap(job => job.steps ?? []).map(step => step.run ?? "").join("\n");
for (const expected of ["supabase db dump", "supabase gen types typescript", "git diff --staged --quiet"]) {
  if (!commands.includes(expected)) throw new Error(`Missing workflow operation: ${expected}`);
}
for (const secret of ["SUPABASE_ACCESS_TOKEN", "SUPABASE_PROJECT_ID", "SUPABASE_DB_PASSWORD"]) {
  if (!text.includes(`secrets.${secret}`)) throw new Error(`Missing secret reference: ${secret}`);
}
console.log("Schema-sync workflow and documentation checks passed (no database connection made).");
