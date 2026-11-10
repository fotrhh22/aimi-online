import {
  evaluatePuzzle,
  puzzleFeedback,
  type PuzzlePack,
} from "../services/content/generated.js";
import {
  PUZZLE_ATTEMPT_COST,
  gardenPlacements,
  challengeRewardEP,
  gardenPlacementId,
  ownedItemCount,
  gardenPlacementInBounds,
  GardenPlacement,
  MAX_GARDEN_ITEMS,
} from "@aimi/contracts";
import { createHash, randomUUID, randomInt } from "node:crypto";
import { seoulDate, type UserState, type DailyProgress } from "@aimi/contracts";
import {
  RULES,
  GAME_VERSION,
  gameRulesFor,
  earnedBudget,
  replayGame,
  type GameKind,
  type GameInput,
} from "@aimi/game-core";
import {
  CATALOG,
  CONTENT_VERSION,
  evaluateChallenge,
} from "../services/content/fixture.js";
import { dailyProgramForDate } from "../services/content/daily-program.js";
import { ApiError } from "../db.js";
export { CATALOG, CONTENT_VERSION };
export function daily(s: UserState, date = seoulDate()): DailyProgress {
  return (s.days[date] ??= {
    date,
    gameKind: dailyProgramForDate(date).gameKind,
    playsUsed: 0,
    attemptsUsed: 0,
    best: 0,
    gameEP: 0,
    success: false,
    lastAttempt: null,
  });
}
export function view(s: UserState, date = seoulDate()) {
  const d = daily(s, date);
  return {
    todayTip: dailyProgramForDate(date).todayTip,
    name: s.name,
    code: s.code,
    balance: s.balance,
    character: s.selectedCharacter,
    inventory: s.inventory,
    garden: { ...s.garden, placements: gardenPlacements(s.garden) },
    daily: d,
    budget:
      d.challengeBudget !== undefined
        ? Math.max(0, d.challengeBudget - (d.challengeSpent ?? 0))
        : d.playsUsed
          ? earnedBudget(d.best)
          : 0,
    challengeRemaining:
      d.success || d.challengeClosed
        ? 0
        : d.challengeVersion
          ? Math.floor(
              Math.max(
                0,
                (d.challengeBudget ??
                  (d.playsUsed ? earnedBudget(d.best) : 0)) -
                  (d.challengeSpent ?? 0),
              ) / PUZZLE_ATTEMPT_COST,
            )
          : Math.max(0, 5 - d.attemptsUsed),
    claims: s.claims[date] ?? [],
    activePlay:
      Object.values(s.plays).find((p) => p.status === "running") ?? null,
    latestAttempt: d.lastAttempt ? s.attempts[d.lastAttempt] : null,
    development: false,
  };
}
export function once<T>(
  s: UserState,
  key: string,
  operation: string,
  body: unknown,
  fn: () => T,
): T {
  const hash = createHash("sha256")
      .update(JSON.stringify({ operation, body }))
      .digest("hex"),
    old = s.requests[key];
  if (old) {
    if (old.hash !== hash) throw new ApiError("IDEMPOTENCY_CONFLICT", 409);
    return old.response as T;
  }
  if (Object.keys(s.requests).length >= 5000)
    throw new ApiError("REQUEST_HISTORY_LIMIT", 429);
  const result = fn();
  s.requests[key] = {
    hash,
    response: result,
    operation,
    createdAt: Date.now(),
  };
  return result;
}
export function startPlay(s: UserState, override?: GameKind, now = Date.now()) {
  const date = seoulDate(new Date(now)),
    d = daily(s, date),
    active = Object.values(s.plays).find((p) => p.status === "running");
  if (active && now - active.startedAt < RULES.pauseGraceMs) return active;
  if (active) active.status = "expired";
  if (d.playsUsed >= 5) throw new ApiError("GAME_DAILY_LIMIT", 429);
  const play = {
    id: randomUUID(),
    date,
    kind: override ?? d.gameKind,
    seed: randomInt(1, 0x7fffffff),
    version: GAME_VERSION,
    startedAt: now,
    character: s.selectedCharacter,
    status: "running" as const,
  };
  d.playsUsed++;
  s.plays[play.id] = play;
  return play;
}
export function completePlay(
  s: UserState,
  id: string,
  body: { inputs: GameInput[]; ticks: number; abandon: boolean },
  now = Date.now(),
) {
  const p = s.plays[id];
  if (!p) throw new ApiError("PLAY_NOT_FOUND", 404);
  if (p.result) return p.result;
  if (p.status !== "running") throw new ApiError("PLAY_EXPIRED", 409);
  if (now - p.startedAt > RULES.pauseGraceMs)
    throw new ApiError("PLAY_EXPIRED", 409);
  if ((body.ticks / RULES.tickRate) * 1000 > now - p.startedAt + 1500)
    throw new ApiError("INVALID_GAME_TIME");
  let simulation;
  try {
    simulation = replayGame(p.kind, p.seed, body.inputs, body.ticks, p.version);
  } catch {
    throw new ApiError("INVALID_GAME_LOG");
  }
  if (simulation.status === "running" && !body.abandon)
    throw new ApiError("GAME_NOT_FINISHED");
  const d = daily(s, p.date),
    rewardRules = gameRulesFor(p.version),
    ep = Math.max(
      0,
      Math.min(
        simulation.ep,
        rewardRules.epCapPerPlay,
        rewardRules.epCapPerDay - d.gameEP,
      ),
    );
  d.best = Math.max(d.best, simulation.score);
  d.gameEP += ep;
  s.balance += ep;
  p.status = simulation.status === "running" ? "abandoned" : simulation.status;
  p.inputs = body.inputs;
  p.ticks = body.ticks;
  return (p.result = {
    score: simulation.score,
    ep,
    best: d.best,
    budget: earnedBudget(d.best),
    remaining: 5 - d.playsUsed,
    status: p.status,
  });
}
export function submitAttempt(
  s: UserState,
  body: { keywordIds: string[]; model: "low" | "high"; date: string },
  now = Date.now(),
  puzzle?: PuzzlePack,
) {
  const today = seoulDate(new Date(now));
  if (body.date !== today) throw new ApiError("MISSION_DATE_CHANGED", 409);
  const d = daily(s, today);
  if (
    !d.playsUsed ||
    !Object.values(s.plays).some((p) => p.date === today && p.result)
  )
    throw new ApiError("GAME_REQUIRED");
  if (d.success) throw new ApiError("CHALLENGE_ALREADY_SUCCEEDED", 409);
  if (d.challengeClosed || (!puzzle && d.attemptsUsed >= 5))
    throw new ApiError("CHALLENGE_DAILY_LIMIT", 429);
  let e;
  try {
    e = puzzle
      ? evaluatePuzzle(puzzle, body.keywordIds, body.model)
      : evaluateChallenge(body.keywordIds, body.model, body.date);
  } catch {
    throw new ApiError("INVALID_KEYWORDS");
  }
  if (!e.image) throw new ApiError("RESULT_VARIANT_UNAVAILABLE", 503);
  const budget = puzzle
    ? Math.max(
        0,
        (d.challengeBudget ?? earnedBudget(d.best)) - (d.challengeSpent ?? 0),
      )
    : earnedBudget(d.best);
  if (e.cost > budget) throw new ApiError("INSUFFICIENT_BUDGET");
  d.attemptsUsed++;
  if (puzzle) {
    d.challengeBudget ??= earnedBudget(d.best);
    d.challengeSpent = (d.challengeSpent ?? 0) + e.cost;
    d.challengeClosed = e.passed || budget - e.cost < PUZZLE_ATTEMPT_COST;
  }
  const remaining = puzzle
    ? d.challengeClosed
      ? 0
      : Math.floor((budget - e.cost) / PUZZLE_ATTEMPT_COST)
    : 5 - d.attemptsUsed;
  const ep = e.passed ? challengeRewardEP(budget, e.cost) : 0;
  if (e.passed) {
    d.success = true;
    s.balance += ep;
  }
  const a = {
    id: randomUUID(),
    date: today,
    version: e.version,
    keywordIds: body.keywordIds,
    model: body.model,
    score: e.score,
    threshold: e.threshold,
    passed: e.passed,
    ep,
    cost: e.cost,
    budget,
    remaining,
    image: e.image,
    feedback: e.feedback,
    sentence: e.sentence,
    ...(puzzle
      ? {
          ruleVersion: "aimi-keyword-set-v3",
          ...puzzleFeedback(
            puzzle,
            body.keywordIds,
            d.attemptsUsed,
            e.passed ||
              (puzzle ? d.challengeClosed === true : d.attemptsUsed >= 5),
          ),
        }
      : {}),
  };
  s.attempts[a.id] = a;
  d.lastAttempt = a.id;
  return a;
}
export function purchase(s: UserState, id: string, quantity = 1) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99)
    throw new ApiError("INVALID_QUANTITY");
  const item = CATALOG.find((i) => i.id === id);
  if (!item) throw new ApiError("ITEM_NOT_FOUND", 404);
  if (item.kind === "character" && quantity !== 1)
    throw new ApiError("INVALID_QUANTITY");
  if (item.kind === "character" && s.inventory.includes(id))
    throw new ApiError("ALREADY_OWNED", 409);
  if (ownedItemCount(s.inventory, id) + quantity > 99)
    throw new ApiError("INVENTORY_LIMIT");
  const total = item.price * quantity;
  if (s.balance < total) throw new ApiError("INSUFFICIENT_EP");
  s.balance -= total;
  s.inventory.push(...Array<string>(quantity).fill(id));
  return { item, quantity, total, balance: s.balance };
}
export function saveGarden(
  s: UserState,
  body: {
    revision: number;
    character: string;
    placements: GardenPlacement[];
  },
) {
  if (s.garden.revision !== body.revision)
    throw new ApiError("GARDEN_REVISION_CONFLICT", 409);
  if (
    !CATALOG.some((i) => i.id === body.character && i.kind === "character") ||
    !s.inventory.includes(body.character)
  )
    throw new ApiError("CHARACTER_NOT_OWNED");
  if (body.placements.length > MAX_GARDEN_ITEMS)
    throw new ApiError("GARDEN_ITEM_LIMIT");
  const ids = new Set<string>();
  const used = new Map<string, number>();
  for (const raw of body.placements) {
    const parsed = GardenPlacement.safeParse(raw);
    if (!parsed.success || !gardenPlacementInBounds(parsed.data))
      throw new ApiError("GARDEN_OUT_OF_BOUNDS");
    const instanceId = gardenPlacementId(raw);
    if (ids.has(instanceId)) throw new ApiError("DUPLICATE_GARDEN_ITEM");
    ids.add(instanceId);
    used.set(raw.itemId, (used.get(raw.itemId) ?? 0) + 1);
    if (
      !s.inventory.includes(raw.itemId) ||
      !CATALOG.some((i) => i.id === raw.itemId && i.kind === "item")
    )
      throw new ApiError("INVALID_EQUIPMENT");
  }
  for (const [itemId, count] of used)
    if (count > ownedItemCount(s.inventory, itemId))
      throw new ApiError("INVALID_EQUIPMENT");
  s.selectedCharacter = body.character;
  s.garden = {
    ...s.garden,
    slots: {},
    placements: body.placements.map((p) => ({
      ...p,
      instanceId: gardenPlacementId(p),
    })),
    revision: s.garden.revision + 1,
  };
  return s.garden;
}
