/** Renderer-independent seeded simulation, identical on client and verifier. */
export type GameKind = "crossing" | "dino" | "runner";
export type GameAction = "forward" | "back" | "left" | "right" | "jump";
export type GameInput = { tick: number; action: GameAction };
export const GAME_VERSION = "prototype-game-v1";
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
export type GameState = {
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
  status: "running" | "failed" | "cleared" | "abandoned";
};
export function hash(seed: number, value: number): number {
  let n = (seed ^ Math.imul(value + 1, 0x45d9f3b)) >>> 0;
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return (n ^ (n >>> 16)) >>> 0;
}
export function initialGame(kind: GameKind, seed: number): GameState {
  return {
    kind,
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
export function crossingObstacle(
  seed: number,
  row: number,
  tick: number,
): number {
  return Math.floor((tick + (hash(seed, row) % 90)) / 13) % 5;
}
export function obstacleLane(seed: number, index: number): number {
  return hash(seed, index) % 3;
}
export function stepGame(
  previous: GameState,
  actions: GameAction[] = [],
): GameState {
  if (previous.status !== "running") return previous;
  const s = { ...previous, tick: previous.tick + 1 };
  // One movement input per tick; rate-limited forward hops.
  const action = actions[0];
  if (action === "left") s.lane = Math.max(0, s.lane - 1);
  if (action === "right")
    s.lane = Math.min(s.kind === "crossing" ? 4 : 2, s.lane + 1);
  if (s.kind === "crossing") {
    if (action === "forward" && s.tick - s.lastForward >= 6) {
      s.row++;
      s.lastForward = s.tick;
    }
    if (action === "back" && s.tick - s.lastForward >= 6) {
      s.row = Math.max(0, s.row - 1);
      s.lastForward = s.tick;
    }
    const type = rowType(s.seed, s.row),
      car = crossingObstacle(s.seed, s.row, s.tick);
    if (
      (type === "road" && s.lane === car) ||
      (type === "water" && s.lane !== car && s.lane !== (car + 1) % 5)
    )
      s.status = "failed";
    if (s.status === "running" && s.row > s.maxRow) {
      s.maxRow = s.row;
      s.score = s.row;
      if (s.row % 5 === 0) s.ep++;
    }
  } else {
    if (s.kind === "dino" && action === "jump" && s.tick >= s.jumpUntil)
      s.jumpUntil = s.tick + 22;
    // Obstacle spacing >=48 ticks, larger than jump duration + landing recovery.
    const encounter = s.tick % 54 === 0,
      index = Math.floor(s.tick / 54);
    if (
      encounter &&
      ((s.kind === "dino" && s.tick >= s.jumpUntil) ||
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
): GameState {
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
