/** Rebuild approved catalogue offline using saved public responses; no calls or invented freshness. */
import { readFile, writeFile } from "node:fs/promises";
import { normalizeOpenRouter, mergeAA } from "./snapshot.mjs";
import { applyCatalogueSelection } from "./catalogue-selection.mjs";
const read = async (path) => JSON.parse(await readFile(path, "utf8"));
const selection = await read("content/catalog/model-selection-156.json");
const aa = await read("content/fixtures/aa-public.json");
const or = await read("data/model-sources/openrouter-current.json");
const mappings = await read("content/model-mappings.json");
const models = applyCatalogueSelection(
  mergeAA(normalizeOpenRouter(or, or.fetchedAt), aa, mappings),
  aa,
  selection,
  mappings,
  selection.aaAsOf,
);
const output = {
  version: selection.version,
  selectionVersion: selection.version,
  developmentSample: false,
  asOf: or.fetchedAt,
  aaStatus: "stored-reference",
  models,
};
await writeFile(
  "content/fixtures/models.json",
  JSON.stringify(output, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    models: models.length,
    reviewed: models.filter((m) => m.verified).length,
    profiles: models.reduce((n, m) => n + m.aaProfiles.length, 0),
  }),
);
