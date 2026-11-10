import test from "node:test";
import assert from "node:assert/strict";
import {
  initialGame as latestInitialGame,
  stepGame,
  replayGame as latestReplayGame,
  RULES,
  TIMING,
  crossingPosition,
  jumpHeight,
  earnedBudget,
  type GameInput,
} from "@aimi/game-core";
import { recommend, modelTier, type Model } from "@aimi/recommender";
import { newState, FileRepository } from "../src/modules/repository.js";
import {
  daily,
  startPlay as latestStartPlay,
  completePlay,
  submitAttempt,
  purchase,
  saveGarden,
  once,
} from "../src/modules/domain.js";
import { evaluateChallenge } from "../src/services/content/fixture.js";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
// Preserve the original v2 replay/economy regression cases unchanged in intent.
const initialGame = (
  kind: Parameters<typeof latestInitialGame>[0],
  seed: number,
  version = "prototype-game-v2",
) => latestInitialGame(kind, seed, version);
const replayGame = (
  kind: Parameters<typeof latestReplayGame>[0],
  seed: number,
  inputs: Parameters<typeof latestReplayGame>[2],
  ticks: number,
  version = "prototype-game-v2",
) => latestReplayGame(kind, seed, inputs, ticks, version);
const startPlay = (...args: Parameters<typeof latestStartPlay>) => {
  const play = latestStartPlay(...args);
  play.version = "prototype-game-v2";
  return play;
};
const ids = ["apple", "two", "red", "white", "above", "watercolor"];
function winningLog(): GameInput[] {
  const inputs: GameInput[] = [];
  for (let t = 75; t <= 1800; t += TIMING.obstacleTicks)
    inputs.push({ tick: t, action: "jump" });
  return inputs;
}
test("Dino replays to exact cap and terminal simulation cannot collect more", () => {
  const s = replayGame("dino", 123, winningLog(), 1800);
  assert.equal(s.score, 100);
  assert.equal(s.status, "cleared");
  assert.equal(s.ep, 18);
  assert.deepEqual(stepGame(s, ["jump"]), s);
  assert.equal(earnedBudget(1000), 150);
});
test("impossible logs and events after terminal are rejected", () => {
  assert.throws(() =>
    replayGame(
      "dino",
      1,
      [
        { tick: 1, action: "jump" },
        { tick: 1, action: "left" },
      ],
      100,
    ),
  );
  assert.throws(() => replayGame("dino", 1, [], 7201));
  assert.throws(() => replayGame("dino", 1, [], TIMING.obstacleTicks + 10));
  assert.equal(
    replayGame("dino", 1, [], TIMING.obstacleTicks - TIMING.contactTicks)
      .status,
    "failed",
  );
});
test("crossing revisit gives no extra points and forward input has hop cooldown", () => {
  let s = initialGame("crossing", 1);
  s = stepGame(s, ["forward"]);
  assert.equal(s.score, 1);
  s = stepGame(s, ["forward"]);
  assert.equal(s.score, 1);
  for (let i = 0; i < TIMING.crossingHopTicks; i++) s = stepGame(s, []);
  s = stepGame(s, ["back"]);
  for (let i = 0; i < TIMING.crossingHopTicks; i++) s = stepGame(s, []);
  s = stepGame(s, ["forward"]);
  assert.equal(s.score, 1);
});
test("rule grading preserves required subject and different model thresholds", () => {
  assert.equal(evaluateChallenge(ids, "low", "2026-11-08").score, 100);
  assert.equal(evaluateChallenge(ids, "low", "2026-11-08").passed, true);
  const noStyle = ids.filter((x) => x !== "watercolor");
  assert.equal(evaluateChallenge(noStyle, "low", "2026-11-08").score, 85);
  assert.equal(
    evaluateChallenge(
      ids.map((x) => (x === "apple" ? "pear" : x)),
      "high",
      "2026-11-08",
    ).passed,
    false,
  );
  assert.equal(
    evaluateChallenge([...ids, "one"], "high", "2026-11-08").image,
    null,
  );
  assert.throws(() =>
    evaluateChallenge([...ids, "apple"], "low", "2026-11-08"),
  );
});
test("uncovered result and over-budget preserve counters; success pays once", () => {
  const s = newState("user", true),
    date = "2026-11-08",
    now = Date.parse(date + "T12:00:00+09:00");
  const p = startPlay(s, "dino", now - 70000);
  completePlay(
    s,
    p.id,
    { inputs: winningLog(), ticks: 1800, abandon: false },
    now,
  );
  assert.equal(s.balance, 143);
  assert.throws(
    () => submitAttempt(s, { keywordIds: ["cat"], model: "low", date }, now),
    /RESULT_VARIANT_UNAVAILABLE/,
  );
  assert.equal(daily(s, date).attemptsUsed, 0);
  const a = submitAttempt(s, { keywordIds: ids, model: "low", date }, now);
  assert.equal(a.score, 100);
  assert.equal(a.ep, 15);
  assert.throws(
    () => submitAttempt(s, { keywordIds: ids, model: "low", date }, now),
    /ALREADY_SUCCEEDED/,
  );
  assert.equal(s.balance, 158);
});
test("completion idempotent and daily EP cap; best budget does not accumulate", () => {
  const s = newState("user", true),
    now = Date.parse("2026-11-08T12:00:00+09:00");
  for (let i = 0; i < 5; i++) {
    const p = startPlay(s, "dino", now - 70000);
    const r = completePlay(
      s,
      p.id,
      { inputs: winningLog(), ticks: 1800, abandon: false },
      now,
    );
    assert.equal(r.budget, 150);
    assert.deepEqual(
      completePlay(s, p.id, { inputs: [], ticks: 0, abandon: true }, now),
      r,
    );
  }
  assert.equal(s.balance, 185);
  assert.throws(() => startPlay(s, "dino", now), /DAILY_LIMIT/);
});
test("last attempt, normal failure vs system failure, Seoul day boundary", () => {
  const s = newState("user", true),
    now = Date.parse("2026-11-08T23:59:59+09:00"),
    p = startPlay(s, "dino", now - 70000);
  completePlay(
    s,
    p.id,
    { inputs: winningLog(), ticks: 1800, abandon: false },
    now,
  );
  for (let i = 0; i < 5; i++) {
    const a = submitAttempt(
      s,
      { keywordIds: ["apple"], model: "low", date: p.date },
      now,
    );
    assert.equal(a.passed, false);
    assert.equal(a.ep, 0);
  }
  assert.throws(
    () =>
      submitAttempt(s, { keywordIds: ids, model: "low", date: p.date }, now),
    /DAILY_LIMIT/,
  );
  assert.throws(
    () =>
      submitAttempt(
        s,
        { keywordIds: ids, model: "low", date: p.date },
        now + 2000,
      ),
    /MISSION_DATE_CHANGED/,
  );
  assert.equal(daily(s, "2026-11-09").playsUsed, 0);
});
test("cannot complete faster than ticks or exceed restore grace", () => {
  const s = newState("u", true),
    p = startPlay(s, "dino", 1000);
  assert.throws(
    () =>
      completePlay(
        s,
        p.id,
        { inputs: winningLog(), ticks: 1800, abandon: false },
        2000,
      ),
    /INVALID_GAME_TIME/,
  );
  assert.throws(
    () =>
      completePlay(
        s,
        p.id,
        { inputs: [], ticks: 0, abandon: true },
        1000 + RULES.pauseGraceMs + 1,
      ),
    /EXPIRED/,
  );
});
test("purchase and equipment ownership, revision conflicts", () => {
  const s = newState("u", true);
  purchase(s, "plant");
  assert.equal(s.balance, 65);
  purchase(s, "plant");
  assert.equal(s.inventory.filter((id) => id === "plant").length, 2);
  assert.throws(() => purchase(s, "bear"), /ALREADY_OWNED/);
  assert.throws(() => purchase(s, "cloud"), /INSUFFICIENT_EP/);
  assert.throws(
    () => saveGarden(s, { revision: 0, character: "bunny", placements: [] }),
    /NOT_OWNED/,
  );
  assert.throws(
    () =>
      saveGarden(s, {
        revision: 0,
        character: "seed",
        placements: [{ itemId: "fence", x: 0.5, y: 0.5 }],
      }),
    /INVALID_EQUIPMENT/,
  );
  saveGarden(s, {
    revision: 0,
    character: "bear",
    placements: [{ itemId: "plant", x: 0.8, y: 0.5 }],
  });
  assert.equal(s.selectedCharacter, "bear");
  assert.throws(
    () => saveGarden(s, { revision: 0, character: "seed", placements: [] }),
    /REVISION_CONFLICT/,
  );
});
test("durable repository serializes same-key concurrent purchases and survives restart", async () => {
  const dir = await mkdtemp(join(tmpdir(), "aimi-store-"));
  try {
    const path = join(dir, "data.json"),
      repo = new FileRepository(path);
    await repo.read("user");
    const result = await Promise.all(
      Array.from({ length: 10 }, () =>
        repo.transaction(["user"], (s) =>
          once(s.user, "request-key", "purchase", { id: "plant" }, () =>
            purchase(s.user, "plant"),
          ),
        ),
      ),
    );
    assert.equal(result.length, 10);
    const state = await new FileRepository(path).read("user");
    assert.equal(state.balance, 65);
    assert.equal(state.inventory.filter((i) => i === "plant").length, 1);
    await assert.rejects(
      repo.transaction(["user"], (s) =>
        once(s.user, "request-key", "purchase", { id: "bench" }, () => null),
      ),
      /IDEMPOTENCY_CONFLICT/,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
function models(): Model[] {
  return Array.from({ length: 12 }, (_, i) => ({
    id: "model-" + i,
    name: "Evaluation fixture " + i,
    provider: "Fixture",
    context: 10000,
    maxOutput: 2000,
    capabilities: ["text", "json"],
    inputPrice: (12 - i) * 0.000001,
    outputPrice: (12 - i) * 0.000001,
    productTier: i < 4 ? "Small" : i < 8 ? "Medium" : "High",
    intelligence: i * 3,
    coding: i * 3,
    speed: 100,
    latency: 1,
    source: "synthetic test fixture",
    asOf: "2026-11-08",
    indexVersion: "5",
    verified: true,
  }));
}
test("quality gate then cheapest distinct top3, no forced fill and stale rejection", () => {
  const data = models(),
    now = new Date("2026-11-08T12:00:00Z"),
    r = recommend(
      data,
      { taskType: "general", requiredCapabilities: ["json"] },
      "High",
      now,
    );
  assert.equal(r.status, "ok");
  assert.equal(r.models.length, 3);
  assert.equal(r.models[0].id, "model-11");
  assert.ok(r.models.every((m) => m.intelligence! >= r.threshold!));
  assert.equal(
    recommend(
      data,
      { taskType: "general", requiredCapabilities: ["image"] },
      "Small",
      now,
    ).models.length,
    0,
  );
  assert.equal(
    recommend(
      data.slice(0, 9),
      { taskType: "general", requiredCapabilities: [] },
      "Small",
      now,
    ).status,
    "INSUFFICIENT_EVIDENCE",
  );
  assert.equal(
    recommend(
      data,
      { taskType: "coding", requiredCapabilities: [] },
      "Medium",
      new Date("2027-01-01"),
    ).models.length,
    0,
  );
});
test("crossing and runner can complete with deterministic input plans", () => {
  let crossing = initialGame("crossing", 1);
  const inputs: GameInput[] = [];
  // Plan a full hop, so the bot cannot enter a tile that becomes unsafe mid-hop.
  while (crossing.tick < RULES.maxTicks && crossing.status === "running") {
    const candidates = (["forward", "left", "right", "back", null] as const)
      .map((action) => {
        let state = stepGame(crossing, action ? [action] : []);
        for (
          let n = 1;
          n < TIMING.crossingHopTicks && state.status === "running";
          n++
        )
          state = stepGame(state);
        return { action, s: state };
      })
      .filter((x) => x.s.status !== "failed");
    assert.ok(candidates.length);
    candidates.sort(
      (a, b) => b.s.row - a.s.row || (a.action === null ? -1 : 1),
    );
    const next = candidates[0];
    if (next.action)
      inputs.push({ tick: crossing.tick + 1, action: next.action });
    crossing = next.s;
  }
  assert.equal(crossing.status, "cleared");
  assert.deepEqual(replayGame("crossing", 1, inputs, crossing.tick), crossing);
  let runner = initialGame("runner", 123);
  const log: GameInput[] = [];
  for (let tick = 1; tick <= 1800; tick++) {
    const nextObstacle = Math.floor(tick / TIMING.obstacleTicks) + 1,
      blocked = awaitObstacle(123, nextObstacle);
    const desired = (blocked + 1) % 3;
    let action: "left" | "right" | undefined;
    if (tick % TIMING.obstacleTicks >= 50 && tick % TIMING.obstacleTicks <= 72)
      action =
        runner.lane > desired
          ? "left"
          : runner.lane < desired
            ? "right"
            : undefined;
    if (action) log.push({ tick, action });
    runner = stepGame(runner, action ? [action] : []);
  }
  assert.equal(runner.status, "cleared");
  assert.deepEqual(replayGame("runner", 123, log, 1800), runner);
});
import { obstacleLane as awaitObstacle } from "@aimi/game-core";

test("mobile pacing leaves visible reaction time and consistent legacy replay", () => {
  assert.ok(TIMING.obstacleTicks / RULES.tickRate >= 3);
  assert.ok(TIMING.crossingLaneTicks / RULES.tickRate >= 1.2);
  assert.equal(stepGame(initialGame("dino", 1)).status, "running");
  let s = initialGame("runner", 1);
  s = stepGame(s, ["left"]);
  assert.equal(stepGame(s, ["right"]).lane, s.lane);
  const oldLog = Array.from({ length: 33 }, (_, i) => ({
    tick: 45 + i * 54,
    action: "jump" as const,
  }));
  assert.equal(
    replayGame("dino", 123, oldLog, 1800, "prototype-game-v1").status,
    "cleared",
  );
  assert.throws(() => replayGame("dino", 1, [], 1, "unknown"), /VERSION/);
  for (let tick = 1; tick < 36; tick++) {
    const previous = crossingPosition(123, 3, tick - 1),
      current = crossingPosition(123, 3, tick);
    assert.ok((current - previous + 5) % 5 < 0.04);
  }
  // Jump's takeoff alone is no longer enough to clear a cactus.
  let d = initialGame("dino", 1);
  for (let t = 1; t <= 84; t++) d = stepGame(d, t === 84 ? ["jump"] : []);
  assert.ok(jumpHeight(d) < 44);
  assert.equal(d.status, "failed");
});

import {
  gardenPlacements,
  gardenPlacementInBounds,
  clampGardenPlacement,
  GardenInput,
  remainingItemCount,
} from "@aimi/contracts";
test("free garden validates bounds, duplicates, ownership, limit and revision without fixed slots", () => {
  const s = newState("free", true);
  purchase(s, "plant");
  const save = (placements: any[], revision = 0) =>
    saveGarden(s, { revision, character: "seed", placements });
  assert.throws(
    () => save([{ itemId: "plant", x: 0, y: 0.5 }]),
    /OUT_OF_BOUNDS/,
  );
  assert.throws(
    () => save([{ itemId: "plant", x: 0.5, y: 0.01 }]),
    /OUT_OF_BOUNDS/,
  );
  assert.throws(
    () => save([{ itemId: "plant", x: NaN, y: 0.5 }]),
    /OUT_OF_BOUNDS/,
  );
  assert.throws(
    () =>
      save([
        { itemId: "plant", x: 0.3, y: 0.5 },
        { itemId: "plant", x: 0.8, y: 0.7 },
      ]),
    /DUPLICATE/,
  );
  assert.throws(
    () => save([{ itemId: "seed", x: 0.3, y: 0.5 }]),
    /INVALID_EQUIPMENT/,
  );
  assert.throws(
    () =>
      save(
        Array.from({ length: 13 }, () => ({ itemId: "plant", x: 0.3, y: 0.5 })),
      ),
    /ITEM_LIMIT/,
  );
  assert.equal(s.garden.revision, 0);
  assert.equal(
    GardenInput.safeParse({
      revision: 0,
      character: "seed",
      placements: [{ itemId: "plant", x: 0.3, y: 0.5, scale: 10 }],
    }).success,
    false,
  );
  save([
    { itemId: "plant", x: 0.8, y: 0.5 },
    { itemId: "flower", x: 0.8, y: 0.5 },
  ]);
  assert.equal(s.garden.placements![0].x, 0.8); // overlap and any in-bounds location are allowed
  assert.deepEqual(s.garden.slots, {});
  assert.throws(() => save([], 0), /REVISION_CONFLICT/);
  assert.equal(s.garden.placements!.length, 2);
  save([], 1);
  assert.deepEqual(s.garden.placements, []);
});
test("legacy garden positions migrate safely and cleared layouts do not resurrect old slots", () => {
  const old = {
    slots: {
      back: "fence",
      "front-left": "plant",
      "front-right": "flower",
      "back-right": "bench",
    },
  };
  const migrated = gardenPlacements(old);
  assert.equal(migrated.length, 4);
  assert.ok(migrated.every(gardenPlacementInBounds));
  assert.equal(
    gardenPlacements({ slots: { back: "plant", "front-left": "plant" } })
      .length,
    1,
  );
  assert.deepEqual(gardenPlacements({ ...old, placements: [] }), []);
  for (const id of ["plant", "flower", "bench", "fence"]) {
    for (const [x, y] of [
      [-5, -5],
      [5, 5],
      [0.5, 0.6],
    ])
      assert.ok(
        gardenPlacementInBounds(clampGardenPlacement({ itemId: id, x, y })),
      );
  }
});

test("catalogue tiers are disjoint, missing evidence is excluded and recommendations stay in tier", () => {
  const data = models();
  assert.deepEqual(
    data.map((m) => modelTier(data, m)),
    [
      ...Array(4).fill("Small"),
      ...Array(4).fill("Medium"),
      ...Array(4).fill("High"),
    ],
  );
  assert.equal(modelTier(data, { ...data[0], verified: false }), "Small");
  assert.equal(modelTier(data, { ...data[0], intelligence: null }), "Small");
  const ties = data.map((m) => ({ ...m, intelligence: 8 }));
  assert.deepEqual(
    ties.map((m) => modelTier(ties, m)),
    data.map((m) => modelTier(data, m)),
  );
  for (const tier of ["Small", "Medium", "High"] as const) {
    const r = recommend(
      data,
      { taskType: "general", requiredCapabilities: [] },
      tier,
      new Date("2026-11-08"),
    );
    assert.ok(r.models.length > 0 && r.models.length <= 3);
    assert.ok(r.models.every((m) => modelTier(data, m) === tier));
  }
});

test("quantity purchases reserve exact EP; copies place independently and return to inventory", () => {
  const s = newState("quantity", true);
  const r = purchase(s, "plant", 2);
  assert.equal(r.total, 120);
  assert.equal(r.quantity, 2);
  assert.equal(s.balance, 5);
  const before = structuredClone(s);
  assert.throws(() => purchase(s, "plant", 2), /INSUFFICIENT_EP/);
  assert.deepEqual(s, before);
  for (const quantity of [0, -1, 1.5, 100, NaN])
    assert.throws(() => purchase(s, "plant", quantity), /QUANTITY/);
  assert.throws(() => purchase(s, "bear", 2), /QUANTITY/);
  const one = { instanceId: "plant-a", itemId: "plant", x: 0.3, y: 0.5 };
  const two = { instanceId: "plant-b", itemId: "plant", x: 0.7, y: 0.7 };
  saveGarden(s, { revision: 0, character: "seed", placements: [one, two] });
  assert.equal(s.garden.placements?.length, 2);
  assert.equal(
    remainingItemCount(s.inventory, gardenPlacements(s.garden), "plant"),
    0,
  );
  assert.throws(
    () =>
      saveGarden(s, {
        revision: 1,
        character: "seed",
        placements: [one, two, { ...one, instanceId: "plant-c" }],
      }),
    /INVALID_EQUIPMENT/,
  );
  assert.throws(
    () =>
      saveGarden(s, {
        revision: 1,
        character: "seed",
        placements: [one, { ...two, instanceId: "plant-a" }],
      }),
    /DUPLICATE/,
  );
  saveGarden(s, {
    revision: 1,
    character: "seed",
    placements: [{ ...two, x: 0.6 }],
  });
  assert.equal(s.garden.placements?.[0].instanceId, "plant-b");
  assert.equal(s.inventory.filter((id) => id === "plant").length, 2);
});

test("quantity purchase retries are atomic and do not multiply stock or EP debit", async () => {
  const repo = new FileRepository();
  await repo.read("stock");
  await Promise.all(
    Array.from({ length: 10 }, () =>
      repo.transaction(["stock"], (states) =>
        once(
          states.stock,
          "qty-request",
          "purchase",
          { itemId: "plant", quantity: 2 },
          () => purchase(states.stock, "plant", 2),
        ),
      ),
    ),
  );
  const s = await repo.read("stock");
  assert.equal(s.balance, 5);
  assert.equal(s.inventory.filter((id) => id === "plant").length, 2);
  await assert.rejects(
    repo.transaction(["stock"], (states) =>
      once(
        states.stock,
        "qty-request",
        "purchase",
        { itemId: "plant", quantity: 1 },
        () => purchase(states.stock, "plant", 1),
      ),
    ),
    /IDEMPOTENCY_CONFLICT/,
  );
});

import { catalogClassifications } from "@aimi/recommender";
import { readFile } from "node:fs/promises";
test("complete catalogue classification leaves no model unclassified and keeps provisional tiers outside recommendation evidence", async () => {
  const snapshot = JSON.parse(
    await readFile(
      new URL("../../../content/fixtures/models.json", import.meta.url),
      "utf8",
    ),
  );
  const classes = catalogClassifications(snapshot.models);
  assert.equal(
    classes.size,
    new Set(snapshot.models.map((m: Model) => m.id)).size,
  );
  for (const tier of ["Small", "Medium", "High"])
    assert.ok([...classes.values()].some((c) => c.tier === tier));
  assert.ok([...classes.values()].some((c) => c.basis === "provisional"));
  const priced = models().map((m) => ({
    ...m,
    verified: false,
    intelligence: null,
    coding: null,
  }));
  const mapped = catalogClassifications(priced);
  assert.equal(mapped.size, priced.length);
  assert.equal(
    recommend(
      priced,
      { taskType: "general", requiredCapabilities: [] },
      "High",
      new Date("2026-11-08"),
    ).status,
    "INSUFFICIENT_EVIDENCE",
  );
  const data = models(),
    free = {
      ...data[7],
      id: data[7].id + ":free",
      verified: false,
      inputPrice: 0,
      outputPrice: 0,
    };
  const variants = catalogClassifications([...data, free]);
  assert.equal(variants.get(free.id)?.tier, variants.get(data[7].id)?.tier);
  assert.equal(variants.get(free.id)?.basis, "variant");
});

test("stored placements use current artwork bounds before rendering and saving, preserving copy IDs", () => {
  const placements = [
    { itemId: "flower", instanceId: "flower-one", x: 0.98, y: 0.12 },
    { itemId: "fence", instanceId: "fence-one", x: 0.1, y: 0.12 },
    { itemId: "fence", instanceId: "fence-two", x: 0.9, y: 0.98 },
  ];
  const normalized = gardenPlacements({ placements });
  assert.ok(normalized.every(gardenPlacementInBounds));
  assert.deepEqual(
    normalized.map((p) => p.instanceId),
    placements.map((p) => p.instanceId),
  );
  assert.deepEqual(gardenPlacements({ placements: normalized }), normalized);
  assert.equal(placements[0].x, 0.98);
  const s = newState("garden-migration", true);
  s.inventory.push("flower", "fence", "fence");
  saveGarden(s, {
    revision: s.garden.revision,
    character: s.selectedCharacter,
    placements: normalized,
  });
  assert.deepEqual(s.garden.placements, normalized);
});

test("expanded shop items purchase, place and equip using the same ownership and bounds rules", async () => {
  const { EXPANSION_CATALOG, EXPANSION_GEOMETRY } =
    await import("@aimi/contracts");
  assert.equal(EXPANSION_CATALOG.filter((i) => i.kind === "item").length, 30);
  assert.equal(
    EXPANSION_CATALOG.filter((i) => i.kind === "character").length,
    10,
  );
  assert.equal(new Set(EXPANSION_CATALOG.map((i) => i.id)).size, 40);
  const s = newState("expanded-shop", true);
  s.balance = 20000;
  for (const item of EXPANSION_CATALOG) {
    purchase(s, item.id);
    if (item.kind === "item") {
      assert.ok(EXPANSION_GEOMETRY[item.id]);
      const placement = clampGardenPlacement({
        itemId: item.id,
        instanceId: item.id,
        x: 0,
        y: 0,
      });
      saveGarden(s, {
        revision: s.garden.revision,
        character: "seed",
        placements: [placement],
      });
      assert.ok(gardenPlacementInBounds(placement));
    } else {
      saveGarden(s, {
        revision: s.garden.revision,
        character: item.id,
        placements: [],
      });
      assert.equal(s.selectedCharacter, item.id);
    }
  }
});
test("development friend is reciprocal, removable and exposes only the existing public social projection", async () => {
  const { seedDevelopmentFriend, DEVELOPMENT_FRIEND_ID } =
    await import("../src/modules/development-friend.js");
  const Fastify = (await import("fastify")).default;
  const { registerPrototype } = await import("../src/modules/routes.js");
  const repo = new FileRepository();
  await seedDevelopmentFriend(repo, "viewer");
  await seedDevelopmentFriend(repo, "viewer");
  assert.deepEqual((await repo.read("viewer")).friends, [
    DEVELOPMENT_FRIEND_ID,
  ]);
  assert.ok(
    (await repo.read(DEVELOPMENT_FRIEND_ID)).friends.includes("viewer"),
  );
  const app = Fastify();
  registerPrototype(app, repo, async () => "viewer");
  try {
    const social = (
      await app.inject({ method: "GET", url: "/v1/social" })
    ).json().data;
    assert.equal(social.people.length, 1);
    assert.equal(social.people[0].character, "fox");
    assert.equal(social.people[0].challengeSuccessCount, 1);
    await repo.transaction([DEVELOPMENT_FRIEND_ID], (states) => {
      states[DEVELOPMENT_FRIEND_ID].days["2026-01-01"] = {
        ...daily(states[DEVELOPMENT_FRIEND_ID]),
        date: "2026-01-01",
        success: true,
      };
      states[DEVELOPMENT_FRIEND_ID].days["2026-01-02"] = {
        ...daily(states[DEVELOPMENT_FRIEND_ID]),
        date: "2026-01-02",
        success: false,
      };
    });
    const updated = (
      await app.inject({ method: "GET", url: "/v1/social" })
    ).json().data;
    assert.equal(updated.people[0].challengeSuccessCount, 2);
    assert.equal(social.people[0].balance, undefined);
    assert.equal(social.people[0].inventory, undefined);
    const response = await app.inject({
      method: "GET",
      url: "/v1/friends/" + DEVELOPMENT_FRIEND_ID + "/garden",
    });
    const garden = response.json().data;
    assert.equal(garden.garden.placements.length, 5);
    assert.deepEqual(Object.keys(garden).sort(), [
      "challengeSuccessCount",
      "character",
      "garden",
      "name",
      "todayChallengeSucceeded",
    ]);
    assert.equal(garden.todayChallengeSucceeded, true);
    assert.equal(garden.challengeSuccessCount, 2);
    await repo.transaction(["viewer"], (states) => {
      states.viewer.friends = [];
    });
    await seedDevelopmentFriend(repo, "viewer");
    assert.deepEqual((await repo.read("viewer")).friends, []);
    assert.equal(
      (
        await app.inject({
          method: "GET",
          url: "/v1/friends/" + DEVELOPMENT_FRIEND_ID + "/garden",
        })
      ).statusCode,
      403,
    );
    await seedDevelopmentFriend(repo, "viewer", true);
    assert.deepEqual((await repo.read("viewer")).friends, [
      DEVELOPMENT_FRIEND_ID,
    ]);
    assert.equal(
      (
        await app.inject({
          method: "GET",
          url: "/v1/friends/" + DEVELOPMENT_FRIEND_ID + "/garden",
        })
      ).statusCode,
      200,
    );
  } finally {
    await app.close();
  }
});

test("approved shop prices and challenge bonus stay within their published tiers", async () => {
  const { ECONOMY_POLICY, SHOP_PRICES, challengeRewardEP, EXPANSION_CATALOG } =
    await import("@aimi/contracts");
  const { CATALOG } = await import("../src/services/content/fixture.js");
  assert.equal(
    ECONOMY_POLICY.attendance +
      ECONOMY_POLICY.tip +
      ECONOMY_POLICY.epCapPerDay +
      ECONOMY_POLICY.challengeBase +
      ECONOMY_POLICY.challengeBonusCap,
    34,
  );
  for (let budget = 0; budget <= 150; budget++)
    for (let cost = 0; cost <= budget; cost++) {
      const ep = challengeRewardEP(budget, cost);
      assert.ok(Number.isInteger(ep) && ep >= 10 && ep <= 15);
    }
  assert.equal(CATALOG.length, 48);
  for (const item of CATALOG) {
    assert.equal(item.price, SHOP_PRICES[item.id]);
    if (item.kind === "character" && item.id !== "seed")
      assert.ok(
        (item.price >= 120 && item.price <= 180) ||
          (item.price >= 250 && item.price <= 350),
      );
    if (item.kind === "item")
      assert.ok(
        (item.price >= 30 && item.price <= 100) ||
          (item.price >= 150 && item.price <= 250),
      );
  }
  for (const item of EXPANSION_CATALOG)
    assert.equal(item.price, SHOP_PRICES[item.id]);
});

test("model family is stable under price/score/population changes; missing coding evidence never becomes a score", async () => {
  const snapshot = JSON.parse(
    await readFile(
      new URL("../../../content/fixtures/models.json", import.meta.url),
      "utf8",
    ),
  );
  const original = snapshot.models as Model[];
  const changed = original.map((m) => ({
    ...m,
    inputPrice: m.inputPrice * 1000,
    outputPrice: 0,
    intelligence: 99,
  }));
  assert.deepEqual(
    [...catalogClassifications(original)].map(([id, c]) => [id, c.tier]),
    [...catalogClassifications(changed)].map(([id, c]) => [id, c.tier]),
  );
  const pro = original.find((m) => m.id === "xiaomi/mimo-v2.6-pro")!;
  assert.equal(modelTier([pro], pro), "High");
  assert.equal(
    recommend(
      original,
      { taskType: "coding", requiredCapabilities: [] },
      "High",
      new Date("2026-11-09"),
    ).status,
    "INSUFFICIENT_EVIDENCE",
  );
  const mapped = original.filter((m) => m.verified);
  assert.equal(mapped.length, 10);
  assert.ok(mapped.every((m) => m.aaMetadata?.matched));
  assert.ok(
    mapped.some((m) =>
      Object.values(m.aaMetadata!.indices).some((v) => typeof v === "number"),
    ),
  );
  assert.ok(mapped.every((m) => m.coding === null));
});

test("adversarial cheap candidates cannot bypass quality, capability, freshness or group filters", () => {
  const data = models(),
    now = new Date("2026-11-10T12:00:00Z");
  const task = { taskType: "general" as const, requiredCapabilities: ["json"] };
  const bad: Model[] = [
    {
      ...data[11],
      id: "too-weak",
      intelligence: 1,
      inputPrice: 0,
      outputPrice: 0,
    },
    {
      ...data[11],
      id: "no-json",
      capabilities: ["text"],
      inputPrice: 0,
      outputPrice: 0,
    },
    {
      ...data[11],
      id: "unreviewed",
      verified: false,
      inputPrice: 0,
      outputPrice: 0,
    },
    {
      ...data[11],
      id: "too-small-context",
      context: 100,
      inputPrice: 0,
      outputPrice: 0,
    },
    { ...data[11], id: "negative-price", inputPrice: -1, outputPrice: 0 },
    { ...data[11], id: "nan-price", inputPrice: Number.NaN, outputPrice: 0 },
    {
      ...data[11],
      id: "stale",
      asOf: "2026-01-01",
      inputPrice: 0,
      outputPrice: 0,
    },
    {
      ...data[11],
      id: "invalid-date",
      asOf: "not-a-date",
      inputPrice: 0,
      outputPrice: 0,
    },
  ];
  const r = recommend([...data, ...bad], task, "High", now);
  assert.deepEqual(
    r.models.map((m) => m.id),
    ["model-11", "model-10", "model-9"],
  );
  const missing = data.map((m) => ({
    ...m,
    capabilities: m.productTier === "Small" ? ["text"] : ["text", "json"],
  }));
  const none = recommend(missing, task, "Small", now);
  assert.equal(none.status, "NO_ELIGIBLE_MODEL");
  assert.deepEqual(none.models, []);
});

test("future-dated prices do not count as fresh recommendation evidence", () => {
  const data = models().map((m) => ({ ...m, asOf: "2030-01-01" }));
  assert.equal(
    recommend(
      data,
      { taskType: "general", requiredCapabilities: [] },
      "High",
      new Date("2026-11-10"),
    ).models.length,
    0,
  );
});

import {
  generatedPack,
  packVersion,
  puzzleContent,
  evaluatePuzzle,
  puzzleFeedback,
} from "../src/services/content/generated.js";
test("ten generated packs use exact-set matching and initial projections never disclose answers", () => {
  const seen = new Set<string>();
  for (let n = 0; n < 10; n++) {
    const date = new Date(Date.UTC(2026, 10, 11 + n))
        .toISOString()
        .slice(0, 10),
      p = generatedPack(date);
    seen.add(p.id);
    const pub = puzzleContent(p, "test-seed");
    assert.equal("answerCount" in pub, false);
    assert.equal("reveal" in pub, false);
    assert.equal("correct_keywords" in pub, false);
    assert.ok(pub.keywords.every((k) => !k.group && !k.value));
    assert.deepEqual(pub, puzzleContent(p, "test-seed"));
    const correct = p.correct_keywords.map((k) => k.id);
    for (const model of ["low", "high"] as const) {
      assert.equal(evaluatePuzzle(p, correct, model).passed, true);
      assert.equal(evaluatePuzzle(p, [...correct].reverse(), model).score, 100);
    }
    assert.equal(
      evaluatePuzzle(
        p,
        p.candidate_keywords.map((k) => k.id),
        "low",
      ).passed,
      false,
    );
    assert.ok(
      evaluatePuzzle(
        p,
        p.candidate_keywords.map((k) => k.id),
        "low",
      ).score < 31,
    );
    assert.throws(() => evaluatePuzzle(p, [], "low"), /INVALID_KEYWORDS/);
    assert.throws(
      () => evaluatePuzzle(p, [correct[0], correct[0]], "low"),
      /INVALID_KEYWORDS/,
    );
  }
  assert.equal(seen.size, 10);
  const p = generatedPack("2026-11-11"),
    answers = p.correct_keywords.map((k) => k.id),
    wrong = p.candidate_keywords.find((k) => !answers.includes(k.id))!.id;
  assert.equal(
    evaluatePuzzle(p, [...answers.slice(0, 7), wrong], "low").score,
    77.7,
  );
  assert.equal(
    "incorrectKeywordIds" in puzzleFeedback(p, [wrong], 1, false),
    false,
  );
  assert.deepEqual(puzzleFeedback(p, [wrong], 3, false).incorrectKeywordIds, [
    wrong,
  ]);
  assert.equal("reveal" in puzzleFeedback(p, [wrong], 4, false), false);
  assert.equal(
    puzzleFeedback(p, [wrong], 5, true).reveal?.prompt,
    p.authored_prompt,
  );
});
test("generated challenge API pins content, preserves hidden answers, stages feedback and retries atomically", async () => {
  const Fastify = (await import("fastify")).default;
  const { registerPrototype } = await import("../src/modules/routes.js");
  const { seoulDate } = await import("@aimi/contracts");
  const app = Fastify(),
    repo = new FileRepository(),
    uid = "generated-puzzle-http",
    date = seoulDate();
  registerPrototype(app, repo, async () => uid);
  app.setErrorHandler((err, _r, reply) =>
    reply
      .code((err as any).status ?? 500)
      .send({ error: { code: (err as any).code } }),
  );
  try {
    const initial = (await app.inject({ url: "/v1/content" })).json().data,
      p = generatedPack(date, initial.version);
    assert.equal(initial.ruleVersion, "aimi-keyword-set-v3");
    assert.equal(initial.answerCount, undefined);
    assert.ok(!JSON.stringify(initial).includes("authored_prompt"));
    const gallery = (await app.inject({ url: "/v1/content/previews" })).json()
      .data.images;
    assert.equal(gallery.length, 10);
    assert.ok(gallery.every((g: any) => !g.keywords && !g.answerCount));
    const answers = p.correct_keywords.map((k) => k.id),
      wrong = p.candidate_keywords.find((k) => !answers.includes(k.id))!.id;
    await repo.transaction([uid], (st) => {
      const d = daily(st[uid]);
      d.best = 100;
      d.playsUsed = 1;
      st[uid].plays["completed-fixture"] = {
        id: "completed-fixture",
        date,
        kind: d.gameKind,
        seed: 1,
        version: "prototype-game-v2",
        character: "seed",
        startedAt: Date.now() - 100000,
        status: "cleared",
        result: {
          score: 100,
          ep: 0,
          best: 100,
          budget: 150,
          remaining: 4,
          status: "cleared",
        },
      };
    });
    const submit = (
      ids: string[],
      key = crypto.randomUUID(),
      version = initial.version,
    ) =>
      app.inject({
        method: "POST",
        url: "/v1/challenge/attempts",
        headers: { "idempotency-key": key },
        payload: {
          keywordIds: ids,
          model: "low",
          date,
          contentVersion: version,
        },
      });
    assert.equal(
      (await submit([wrong], crypto.randomUUID(), "old-version")).statusCode,
      409,
    );
    assert.equal((await repo.read(uid)).days[date].attemptsUsed, 0);
    const first = await submit([wrong], "same-attempt"),
      firstBody = first.json().data;
    assert.equal(first.statusCode, 200);
    assert.equal(firstBody.answerCount, answers.length);
    assert.equal(firstBody.incorrectKeywordIds, undefined);
    assert.equal(firstBody.reveal, undefined);
    assert.deepEqual(
      (await submit([wrong], "same-attempt")).json().data,
      firstBody,
    );
    assert.equal((await repo.read(uid)).days[date].attemptsUsed, 1);
    assert.equal(
      (await app.inject({ url: "/v1/content" })).json().data.answerCount,
      answers.length,
    );
    const second = (await submit([wrong])).json().data;
    assert.deepEqual(second.incorrectKeywordIds, [wrong]);
    assert.equal(second.reveal, undefined);
    assert.equal((await repo.read(uid)).days[date].challengeSpent, 60);
    const third = (await submit([wrong])).json().data;
    assert.deepEqual(third.incorrectKeywordIds, [wrong]);
    assert.equal(third.missingKeywordCount, answers.length);
    assert.equal(third.reveal, undefined);
    await submit([wrong]);
    const fifth = (await submit([wrong])).json().data;
    assert.equal(fifth.remaining, 0);
    assert.deepEqual(fifth.reveal.answerKeywordIds, answers);
    assert.equal((await submit(answers)).statusCode, 429);
    assert.equal(
      (await repo.read(uid)).days[date].challengeVersion,
      packVersion(p),
    );
  } finally {
    await app.close();
  }
});

test("fixed puzzle cost exhausts the pinned budget at 30-unit boundaries and cannot reopen after reveal", async () => {
  const { seoulDate } = await import("@aimi/contracts");
  const { view } = await import("../src/modules/domain.js");
  const now = Date.now(),
    date = seoulDate(),
    pack = generatedPack(date);
  const answers = pack.correct_keywords.map((k) => k.id),
    wrong = pack.candidate_keywords.find((k) => !answers.includes(k.id))!.id;
  assert.equal(evaluatePuzzle(pack, answers, "low").cost, 30);
  assert.equal(
    evaluatePuzzle(
      pack,
      pack.candidate_keywords.map((k) => k.id),
      "high",
    ).cost,
    30,
  );
  const partial = puzzleFeedback(pack, answers.slice(1), 2, false);
  assert.deepEqual(partial.incorrectKeywordIds, []);
  assert.equal(partial.missingKeywordCount, 1);
  for (const score of [0, 9, 10, 39, 40, 100]) {
    const state = newState("budget-" + score, true),
      p = startPlay(state, "dino", now - 100000),
      d = daily(state, date),
      budget = earnedBudget(score);
    p.status = "failed";
    p.result = {
      score,
      ep: 0,
      best: score,
      budget,
      remaining: 4,
      status: "failed",
    };
    d.best = score;
    d.challengeVersion = packVersion(pack);
    const balance = state.balance;
    const before = JSON.stringify(state);
    assert.throws(
      () =>
        submitAttempt(state, { keywordIds: [], model: "low", date }, now, pack),
      /INVALID_KEYWORDS/,
    );
    assert.equal(JSON.stringify(state), before);
    for (let n = 1; n <= Math.floor(budget / 30); n++) {
      const result = submitAttempt(
        state,
        { keywordIds: [wrong], model: "low", date },
        now,
        pack,
      );
      assert.equal(result.cost, 30);
      assert.equal(view(state, date).budget, budget - n * 30);
      assert.equal(result.remaining, Math.floor((budget - n * 30) / 30));
      assert.equal(!!result.reveal, result.remaining === 0);
    }
    assert.equal(d.challengeClosed, true);
    assert.equal(state.balance, balance);
    const after = JSON.stringify(state);
    assert.throws(
      () =>
        submitAttempt(
          state,
          { keywordIds: answers, model: "low", date },
          now,
          pack,
        ),
      /CHALLENGE_DAILY_LIMIT/,
    );
    assert.equal(JSON.stringify(state), after);
    d.best = 100;
    assert.equal(view(state, date).challengeRemaining, 0);
    assert.throws(
      () =>
        submitAttempt(
          state,
          { keywordIds: answers, model: "low", date },
          now,
          pack,
        ),
      /CHALLENGE_DAILY_LIMIT/,
    );
  }
});
