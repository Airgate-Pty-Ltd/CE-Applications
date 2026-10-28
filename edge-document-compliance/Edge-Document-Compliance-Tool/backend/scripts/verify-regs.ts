/**
 * Verify Regulations CLI
 * Validates all regulation packs against schema
 */

import fs from "fs";
import path from "path";
import Ajv from "ajv";
import yaml from "js-yaml";

const ajv = new Ajv({ allErrors: true });

const schemaPath = path.join(process.cwd(), "config/schemas/standard-pack.schema.json");
if (!fs.existsSync(schemaPath)) {
  console.error(`Schema file not found: ${schemaPath}`);
  process.exit(1);
}

const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
const validate = ajv.compile(schema);

function* walk(dir: string): Generator<string> {
  if (!fs.existsSync(dir)) {
    return;
  }
  
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      yield* walk(p);
    } else if (e.isFile() && e.name === "pack.yaml") {
      yield p;
    }
  }
}

let invalid = 0;
const regsDir = path.join(process.cwd(), "regs");

if (!fs.existsSync(regsDir)) {
  console.log("No regs directory found. Run refresh first.");
  process.exit(0);
}

for (const p of walk(regsDir)) {
  try {
    const data = yaml.load(fs.readFileSync(p, "utf8"));
    const ok = validate(data);
    if (!ok) {
      invalid++;
      console.error("Schema invalid:", p, validate.errors);
    }
  } catch (err: any) {
    invalid++;
    console.error("Error reading pack:", p, err.message);
  }
}

if (invalid) {
  console.error(`RED FLAG: ${invalid} invalid pack(s).`);
  process.exit(2);
}

console.log("All packs validated OK.");

