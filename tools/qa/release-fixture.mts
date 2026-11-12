// Offline-only browser fixtures. No DB/network/Gemini requests.
import Fastify from "fastify";
import { FileRepository } from "../../apps/api/src/modules/repository.js";
import { registerPrototype } from "../../apps/api/src/modules/routes.js";
import { Gemini } from "../../apps/api/src/services/llm/gemini.js";
import { mkdir, writeFile } from "node:fs/promises";
process.env.AIMI_AI_MODE = "fixture";
const app = Fastify();
registerPrototype(app, new FileRepository(), async () => "release-ui-fixture");
const data: Record<string, unknown> = {};
for (const path of ["content", "state", "models", "social"]) {
  const response = await app.inject("/v1/" + path);
  if (response.statusCode !== 200) throw Error("Fixture failed: " + path);
  data[path] = response.json().data;
}
data.job = {
  id: "fixture-job",
  status: "completed",
  result: {
    ...(await new Gemini(true).optimize(
      "학교 발표용 재활용 방법 세 가지를 알려줘",
    )),
    source: "gemini",
  },
};
await mkdir("output/qa/release-policy", { recursive: true });
await writeFile("output/qa/release-policy/fixture.json", JSON.stringify(data));
await app.close();
console.log("Offline release fixtures prepared; external calls=0");
