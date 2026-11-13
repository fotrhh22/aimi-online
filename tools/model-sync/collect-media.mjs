/** Public metadata only. Does not submit generation jobs or send credentials. */
import { mkdir, writeFile, rename } from "node:fs/promises";
import { execFileSync } from "node:child_process";
const base = "data/model-sources/multimodal/";
await mkdir(base + "image-endpoints", { recursive: true });
const get = async (path) => {
  const url = new URL(path, "https://openrouter.ai");
  if (url.origin !== "https://openrouter.ai") throw Error("UNEXPECTED_SOURCE");
  const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw Error(`METADATA_HTTP_${r.status}: ${url.pathname}`);
  return r.json();
};
const all = await get("/api/v1/models?output_modalities=all");
let next = all.links?.next;
while (next) {
  const page = await get(next);
  all.data.push(...page.data);
  next = page.links?.next;
}
if (all.total_count != null && all.data.length !== all.total_count)
  throw Error("INCOMPLETE_MODEL_COLLECTION");
const [images, videos] = await Promise.all([
  get("/api/v1/images/models"),
  get("/api/v1/videos/models"),
]);
const details = [];
const queue = [...images.data];
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const m = queue.shift();
      details.push([m.id, await get(m.endpoints)]);
    }
  }),
);
// No replacement until every discovery/detail request succeeded.
const save = async (name, data) => {
  await writeFile(base + name + ".tmp", JSON.stringify(data, null, 2) + "\n");
  await rename(base + name + ".tmp", base + name);
};
await save("models-all.json", all);
await save("image-models.json", images);
await save("video-models.json", videos);
for (const [id, data] of details)
  await save("image-endpoints/" + id.replaceAll("/", "__") + ".json", data);
await save("collection.json", {
  fetchedAt: new Date().toISOString(),
  imageDetails: details.length,
  fail: [],
  sources: [
    "/api/v1/models?output_modalities=all",
    "/api/v1/images/models",
    "/api/v1/videos/models",
  ],
});
execFileSync(process.execPath, ["tools/model-sync/build-media.mjs"], {
  stdio: "inherit",
});
