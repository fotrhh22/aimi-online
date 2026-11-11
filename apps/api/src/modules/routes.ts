import {
  generatedPack,
  packVersion,
  puzzleContent,
  evaluatePuzzle,
  puzzlePreviews,
  generatedContentEnabled,
} from "../services/content/generated.js";
import {
  publishAvailableModels,
  type AvailabilityPolicy,
  PurchaseInput,
  ECONOMY_POLICY,
} from "@aimi/contracts";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { randomUUID, createHash } from "node:crypto";
import {
  CompleteGame,
  AttemptInput,
  GardenInput,
  TextInput,
  AnalyzeInput,
  IdempotencyKey,
  seoulDate,
  gardenPlacements,
  type AIJob,
  type ModelRecord,
  type TaskProfile,
} from "@aimi/contracts";
import {
  recommend,
  MODEL_GROUP_POLICY_VERSION,
  RECOMMENDATION_POLICY_VERSION,
} from "@aimi/recommender";
import type { Repository } from "./repository.js";
import {
  view,
  daily,
  buyPuzzleCountHint,
  once,
  startPlay,
  completePlay,
  submitAttempt,
  claimChallengeReward,
  purchase,
  saveGarden,
  CATALOG,
  CONTENT_VERSION,
} from "./domain.js";
import { KEYWORDS, contentForDate } from "../services/content/fixture.js";
import { Gemini } from "../services/llm/gemini.js";
import { TASK_PROFILE_VERSION } from "../services/llm/prompts.js";
import { reserveUserAI, releaseUserAI } from "../services/llm/usage.js";
import { ApiError } from "../db.js";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

type Auth = (r: FastifyRequest) => Promise<string>;

