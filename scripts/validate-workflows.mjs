import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const dir = path.join(root, "workflows");
const files = fs.readdirSync(dir).filter((name) => name.endsWith(".json")).sort();
let failed = false;

for (const file of files) {
  const full = path.join(dir, file);
  try {
    const workflow = JSON.parse(fs.readFileSync(full, "utf8"));
    const names = new Set(workflow.nodes.map((node) => node.name));
    if (!workflow.name || !Array.isArray(workflow.nodes) || workflow.nodes.length < 2) {
      throw new Error("missing name or nodes");
    }
    for (const [source, groups] of Object.entries(workflow.connections ?? {})) {
      if (!names.has(source)) throw new Error(`connection source missing: ${source}`);
      for (const group of Object.values(groups)) {
        for (const branch of group) {
          for (const edge of branch) {
            if (!names.has(edge.node)) throw new Error(`connection target missing: ${edge.node}`);
          }
        }
      }
    }
    console.log(`OK ${file}: ${workflow.nodes.length} nodes`);
  } catch (error) {
    failed = true;
    console.error(`FAIL ${file}: ${error.message}`);
  }
}

if (files.length !== 4) {
  failed = true;
  console.error(`FAIL expected 4 workflow files, found ${files.length}`);
}
process.exitCode = failed ? 1 : 0;

