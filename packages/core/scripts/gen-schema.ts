import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { JSONSchema } from "effect";
import { ConfigInput } from "../dist/effect.mjs";

const schema = JSONSchema.make(ConfigInput);
const doc = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Voxx configuration",
  ...schema,
};

const out = fileURLToPath(new URL("../voxx.schema.json", import.meta.url));
writeFileSync(out, `${JSON.stringify(doc, null, 2)}\n`);
console.log(`voxx: wrote ${out}`);
