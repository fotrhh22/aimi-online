import * as legacy from "./legacy-v1.js";
/** Renderer-independent seeded simulation, identical on client and verifier. */
export type GameKind = "crossing" | "dino" | "runner";
export type GameAction = "forward" | "back" | "left" | "right" | "jump";
export type GameInput = { tick: number; action: GameAction };
export const GAME_VERSION = "prototype-game-v2";
export const RULES = Object.freeze({
  tickRate: 30,
  scoreCap: 100,
  ticksPerPoint: 18,
  maxTicks: 7200,
  epCapPerPlay: 18,
  epCapPerDay: 60,
  budgetMin: 50,
  budgetCap: 150,
  pauseGraceMs: 30 * 60_000,
});
export const TIMING = Object.freeze({
  crossingHopTicks: 9,
  crossingLaneTicks: 36,
  laneChangeTicks: 9,
  obstacleTicks: 90,
  contactTicks: 6,
  jumpTicks: 28,
});
export function timingFor(version = GAME_VERSION) {
  return version === legacy.GAME_VERSION
    ? {
        ...TIMING,
        crossingHopTicks: 6,
        crossingLaneTicks: 13,
        laneChangeTicks: 1,
        obstacleTicks: 54,
        jumpTicks: 22,
      }
    : TIMING;
}
export type GameState = {
  version?: string;
  kind: GameKind;
  seed: number;
  tick: number;
  row: number;
  lane: number;
  maxRow: number;
  score: number;
  ep: number;
  jumpUntil: number;
  lastForward: number;
  lastMove?: number;
  status: "running" | "failed" | "cleared" | "abandoned";
};
export function hash(seed: number, value: number): number {
  let n = (seed ^ Math.imul(value + 1, 0x45d9f3b)) >>> 0;
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return (n ^ (n >>> 16)) >>> 0;
}
export function initialGame(
  kind: GameKind,
  seed: number,
  version = GAME_VERSION,
): GameState {
  if (version !== GAME_VERSION && version !== legacy.GAME_VERSION)
    throw new Error("INVALID_GAME_VERSION");
  return {
    version,
    kind,
    lastMove: -20,
    seed: seed >>> 0,
    tick: 0,
    row: 0,
    lane: 1,
    maxRow: 0,
    score: 0,
    ep: 0,
    jumpUntil: 0,
    lastForward: -20,
    status: "running",
  };
}
export function rowType(seed: number, row: number): "grass" | "road" | "water" {
  if (row < 3 || row % 4 === 0) return "grass";
  return hash(seed, row) % 5 === 0 ? "water" : "road";
}
export function crossingPosition(
  seed: number,
  row: number,
  tick: number,
): number {
  return (
    ((tick + (hash(seed, row) % 180)) /
      (TIMING.crossingLaneTicks + (hash(seed, row) % 7))) %
    5
  );
}
export function crossingObstacle(
  seed: number,
  row: number,
  tick: number,
  version = GAME_VERSION,
): number {
  return version === legacy.GAME_VERSION
    ? legacy.crossingObstacle(seed, row, tick)
    : Math.floor(crossingPosition(seed, row, tick));
}
export function jumpHeight(s: GameState): number {
  const duration = timingFor(s.version).jumpTicks;
  return s.jumpUntil > s.tick
    ? Math.sin((1 - (s.jumpUntil - s.tick) / duration) * Math.PI) * 78
    : 0;
}
function laneDistance(a: number, b: number): number {
  const d = Math.abs(a - b);
  return Math.min(d, 5 - d);
}
export function obstacleLane(seed: number, index: number): number {
  return hash(seed, index) % 3;
}
export function stepGame(
  previous: GameState,
  actions: GameAction[] = [],
): GameState {
  if (previous.status !== "running") return previous;
  if (previous.version === legacy.GAME_VERSION)
    return {
      ...legacy.stepGame(previous, actions),
      version: legacy.GAME_VERSION,
    };
  const s = { ...previous, tick: previous.tick + 1 };
  // Ignore held/repeated input during a hop/lane change; timing is replayable.
  const action = actions[0];
  const canMove = s.tick - (s.lastMove ?? -20) >= TIMING.laneChangeTicks;
  if (canMove && (action === "left" || action === "right")) {
    s.lane = Math.max(
      0,
      Math.min(
        s.kind === "crossing" ? 4 : 2,
        s.lane + (action === "left" ? -1 : 1),
      ),
    );
    s.lastMove = s.tick;
  }
  if (s.kind === "crossing") {
    if (
      canMove &&
      (action === "forward" || action === "back") &&
      s.tick - s.lastForward >= TIMING.crossingHopTicks
    ) {
      s.row = Math.max(0, s.row + (action === "forward" ? 1 : -1));
      s.lastForward = s.tick;
      s.lastMove = s.tick;
    }
    const type = rowType(s.seed, s.row),
      car = crossingPosition(s.seed, s.row, s.tick);
    if (
      (type === "road" && laneDistance(s.lane, car) < 0.65) ||
      (type === "water" &&
        laneDistance(s.lane, car) > 0.65 &&
        laneDistance(s.lane, (car + 1) % 5) > 0.65)
    )
      s.status = "failed";
    if (s.status === "running" && s.row > s.maxRow) {
      s.maxRow = s.row;
      s.score = s.row;
      if (s.row % 5 === 0) s.ep++;
    }
  } else {
    if (s.kind === "dino" && action === "jump" && s.tick >= s.jumpUntil)
      s.jumpUntil = s.tick + TIMING.jumpTicks;
    // Last 200ms of the approach matches the rendered obstacle/player overlap.
    const encounter =
        s.tick % TIMING.obstacleTicks >=
        TIMING.obstacleTicks - TIMING.contactTicks,
      index = Math.floor(s.tick / TIMING.obstacleTicks) + 1;
    if (
      encounter &&
      ((s.kind === "dino" && jumpHeight(s) < 44) ||
        (s.kind === "runner" && s.lane === obstacleLane(s.seed, index)))
    )
      s.status = "failed";
    if (s.status === "running") {
      s.score = Math.floor(s.tick / RULES.ticksPerPoint);
      if (s.tick % 90 === 0) s.ep++;
    }
  }
  s.score = Math.min(RULES.scoreCap, s.score);
  s.ep = Math.min(RULES.epCapPerPlay, s.ep);
  if (s.status === "running" && s.score >= RULES.scoreCap) s.status = "cleared";
  if (s.status === "running" && s.tick >= RULES.maxTicks)
    s.status = "abandoned";
  return s;
}
export function replayGame(
  kind: GameKind,
  seed: number,
  inputs: GameInput[],
  ticks: number,
  version = GAME_VERSION,
): GameState {
  if (version === legacy.GAME_VERSION)
    return { ...legacy.replayGame(kind, seed, inputs, ticks), version };
  if (version !== GAME_VERSION) throw new Error("INVALID_GAME_VERSION");
  if (
    !Number.isInteger(ticks) ||
    ticks < 0 ||
    ticks > RULES.maxTicks ||
    inputs.length > 2500
  )
    throw new Error("INVALID_GAME_LOG");
  let last = 0;
  for (const e of inputs) {
    if (
      !Number.isInteger(e.tick) ||
      e.tick <= last ||
      e.tick > ticks ||
      !["forward", "back", "left", "right", "jump"].includes(e.action)
    )
      throw new Error("INVALID_GAME_LOG");
    last = e.tick;
  }
  let s = initialGame(kind, seed),
    cursor = 0;
  for (let t = 1; t <= ticks; t++) {
    const event = inputs[cursor];
    s = stepGame(s, event?.tick === t ? [event.action] : []);
    if (event?.tick === t) cursor++;
    if (s.status !== "running") {
      if (t !== ticks) throw new Error("LOG_AFTER_GAME_END");
      break;
    }
  }
  return s;
}
export function earnedBudget(score: number): number {
  return Math.min(RULES.budgetCap, RULES.budgetMin + Math.max(0, score));
}
