import "./config.js";
import Fastify from "fastify";
import cors from "@fastify/cors";
import {
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { z, ZodError } from "zod";
import { FileRepository } from "./modules/repository.js";
import { seedDevelopmentFriend } from "./modules/development-friend.js";
import { registerPrototype } from "./modules/routes.js";
import { ApiError } from "./db.js";
if (process.env.NODE_ENV === "production" || process.env.RENDER)
  throw new Error("PROTOTYPE_SERVER_LOCAL_ONLY");
const directory = fileURLToPath(
  new URL("../../../tmp/prototype/", import.meta.url),
);
const persistent = process.env.AIMI_DEV_PERSIST_STATE === "true";
let secret = randomBytes(32).toString("hex");
if (persistent) {
  await mkdir(directory, { recursive: true });
  try {
    secret = await readFile(directory + "session.key", "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    secret = randomBytes(32).toString("hex");
    await writeFile(directory + "session.key", secret, { mode: 0o600 });
  }
}
const repo = new FileRepository(
  persistent ? directory + "state.json" : undefined,
);
const sign = (id: string, epoch: string) =>
  createHmac("sha256", secret)
    .update(id + ":" + epoch)
    .digest("hex");
const app = Fastify({ bodyLimit: 200_000, logger: false });
await app.register(cors, {
  origin: ["http://127.0.0.1:5180", "http://localhost:5180"],
});
const auth = async (r: { headers: { authorization?: string } }) => {
  const token = r.headers.authorization?.replace(/^Bearer /, ""),
    [id, sig] = token?.split(".") ?? [];
  if (
    !id ||
    !sig ||
    !/^[a-f0-9]{64}$/.test(sig) ||
    !/^dev-[a-f0-9]{24}$/.test(id) ||
    !timingSafeEqual(
      Buffer.from(sig),
      Buffer.from(sign(id, (await repo.existing(id))?.authEpoch ?? "deleted")),
    )
  )
    throw new ApiError("UNAUTHENTICATED", 401);
  return id;
};
app.setErrorHandler((e, _r, reply) => {
  const status =
    e instanceof ApiError ? e.status : e instanceof ZodError ? 400 : 500;
  reply.status(status).send({
    error: {
      code:
        e instanceof ApiError
          ? e.code
          : e instanceof ZodError
            ? "INVALID_REQUEST"
            : "INTERNAL_ERROR",
      retryable: status === 503,
      attemptConsumed: false,
      budgetRestored: false,
    },
  });
});
app.post("/auth/local", async (r) => {
  const { name } = z
    .object({ name: z.string().regex(/^[A-Za-z0-9_-]{1,40}$/) })
    .parse(r.body);
  const id =
    "dev-" +
    createHmac("sha256", secret)
      .update("subject:" + name)
      .digest("hex")
      .slice(0, 24);
  await seedDevelopmentFriend(repo, id);
  const s = await repo.read(id);
  return {
    data: { token: id + "." + sign(id, s.authEpoch), development: true },
  };
});
app.post("/dev/social/restore", async r => {
  const id = await auth(r);
  await seedDevelopmentFriend(repo, id, true);
  return { data: { restored: true } };
});
app.get("/health/live", async () => ({
  status: "ok",
  development: true,
  persistent,
}));
app.post("/auth/logout", async (r) => {
  const id = await auth(r);
  await repo.transaction([id], (s) => {
    s[id].authEpoch = randomUUID();
  });
  return { data: { loggedOut: true } };
});
registerPrototype(app, repo, auth);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.once(signal, () => void app.close());
const port = Number(process.env.PROTOTYPE_PORT) || 8081;
await app.listen({ host: "127.0.0.1", port });
console.log(
  `AIMI local prototype API: http://127.0.0.1:${port} (development state resets on restart unless persistence is explicitly enabled)`,
);