export function registerPrototype(
  app: FastifyInstance,
  repo: Repository,
  auth: Auth,
  beforeDelete?: (id: string) => Promise<void>,
) {
  app.addHook("preHandler", async (r) => {
    if (
      r.url.startsWith("/v1/") &&
      process.env.NODE_ENV === "production" &&
      process.env.AIMI_RELEASE_VERSION !== "prototype-v1-reviewed" &&
      !(
        process.env.AIMI_RELEASE_VERSION === "prototype-v1-preview" &&
        process.env.AIMI_CONTENT_PREVIEW === "true"
      )
    )
      throw new ApiError("PROTOTYPE_RELEASE_NOT_REVIEWED", 503);
  });
  let cleanupTimer: ReturnType<typeof setInterval> | undefined;
  app.addHook("onReady", async () => {
    await repo.pruneAI(Date.now() - 86400_000).catch(() => {});
    cleanupTimer = setInterval(
      () => void repo.pruneAI(Date.now() - 86400_000).catch(() => {}),
      3600000,
    );
    cleanupTimer.unref();
  });
  app.addHook("onClose", async () => {
    if (cleanupTimer) clearInterval(cleanupTimer);
  });
  const gemini = new Gemini(repo.development);
  const wrap = (data: unknown) => ({
    data,
    serverTime: new Date().toISOString(),
    localDate: seoulDate(),
    ruleVersion: ECONOMY_POLICY.version,
    dataVersion: CONTENT_VERSION,
    development: repo.development,
  });
  const key = (r: FastifyRequest) =>
    IdempotencyKey.parse(r.headers["idempotency-key"]);
  const mutate = async <T>(
    r: FastifyRequest,
    op: string,
    body: unknown,
    fn: (s: Awaited<ReturnType<Repository["read"]>>) => T,
  ) => {
    const id = await auth(r);
    return wrap(
      await repo.transaction([id], (states) =>
        once(states[id], key(r), op, body, () => fn(states[id])),
      ),
    );
  };
  app.get("/v1/state", async (r) => {
    const s = await repo.read(await auth(r));
    return wrap(view(s));
  });
  app.get("/v1/content/previews", async (r) => {
    await auth(r);
    if (!generatedContentEnabled(repo.development))
      throw new ApiError("NOT_FOUND", 404);
    return wrap({ images: puzzlePreviews() });
  });
  app.get("/v1/content", async (r) => {
    const uid = await auth(r);
    if (generatedContentEnabled(repo.development)) {
      return repo.transaction([uid], (st) => {
        const d = daily(st[uid]);
        if (d.challengeVersion || d.attemptsUsed === 0) {
          const pack = generatedPack(d.date, d.challengeVersion);
          d.challengeVersion = packVersion(pack);
          if (
            d.lastAttempt &&
            st[uid].attempts[d.lastAttempt]?.answerCount !== undefined
          )
            d.answerCountPurchased = true;
          return wrap({
            ...puzzleContent(
              pack,
              uid + d.date + d.challengeVersion,
              d.answerCountPurchased === true ||
                d.challengeClosed === true ||
                d.success,
            ),
            catalog: CATALOG,
          });
        }
        return wrap({
          ...contentForDate(d.date),
          expected: undefined,
          keywords: KEYWORDS,
          catalog: CATALOG,
          developmentSample: true,
        });
      });
    }
    return wrap({
      ...contentForDate(),
      expected: undefined,
      keywords: KEYWORDS,
      catalog: CATALOG,
      developmentSample: true,
    });
  });
  app.post("/v1/game-plays", async (r) => {
    const body = z
      .object({ kind: z.enum(["crossing", "dino", "runner"]).optional() })
      .strict()
      .parse(r.body ?? {});
    if (body.kind) throw new ApiError("GAME_OVERRIDE_FORBIDDEN", 403);
    return mutate(r, "game-start", body, (s) => startPlay(s));
  });
  app.get<{ Params: { id: string } }>("/v1/game-plays/:id", async (r) => {
    const s = await repo.read(await auth(r)),
      p = s.plays[r.params.id];
    if (!p) throw new ApiError("PLAY_NOT_FOUND", 404);
    return wrap(p);
  });
  app.post<{ Params: { id: string } }>(
    "/v1/game-plays/:id/complete",
    async (r) => {
      const body = CompleteGame.parse(r.body);
      return mutate(r, "game-complete:" + r.params.id, body, (s) =>
        completePlay(s, r.params.id, body),
      );
    },
  );
  app.post("/v1/challenge/preview", async (r) => {
    const uid = await auth(r);
    const b = AttemptInput.parse(r.body);
    const { evaluateChallenge } =
      await import("../services/content/fixture.js");
    const state = await repo.read(uid),
      d = daily(state);
    const e =
      generatedContentEnabled(repo.development) && d.challengeVersion
        ? evaluatePuzzle(
            generatedPack(d.date, d.challengeVersion),
            b.keywordIds,
            b.model,
          )
        : evaluateChallenge(b.keywordIds, b.model, b.date);
    return wrap({ cost: e.cost, sentence: e.sentence, version: e.version });
  });
  app.post("/v1/challenge/count-hint", async (r) => {
    const b = z
      .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        contentVersion: z.string().max(150),
      })
      .strict()
      .parse(r.body);
    return mutate(r, "challenge-count-hint", b, (s) => {
      const d = daily(s);
      if (b.date !== d.date) throw new ApiError("MISSION_DATE_CHANGED", 409);
      if (
        !generatedContentEnabled(repo.development) ||
        !d.challengeVersion ||
        b.contentVersion !== d.challengeVersion
      )
        throw new ApiError("CONTENT_VERSION_CHANGED", 409);
      return buyPuzzleCountHint(s, generatedPack(d.date, d.challengeVersion));
    });
  });
  app.post("/v1/challenge/attempts", async (r) => {
    const b = AttemptInput.parse(r.body);
    return mutate(r, "challenge-attempt", b, (s) => {
      const d = daily(s);
      if (
        b.contentVersion &&
        b.contentVersion !==
          (d.challengeVersion ?? contentForDate(d.date).version)
      )
        throw new ApiError("CONTENT_VERSION_CHANGED", 409);
      const pack =
        generatedContentEnabled(repo.development) && d.challengeVersion
          ? generatedPack(d.date, d.challengeVersion)
          : undefined;
      return submitAttempt(s, b, Date.now(), pack);
    });
  });
  app.post<{ Params: { id: string } }>("/v1/attempts/:id/reward", async (r) => {
    z.object({})
      .strict()
      .parse(r.body ?? {});
    const body = { attemptId: r.params.id };
    return mutate(r, "challenge-reward-claim", body, (s) =>
      claimChallengeReward(s, body.attemptId),
    );
  });
  app.get<{ Params: { id: string } }>("/v1/attempts/:id", async (r) => {
    const s = await repo.read(await auth(r)),
      a = s.attempts[r.params.id];
    if (!a) throw new ApiError("ATTEMPT_NOT_FOUND", 404);
    return wrap(a);
  });
  app.post("/v1/purchases", async (r) => {
    const b = PurchaseInput.parse(r.body);
    return mutate(r, "purchase", b, (s) => purchase(s, b.itemId, b.quantity));
  });
  app.put("/v1/garden", async (r) => {
    const b = GardenInput.parse(r.body);
    return mutate(r, "garden-save", b, (s) => saveGarden(s, b));
  });
  app.put("/v1/profile", async (r) => {
    const b = z.object({ public: z.boolean() }).strict().parse(r.body);
    return mutate(r, "profile", b, (s) => {
      s.garden.public = b.public;
      return { public: s.garden.public };
    });
  });
  if (repo.development)
    app.post("/v1/dev/rewards/:type", async (r) => {
      const type = z
        .enum(["attendance", "tip"])
        .parse((r.params as { type: string }).type);
      return mutate(r, "reward:" + type, {}, (s) => {
        const day = seoulDate(),
          claims = (s.claims[day] ??= []);
        const ep = claims.includes(type) ? 0 : ECONOMY_POLICY[type];
        claims.push(...(ep ? [type] : []));
        s.balance += ep;
        return { awarded: ep, balance: s.balance };
      });
    });
  // Directed requests, reciprocal friendship, block removes both links in one transaction.
  app.get("/v1/social", async (r) => {
    const uid = await auth(r),
      s = await repo.read(uid);
    const ids = [...new Set([...s.friends, ...s.friendRequests])];
    const people = [];
    const others: Record<
      string,
      Awaited<ReturnType<Repository["read"]>>
    > = repo.readMany
      ? await repo.readMany(ids)
      : Object.fromEntries(
          await Promise.all(ids.map(async (id) => [id, await repo.read(id)])),
        );
    for (const id of ids) {
      const other = others[id];
      if (!other) continue;
      if (!other.blocked.includes(uid) && !s.blocked.includes(id))
        people.push({
          id,
          name: other.name,
          character: other.selectedCharacter,
          code: other.code,
          request: s.friendRequests.includes(id),
          challengeSuccessCount: Object.values(other.days).filter(
            (day) => day.success,
          ).length,
          todayChallengeSucceeded: !!other.days[seoulDate()]?.success,
          status: other.days[seoulDate()]?.success
            ? "오늘 챌린지 성공"
            : "오늘 챌린지 미성공",
        });
    }
    return wrap({ code: s.code, people });
  });
  app.post("/v1/social/actions", async (r) => {
    const uid = await auth(r),
      b = z
        .object({
          action: z.enum(["request", "accept", "remove", "block", "unblock"]),
          code: z.string().regex(/^[A-F0-9]{8}$/),
        })
        .strict()
        .parse(r.body),
      target = await repo.findCode(b.code);
    if (!target || target === uid) throw new ApiError("FRIEND_NOT_FOUND", 404);
    return wrap(
      await repo.transaction([uid, target], (states) =>
        once(states[uid], key(r), "social", b, () => {
          const me = states[uid],
            other = states[target];
          if (b.action === "unblock") {
            me.blocked = me.blocked.filter((x) => x !== target);
            return { ok: true };
          }
          if (b.action === "block") {
            if (!me.blocked.includes(target)) me.blocked.push(target);
          } else if (me.blocked.includes(target) || other.blocked.includes(uid))
            throw new ApiError("FRIEND_NOT_FOUND", 404);
          if (b.action === "request") {
            if (me.friends.includes(target))
              throw new ApiError("ALREADY_FRIENDS", 409);
            if (!other.friendRequests.includes(uid))
              other.friendRequests.push(uid);
          } else if (b.action === "accept") {
            if (!me.friendRequests.includes(target))
              throw new ApiError("REQUEST_NOT_FOUND", 404);
            me.friendRequests = me.friendRequests.filter((x) => x !== target);
            if (!me.friends.includes(target)) me.friends.push(target);
            if (!other.friends.includes(uid)) other.friends.push(uid);
          } else {
            me.friends = me.friends.filter((x) => x !== target);
            other.friends = other.friends.filter((x) => x !== uid);
            me.friendRequests = me.friendRequests.filter((x) => x !== target);
            other.friendRequests = other.friendRequests.filter(
              (x) => x !== uid,
            );
          }
          return { ok: true };
        }),
      ),
    );
  });
  app.get<{ Params: { id: string } }>("/v1/friends/:id/garden", async (r) => {
    const uid = await auth(r),
      me = await repo.read(uid);
    if (!me.friends.includes(r.params.id) || me.blocked.includes(r.params.id))
      throw new ApiError("GARDEN_PRIVATE", 403);
    const other = await repo.read(r.params.id);
    if (other.blocked.includes(uid) || !other.garden.public)
      throw new ApiError("GARDEN_PRIVATE", 403);
    return wrap({
      name: other.name,
      character: other.selectedCharacter,
      todayChallengeSucceeded: !!other.days[seoulDate()]?.success,
      challengeSuccessCount: Object.values(other.days).filter(
        (day) => day.success,
      ).length,
      garden: { ...other.garden, placements: gardenPlacements(other.garden) },
    });
  });
  app.post("/v1/optimizer/jobs", async (r) => {
    const uid = await auth(r),
      { text, visitId } = TextInput.parse(r.body),
      requestKey = key(r),
      date = seoulDate(),
      hash = createHash("sha256")
        .update(JSON.stringify([TASK_PROFILE_VERSION, visitId ?? "", text]))
        .digest("hex");
    let created = false;
    const job = await repo.transaction([uid], (states) =>
      once(states[uid], requestKey, "optimizer", { hash }, () => {
        const s = states[uid];
        for (const j of Object.values(s.jobs)) {
          if (Date.now() - j.createdAt > 86400_000) {
            delete s.jobs[j.id];
            continue;
          }
          if (j.status === "running" && Date.now() - j.createdAt > 60_000) {
            j.status = "failed";
            j.error = "AI_INTERRUPTED";
            releaseUserAI(s, j);
          }
        }
        const active = Object.values(s.jobs).find(
          (j) => j.status === "running",
        );
        if (active) throw new ApiError("AI_BUSY", 409);
        reserveUserAI(
          s,
          date,
          "optimizer",
          repo.aiDailyLimit ??
            Math.min(50, Number(process.env.OPTIMIZER_DAILY_LIMIT) || 5),
        );
        created = true;
        const j: AIJob = {
          id: randomUUID(),
          date,
          textHash: hash,
          createdAt: Date.now(),
          status: "running",
          quotaFeature: "optimizer",
        };
        s.jobs[j.id] = j;
        return j;
      }),
    );
    if (created) {
      void repo
        .reserveAI(date, 100)
        .then(() => gemini.optimize(text))
        .then((result) =>
          repo.transaction([uid], (s) => {
            if (!s[uid].jobs[job.id]) throw new ApiError("JOB_NOT_FOUND", 404);
            if (s[uid].jobs[job.id].status === "running") {
              s[uid].jobs[job.id].status = "succeeded";
              s[uid].jobs[job.id].result = result;
            }
          }),
        )
        .catch(async (e) => {
          await repo
            .transaction([uid], (s) => {
              const j = s[uid].jobs[job.id];
              if (!j) throw new ApiError("JOB_NOT_FOUND", 404);
              if (j) {
                j.status = "failed";
                j.error = e instanceof ApiError ? e.code : "AI_FAILED";
                releaseUserAI(s[uid], j);
              }
            })
            .catch(() => {});
        });
    }
    return wrap({ id: job.id, status: job.status });
  });
  app.get<{ Params: { id: string } }>("/v1/optimizer/jobs/:id", async (r) => {
    const uid = await auth(r);
    const current = (await repo.read(uid)).jobs[r.params.id];
    if (!current || Date.now() - current.createdAt > 86400_000)
      throw new ApiError("JOB_NOT_FOUND", 404);
    if (
      current.status !== "running" ||
      Date.now() - current.createdAt <= 60_000
    )
      return wrap(current);
    return wrap(
      await repo.transaction([uid], (s) => {
        const job = s[uid].jobs[r.params.id];
        if (!job || Date.now() - job.createdAt > 86400_000)
          throw new ApiError("JOB_NOT_FOUND", 404);
        if (job.status === "running" && Date.now() - job.createdAt > 60_000) {
          job.status = "failed";
          job.error = "AI_INTERRUPTED";
          releaseUserAI(s[uid], job);
        }
        return job;
      }),
    );
  });
  async function loadModelSnapshot() {
    try {
      const readSnapshot = async (name: string) =>
        JSON.parse(
          await readFile(
            fileURLToPath(
              new URL("../../../../content/fixtures/" + name, import.meta.url),
            ),
            "utf8",
          ),
        ) as {
          models: ModelRecord[];
          developmentSample: boolean;
          asOf: string;
        };
      const [text, media] = await Promise.all([
        readSnapshot("models.json"),
        readSnapshot("models-media.json"),
      ]);
      const policy = JSON.parse(
        await readFile(
          fileURLToPath(
            new URL(
              "../../../../content/catalog/model-availability.json",
              import.meta.url,
            ),
          ),
          "utf8",
        ),
      ) as AvailabilityPolicy;
      return {
        models: publishAvailableModels(
          [...text.models, ...media.models],
          policy,
        ),
        availabilityPolicyVersion: policy.version,
        availabilityCheckedAt: policy.checkedAt,
        developmentSample: text.developmentSample || media.developmentSample,
        textAsOf: text.asOf,
        mediaAsOf: media.asOf,
      };
    } catch {
      return { models: [], developmentSample: true };
    }
  }
  let modelSnapshot: ReturnType<typeof loadModelSnapshot> | undefined;
  let modelSnapshotAt = 0;
  function models() {
    if (!modelSnapshot || Date.now() - modelSnapshotAt > 60000) {
      modelSnapshotAt = Date.now();
      modelSnapshot = loadModelSnapshot();
    }
    return modelSnapshot;
  }
  app.get("/v1/models", async (r) => {
    await auth(r);
    return wrap({
      ...(await models()),
      groupPolicyVersion: MODEL_GROUP_POLICY_VERSION,
    });
  });
  app.post("/v1/recommendations", async (r) => {
    const uid = await auth(r),
      b = AnalyzeInput.parse(r.body),
      requestKey = key(r),
      hash = createHash("sha256")
        .update(
          JSON.stringify(
            b.outputKind
              ? [TASK_PROFILE_VERSION, b.visitId ?? "", b.outputKind, b.text]
              : [TASK_PROFILE_VERSION, b.visitId ?? "", b.text],
          ),
        )
        .digest("hex");
    const s = await repo.read(uid);
    const old = s.requests[requestKey];
    if (old) {
      return wrap(
        await repo.transaction([uid], (st) =>
          once(st[uid], requestKey, "recommendation", b, () => null),
        ),
      );
    }
    const previous = Object.values(s.jobs).find(
      (j) =>
        j.status === "succeeded" &&
        j.textHash === hash &&
        (j.result || j.taskAnalysis) &&
        Date.now() - j.createdAt < 86400_000,
    );
    let task: TaskProfile;
    let source: string;
    if (previous?.taskAnalysis || previous?.result) {
      task = previous.taskAnalysis?.task ?? previous.result!.taskProfile;
      source = previous.taskAnalysis?.source ?? previous.result!.source;
    } else {
      const date = seoulDate(),
        limit =
          repo.aiDailyLimit ??
          Math.min(50, Number(process.env.RECOMMENDATION_DAILY_LIMIT) || 5),
        jobId = randomUUID();
      await repo.transaction([uid], (states) => {
        const state = states[uid];
        if (
          Object.values(state.jobs).some(
            (j) => j.status === "running" && Date.now() - j.createdAt < 60000,
          )
        )
          throw new ApiError("AI_BUSY", 409);
        const claims = (state.claims[date] ??= []);
        reserveUserAI(state, date, "analysis", limit);
        // Retain the existing analysis history for compatibility; limits use aiUsage.
        claims.push("analysis");
        state.jobs[jobId] = {
          id: jobId,
          date,
          textHash: hash,
          createdAt: Date.now(),
          status: "running",
          quotaFeature: "analysis",
        };
      });
      try {
        await repo.reserveAI(date, 100);
        const analysis = await gemini.analyze(b.text, b.outputKind);
        task = analysis.task;
        source = analysis.source;
        await repo.transaction([uid], (st) => {
          const job = st[uid].jobs[jobId];
          if (!job) throw new ApiError("JOB_NOT_FOUND", 404);
          job.status = "succeeded";
          job.taskAnalysis = analysis;
        });
      } catch (e) {
        await repo
          .transaction([uid], (st) => {
            const job = st[uid].jobs[jobId];
            if (!job) throw new ApiError("JOB_NOT_FOUND", 404);
            job.status = "failed";
            job.error = e instanceof ApiError ? e.code : "AI_FAILED";
            releaseUserAI(st[uid], job);
          })
          .catch(() => {});
        throw e;
      }
    }
    task = {
      ...task,
      outputKind: b.outputKind ?? task.outputKind ?? "text",
      media: b.media
        ? {
            ...(b.outputKind && b.outputKind !== task.outputKind
              ? {}
              : task.media),
            ...b.media,
          }
        : b.outputKind && b.outputKind !== task.outputKind
          ? undefined
          : task.media,
    };
    const snapshot = await models(),
      tier = b.tier ?? task.suggestedTier;
    const result = recommend(snapshot.models, task, tier, new Date(), false);
    return repo.transaction([uid], (st) => {
      if (
        !Object.values(st[uid].jobs).some(
          (j) => j.textHash === hash && j.status === "succeeded",
        )
      )
        throw new ApiError("UNAUTHENTICATED", 401);
      return wrap(
        once(st[uid], requestKey, "recommendation", b, () => ({
          ...result,
          tier,
          outputKind: task.outputKind,
          task,
          source,
          snapshotSample: snapshot.developmentSample,
          policyVersion: RECOMMENDATION_POLICY_VERSION,
          analysisVersion: TASK_PROFILE_VERSION,
          groupPolicyVersion: MODEL_GROUP_POLICY_VERSION,
        })),
      );
    });
  });
  app.delete("/v1/account", async (r) => {
    const id = await auth(r);
    if (beforeDelete) await beforeDelete(id);
    await repo.remove(id);
    return wrap({ deleted: true });
  });
}
