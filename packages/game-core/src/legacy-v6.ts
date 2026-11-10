import * as v2 from "./legacy-v2.js";
import * as v3 from "./legacy-v3.js";
import * as v4 from "./legacy-v4.js";
import * as v5 from "./legacy-v5.js";
export type { GameKind, GameAction, GameInput } from "./legacy-v2.js";
import type { GameKind, GameAction, GameInput } from "./legacy-v2.js";
export const GAME_VERSION = "aimi-game-v6";
export const RULES = v2.RULES;
/** v2 timing exports remain available to old clients/tests; v3 uses world distances. */
export const TIMING = v2.TIMING;
export const hash = v2.hash;
export const earnedBudget = v2.earnedBudget;
export const rowType = v2.rowType;
export const crossingPosition = v2.crossingPosition;
export const crossingObstacle = v2.crossingObstacle;
export const obstacleLane = v2.obstacleLane;
export const timingFor = v2.timingFor;
export const V3 = Object.freeze({
  width: 360,
  playerX: 72,
  dinoJumpTicks: 24,
  dinoJumpHeight: 84,
  dinoDistancePerPoint: 280,
  runnerDistancePerPoint: 20,
  columns: 9,
  hopTicks: 7,
  laneTicks: 5,
  playerHalfWidth: 0.23,
});
export type Obstacle = {
  id: number;
  at: number;
  width: number;
  height: number;
  lane: number;
  kind: "cactus" | "rock" | "crate" | "barrier";
};
export type Motion = {
  fromX: number;
  fromRow: number;
  toX: number;
  toRow: number;
  start: number;
  duration: number;
};
export type GameState = v2.GameState & {
  distance?: number;
  speed?: number;
  positionX?: number;
  positionRow?: number;
  motion?: Motion;
  obstacles?: Obstacle[];
  nextAt?: number;
  spawnIndex?: number;
  safeLane?: number;
  bufferedJump?: number;
  lastPassTick?: number;
  passed?: number;
  deathReason?: string;
  hitId?: number;
};
const modulo = (n: number, d: number) => ((n % d) + d) % d;
export function initialGame(
  kind: GameKind,
  seed: number,
  version = GAME_VERSION,
): GameState {
  if (version === v5.GAME_VERSION) return v5.initialGame(kind, seed, version);
  if (version === v4.GAME_VERSION) return v4.initialGame(kind, seed, version);
  if (version === v3.GAME_VERSION) return v3.initialGame(kind, seed, version);
  if (version !== GAME_VERSION) return v2.initialGame(kind, seed, version);
  return {
    version,
    kind,
    seed: seed >>> 0,
    tick: 0,
    row: 0,
    lane: kind === "crossing" ? 4 : 1,
    maxRow: 0,
    score: 0,
    ep: 0,
    jumpUntil: 0,
    lastForward: -30,
    lastMove: -30,
    status: "running",
    distance: 0,
    speed: runnerSpeed(kind, 0),
    positionX: kind === "crossing" ? 4 : 1,
    positionRow: 0,
    obstacles: [],
    nextAt: kind === "dino" ? 570 : 52,
    spawnIndex: 0,
    safeLane: 1,
    passed: 0,
  };
}
export function jumpHeight(s: GameState) {
  if (s.version === v5.GAME_VERSION) return v5.jumpHeight(s);
  if (s.version === v4.GAME_VERSION) return v4.jumpHeight(s);
  if (s.version === v3.GAME_VERSION) return v3.jumpHeight(s);
  if (s.version !== GAME_VERSION) return v2.jumpHeight(s);
  const p =
    (V3.dinoJumpTicks - (s.jumpUntil - s.tick) + 1) / (V3.dinoJumpTicks + 1);
  return p > 0 && p < 1 ? 4 * V3.dinoJumpHeight * p * (1 - p) : 0;
}
export function crossingRow(
  seed: number,
  row: number,
): "grass" | "road" | "water" {
  if (row < 3 || row % 5 === 0) return "grass";
  return row > 6 && hash(seed, row) % 8 === 0 ? "water" : "road";
}
export function crossingVelocity(seed: number, row: number) {
  const h = hash(seed, row),
    dir = h % 2 ? -1 : 1;
  return (
    dir *
    (crossingRow(seed, row) === "water"
      ? 0.52 + (h % 3) * 0.06
      : 1.05 + Math.min(row, 80) * 0.008 + (h % 5) * 0.13)
  );
}
export function crossingEntities(seed: number, row: number, tick: number) {
  const type = crossingRow(seed, row),
    h = hash(seed, row);
  if (type === "grass") return [];
  const water = type === "water",
    spacing = water ? 3.9 : 5.2,
    period = spacing * 4;
  const width = water ? 2.9 : row > 20 && h % 3 === 0 ? 1.65 : 1.12;
  const offset =
    ((h % 100) / 100) * period + (tick / 30) * crossingVelocity(seed, row);
  return Array.from({ length: 4 }, (_, i) => ({
    id: row * 10 + i,
    x: modulo(offset + i * spacing, period) - 5,
    width,
    type,
  })).filter((e) => e.x + width / 2 >= -1 && e.x - width / 2 <= 9);
}
function cross(s: GameState, action: GameAction | undefined) {
  if (s.motion) {
    const m = s.motion,
      p = Math.min(1, (s.tick - m.start) / m.duration);
    // A single shared position is used by both renderer and collisions.
    s.positionX = m.fromX + (m.toX - m.fromX) * p;
    s.positionRow = m.fromRow + (m.toRow - m.fromRow) * p;
    if (p === 1) {
      s.row = m.toRow;
      s.lane = Math.round(m.toX);
      s.motion = undefined;
    }
  }
  if (
    !s.motion &&
    action &&
    ["forward", "back", "left", "right"].includes(action)
  ) {
    const x = s.positionX!,
      row = s.row;
    const toX = Math.max(
      0,
      Math.min(8, x + (action === "left" ? -1 : action === "right" ? 1 : 0)),
    );
    const toRow = Math.max(
      0,
      row + (action === "forward" ? 1 : action === "back" ? -1 : 0),
    );
    if (toX !== x || toRow !== row) {
      s.motion = {
        fromX: x,
        fromRow: row,
        toX,
        toRow,
        start: s.tick,
        duration: V3.hopTicks,
      };
      s.lastMove = s.tick;
      s.lastForward = s.tick;
    }
  }
  const row = Math.round(s.positionRow!),
    type = crossingRow(s.seed, row);
  if (type === "road") {
    const hit = crossingEntities(s.seed, row, s.tick).find(
      (e) => Math.abs(e.x - s.positionX!) < e.width / 2 + V3.playerHalfWidth,
    );
    if (hit && Math.abs(s.positionRow! - row) < 0.56) {
      s.status = "failed";
      s.deathReason = "차량에 닿았어요. 차 사이의 간격을 살펴보세요.";
      s.hitId = hit.id;
    }
  }
  if (type === "water" && !s.motion) {
    s.positionX! += crossingVelocity(s.seed, row) / 30;
    const onLog = crossingEntities(s.seed, row, s.tick).some(
      (e) => Math.abs(e.x - s.positionX!) <= e.width / 2 - 0.12,
    );
    if (!onLog || s.positionX! < -0.25 || s.positionX! > 8.25) {
      s.status = "failed";
      s.deathReason = "통나무에서 벗어났어요. 강에서는 통나무와 함께 움직여요.";
    }
  }
  if (s.status === "running" && !s.motion && s.row > s.maxRow) {
    s.maxRow = s.row;
    s.score = Math.min(100, s.maxRow);
    s.distance = s.maxRow;
  }
}
function advanceRunner(s: GameState, action: GameAction | undefined) {
  const dino = s.kind === "dino";
  s.speed = runnerSpeed(s.kind, s.score);
  const before = s.distance!;
  s.distance = Math.min(
    (dino ? V3.dinoDistancePerPoint : V3.runnerDistancePerPoint) * 100,
    before + s.speed / 30,
  );
  if (dino) {
    if (action === "jump") s.bufferedJump = s.tick + 5;
    if ((s.bufferedJump ?? -1) >= s.tick && s.tick >= s.jumpUntil) {
      s.jumpUntil = s.tick + V3.dinoJumpTicks;
      s.bufferedJump = -1;
    }
  } else {
    if (s.motion) {
      const m = s.motion,
        p = Math.min(1, (s.tick - m.start) / m.duration);
      s.positionX = m.fromX + (m.toX - m.fromX) * p;
      if (p === 1) {
        s.motion = undefined;
        s.lane = Math.round(s.positionX);
      }
    }
    if (!s.motion && (action === "left" || action === "right")) {
      const to = Math.max(
        0,
        Math.min(2, s.lane + (action === "left" ? -1 : 1)),
      );
      if (to !== s.lane) {
        s.motion = {
          fromX: s.positionX!,
          fromRow: 0,
          toX: to,
          toRow: 0,
          start: s.tick,
          duration: V3.laneTicks,
        };
        s.lastMove = s.tick;
      }
    }
  }
  const list = s.obstacles!.filter(
    (o) => o.at - s.distance! > (dino ? -80 : -9),
  );
  while (s.nextAt! < s.distance! + (dino ? 520 : 120)) {
    const i = s.spawnIndex!,
      h = hash(s.seed, i),
      at = s.nextAt!;
    if (dino) {
      const pattern = dinoPattern(s.seed, i);
      list.push({
        id: i,
        at,
        width: pattern.width,
        height: pattern.height,
        lane: 0,
        kind: pattern.kind,
      });
      s.nextAt = at + s.speed! * pattern.gapAfter + Math.max(32, pattern.width);
    } else {
      const pattern = runnerPattern(s.seed, i),
        safe = pattern.safe;
      const blocked =
        i < 3
          ? [(safe + 1 + (h % 2)) % 3]
          : [0, 1, 2].filter((l) => l !== safe);
      for (const lane of blocked)
        list.push({
          id: i * 3 + lane,
          at,
          width: 0.66,
          height: lane % 2 ? 0.7 : 0.55,
          lane,
          kind: i % 3 === 0 ? "barrier" : "crate",
        });
      s.safeLane = safe;
      s.nextAt =
        at +
        runnerSpeed(
          "runner",
          Math.min(100, at / V3.runnerDistancePerPoint + 5),
        ) *
          runnerGapAfter(s.seed, i, at);
    }
    s.spawnIndex = i + 1;
  }
  s.obstacles = list;
  const player = dino ? V3.playerX : 0;
  for (const o of list) {
    const z = o.at - s.distance!,
      old = o.at - before;
    if (
      old + (dino ? o.width / 2 : 0) >= player - (dino ? 11 : 0.9) &&
      z + (dino ? o.width / 2 : 0) < player - (dino ? 11 : 0.9)
    ) {
      s.passed = (s.passed ?? 0) + 1;
      s.lastPassTick = s.tick;
    }
    if (dino) {
      if (
        Math.abs(z - V3.playerX) < o.width / 2 + 11 &&
        jumpHeight(s) < o.height - 3
      ) {
        s.status = "failed";
        s.hitId = o.id;
        s.deathReason =
          s.jumpUntil > s.tick && s.jumpUntil - s.tick > V3.dinoJumpTicks / 2
            ? "조금 늦게 뛰었어요. 장애물이 한 걸음 더 멀리 있을 때 뛰어보세요."
            : "장애물에 닿았어요. 조금 더 가까워졌을 때 뛰어보세요.";
        break;
      }
    } else if (
      Math.abs(z) < 0.9 &&
      Math.abs(s.positionX! - o.lane) < o.width / 2 + 0.19
    ) {
      s.status = "failed";
      s.hitId = o.id;
      s.deathReason = "막힌 레인에 닿았어요. 앞쪽의 빈 길을 미리 살펴보세요.";
      break;
    }
  }
  if (s.status === "running")
    s.score = Math.min(
      100,
      Math.floor(
        s.distance! /
          (dino ? V3.dinoDistancePerPoint : V3.runnerDistancePerPoint),
      ),
    );
}
export function stepGame(
  previous: GameState,
  actions: GameAction[] = [],
): GameState {
  if (previous.status !== "running") return previous;
  if (previous.version === v5.GAME_VERSION)
    return v5.stepGame(previous, actions);
  if (previous.version === v4.GAME_VERSION)
    return v4.stepGame(previous, actions);
  if (previous.version === v3.GAME_VERSION)
    return v3.stepGame(previous, actions);
  if (previous.version !== GAME_VERSION) return v2.stepGame(previous, actions);
  const s: GameState = { ...previous, tick: previous.tick + 1 };
  if (s.kind === "crossing") cross(s, actions[0]);
  else advanceRunner(s, actions[0]);
  if (s.status === "running") {
    s.ep = Math.min(RULES.epCapPerPlay, Math.floor(s.score / 5));
    if (s.score >= 100) s.status = "cleared";
    else if (s.tick >= RULES.maxTicks) s.status = "abandoned";
  }
  return s;
}
export function replayGame(
  kind: GameKind,
  seed: number,
  inputs: GameInput[],
  ticks: number,
  version = GAME_VERSION,
): GameState {
  if (version === v5.GAME_VERSION)
    return v5.replayGame(kind, seed, inputs, ticks, version);
  if (version === v4.GAME_VERSION)
    return v4.replayGame(kind, seed, inputs, ticks, version);
  if (version === v3.GAME_VERSION)
    return v3.replayGame(kind, seed, inputs, ticks, version);
  if (version !== GAME_VERSION)
    return v2.replayGame(kind, seed, inputs, ticks, version);
  if (
    !Number.isInteger(ticks) ||
    ticks < 0 ||
    ticks > RULES.maxTicks ||
    inputs.length > 2500
  )
    throw Error("INVALID_GAME_LOG");
  let last = 0;
  for (const e of inputs) {
    if (
      !Number.isInteger(e.tick) ||
      e.tick <= last ||
      e.tick > ticks ||
      !["forward", "back", "left", "right", "jump"].includes(e.action)
    )
      throw Error("INVALID_GAME_LOG");
    last = e.tick;
  }
  let s = initialGame(kind, seed, version),
    cursor = 0;
  for (let t = 1; t <= ticks; t++) {
    const e = inputs[cursor];
    s = stepGame(s, e?.tick === t ? [e.action] : []);
    if (e?.tick === t) cursor++;
    if (s.status !== "running" && t !== ticks)
      throw Error("LOG_AFTER_GAME_END");
  }
  return s;
}

export function runnerSpeed(kind: GameKind, score: number) {
  return kind === "dino"
    ? 270 + Math.min(100, score) * 3.3
    : 22 + Math.min(100, score) * 0.4;
}

/** CSS-pixel gestures; dominant axis avoids diagonals becoming unintended horizontal moves. */
export function touchAction(
  kind: GameKind,
  dx: number,
  dy: number,
): GameAction | undefined {
  if (kind === "dino") return "jump";
  const moved = Math.max(Math.abs(dx), Math.abs(dy)) >= 18;
  if (!moved) return kind === "crossing" ? "forward" : undefined;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return kind === "crossing" ? (dy > 0 ? "back" : "forward") : undefined;
}

/** Authored path patterns, seeded order/mirroring. No edge-clamped random walk. */
export function runnerPattern(
  seed: number,
  index: number,
): { name: string; safe: number; phase: number } {
  if (index < 3) return { name: "warmup", safe: 1, phase: index };
  const pack = Math.floor((index - 3) / 6),
    phase = (index - 3) % 6;
  const patterns = [
    { name: "zigzag", lanes: [0, 1, 2, 1, 0, 1] },
    { name: "cross", lanes: [0, 2, 0, 1, 2, 1] },
    { name: "syncopated", lanes: [1, 0, 1, 2, 1, 0] },
  ];
  const pattern = patterns[((hash(seed, 991) % 3) + pack) % 3];
  const mirror = (hash(seed, 999) % 2) ^ (pack % 2);
  return {
    name: pattern.name,
    safe: mirror ? 2 - pattern.lanes[phase] : pattern.lanes[phase],
    phase,
  };
}
export function runnerGapAfter(seed: number, index: number, at: number) {
  if (index < 3) return 1.08;
  const p = runnerPattern(seed, index),
    next = runnerPattern(seed, index + 1);
  const base = at < 300 ? 0.88 : at < 600 ? 0.76 : 0.66;
  const beat =
    p.name === "syncopated"
      ? [1.15, 0.94, 1.02, 1.18, 0.95, 1.05][p.phase]
      : p.phase === 5
        ? 1.16
        : 1;
  return Math.max(
    base * beat,
    Math.abs(next.safe - p.safe) === 2 ? 0.92 : 0.65,
  );
}
export function dinoPattern(
  seed: number,
  index: number,
): {
  kind: "cactus" | "rock";
  width: number;
  height: number;
  gapAfter: number;
} {
  const h = hash(seed, index);
  if (index < 2)
    return {
      kind: "cactus",
      width: 24,
      height: 34,
      gapAfter: 1.5 + (h % 15) / 100,
    };
  const phase = (index - 2) % 6;
  const wide = phase === 1 || phase === 4;
  return {
    kind: phase === 3 ? "rock" : "cactus",
    width: wide ? 48 + (h % 2) * 6 : 26 + (h % 2) * 8,
    height: wide ? 48 : 36 + (h % 3) * 8,
    gapAfter: [1.28, 1.06, 1.38, 1.02, 1.45, 1.16][phase] + (h % 8) / 100,
  };
}
