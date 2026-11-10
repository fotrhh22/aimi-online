import test from "node:test";
import assert from "node:assert/strict";
import {
  initialGame,
  stepGame,
  replayGame,
  V3,
  GAME_VERSION,
  RULES,
  crossingEntities,
  crossingRow,
  jumpHeight,
  type GameState,
  type GameInput,
  type GameAction,
} from "@aimi/game-core";
import { newState } from "../src/modules/repository.js";
import { startPlay, completePlay, daily } from "../src/modules/domain.js";
function run(kind: "dino" | "runner", seed: number) {
  let s = initialGame(kind, seed);
  const inputs: GameInput[] = [];
  while (s.status === "running") {
    let action: GameAction | undefined;
    if (kind === "dino") {
      const next = s.obstacles!.find((o) => o.at - s.distance! >= V3.playerX);
      if (
        s.tick >= s.jumpUntil &&
        next &&
        next.at - s.distance! - V3.playerX < s.speed! * 0.22 + next.width / 2
      )
        action = "jump";
    } else if (!s.motion) {
      const next = s.obstacles!.find((o) => o.at >= s.distance! - 0.8);
      if (next) {
        const blocked = s
          .obstacles!.filter((o) => o.at === next.at)
          .map((o) => o.lane);
        const safe = [0, 1, 2]
          .filter((l) => !blocked.includes(l))
          .sort((a, b) => Math.abs(a - s.lane) - Math.abs(b - s.lane))[0];
        if (safe !== s.lane) action = safe < s.lane ? "left" : "right";
      }
    }
    if (action) inputs.push({ tick: s.tick + 1, action });
    s = stepGame(s, action ? [action] : []);
  }
  return { s, inputs };
}
test("current distance-based runners are replay-identical, capped and have surviving paths across seeds", () => {
  for (const kind of ["dino", "runner"] as const)
    for (const seed of [1, 2, 3, 9, 123, 2026]) {
      const { s, inputs } = run(kind, seed);
      assert.equal(s.status, "cleared", `${kind}/${seed} failed ${s.score}`);
      assert.equal(s.score, 100);
      assert.ok(s.ep >= 0 && s.ep <= 7);
      if(kind === "runner") assert.equal(s.ep, coinCountFor(kind,seed));
      assert.ok(s.tick / 30 > 50 && s.tick / 30 < 80);
      assert.deepEqual(replayGame(kind, seed, inputs, s.tick), s);
      assert.strictEqual(stepGame(s, ["jump"]), s);
      assert.throws(
        () => replayGame(kind, seed, inputs, s.tick + 1),
        /LOG_AFTER/,
      );
    }
});
test("Dino obstacles survive player passage and leave beyond the left edge, jump has takeoff/landing", () => {
  let s = initialGame("dino", 1);
  const seen = new Map<number, number>();
  let crossed = false,
    removed = false;
  while (s.status === "running") {
    const next = s.obstacles!.find((o) => o.at - s.distance! >= V3.playerX);
    const action =
      s.tick >= s.jumpUntil &&
      next &&
      next.at - s.distance! - V3.playerX < s.speed! * 0.22 + next.width / 2
        ? "jump"
        : undefined;
    const old = s;
    s = stepGame(s, action ? [action] : []);
    for (const o of s.obstacles!) {
      const x = o.at - s.distance!;
      const previous = seen.get(o.id);
      if (previous !== undefined)
        assert.ok(x <= previous, "obstacle teleported backwards to right");
      seen.set(o.id, x);
      if (x < 0) crossed = true;
    }
    if (old.obstacles?.some((o) => !s.obstacles?.some((n) => n.id === o.id)))
      removed = true;
    if (s.score > 15) break;
  }
  assert.ok(crossed && removed);
  assert.equal(s.status, "running");
  let j = stepGame(initialGame("dino", 1), ["jump"]);
  assert.ok(jumpHeight(j) > 0);
  for (let t = 0; t < 10; t++) j = stepGame(j);
  assert.ok(jumpHeight(j) > 60);
  for (let t = 0; t < 14; t++) j = stepGame(j);
  assert.equal(jumpHeight(j), 0);
});
test("runner safe lanes remain reachable and later rows become multiple obstacles", () => {
  const { s } = run("runner", 55);
  assert.ok(s.spawnIndex! > 20);
  // Inspect every generated row throughout a complete surviving traversal.
  let state = initialGame("runner", 55),
    double = false,
    previousSafe: number | undefined;
  const rows = new Map<number, number[]>();
  while (state.status === "running") {
    const nearest = state.obstacles!.find((o) => o.at >= state.distance! - 0.8);
    let action: GameAction | undefined;
    if (nearest && !state.motion) {
      const blocked = state
        .obstacles!.filter((o) => o.at === nearest.at)
        .map((o) => o.lane);
      const safe = [0, 1, 2]
        .filter((l) => !blocked.includes(l))
        .sort((a, b) => Math.abs(a - state.lane) - Math.abs(b - state.lane))[0];
      if (safe !== state.lane) action = safe < state.lane ? "left" : "right";
    }
    state = stepGame(state, action ? [action] : []);
    for (const o of state.obstacles!) {
      if (!rows.has(o.at)) rows.set(o.at, []);
      const a = rows.get(o.at)!;
      if (!a.includes(o.lane)) a.push(o.lane);
    }
  }
  for (const [, blocked] of [...rows].sort((a, b) => a[0] - b[0])) {
    assert.ok(blocked.length <= 2);
    if (blocked.length === 2) {
      double = true;
      const safe = [0, 1, 2].find((l) => !blocked.includes(l))!;
      if (previousSafe !== undefined)
        assert.ok(Math.abs(safe - previousSafe) <= 2);
      previousSafe = safe;
    }
  }
  assert.ok(double);
});
test("crossing uses continuous shared positions, small 9-column hops and no teleport collision", () => {
  let s = initialGame("crossing", 1);
  assert.equal(s.lane, 4);
  s = stepGame(s, ["right"]);
  assert.equal(s.positionX, 4.2);
  assert.equal(s.lane, 4);
  s = stepGame(s);
  assert.ok(s.positionX! > 4 && s.positionX! < 5);
  for (let i = 1; i < 7; i++) s = stepGame(s);
  assert.equal(s.positionX, 5);
  assert.equal(s.lane, 5);
  for (let i = 0; i < 2; i++) {
    s = stepGame(s, ["forward"]);
    for (let k = 0; k < 7; k++) s = stepGame(s);
  }
  assert.equal(s.score, 2);
  s = stepGame(s, ["back"]);
  for (let k = 0; k < 7; k++) s = stepGame(s);
  assert.equal(s.score, 2);
  const row = Array.from({ length: 15 }, (_, i) => i + 3).find(
    (r) => crossingRow(1, r) === "road",
  )!;
  const car = crossingEntities(1, row, 50).find((e) => e.x > 1 && e.x < 7)!;
  const hit = stepGame({
    ...initialGame("crossing", 1),
    tick: 49,
    row,
    positionRow: row,
    positionX: car.x,
    lane: Math.round(car.x),
  });
  assert.equal(hit.status, "failed");
  assert.equal(hit.hitId, car.id);
  const safe = stepGame({
    ...initialGame("crossing", 1),
    tick: 49,
    row,
    positionRow: row,
    positionX: car.x + car.width / 2 + 0.5,
  });
  assert.equal(safe.status, "running");
});
test("water carries a grounded passenger by the same world velocity as the visible log", () => {
  const row = Array.from({ length: 100 }, (_, i) => i + 7).find(
    (r) => crossingRow(12, r) === "water",
  )!;
  const log = crossingEntities(12, row, 100).find((e) => e.x > 2 && e.x < 6)!;
  let s: GameState = {
    ...initialGame("crossing", 12),
    row,
    positionRow: row,
    positionX: log.x,
    lane: Math.round(log.x),
    tick: 100,
    maxRow: row,
    score: row,
  };
  const x = s.positionX!;
  for (let i = 0; i < 15; i++) s = stepGame(s);
  assert.equal(s.status, "running");
  assert.notEqual(s.positionX, x);
  const current = crossingEntities(12, row, 115).find((e) => e.id === log.id)!;
  assert.ok(Math.abs(s.positionX! - current.x) < 0.001);
});
test("new sessions use latest rules; historic v1/v2 replays and actual EP completion stay versioned", () => {
  const user = newState("version", true),
    now = Date.now();
  const p = startPlay(user, "runner", now);
  assert.equal(p.version, GAME_VERSION);
  const { s, inputs } = run("runner", p.seed);
  const result = completePlay(
    user,
    p.id,
    { inputs, ticks: s.tick, abandon: false },
    now + (s.tick / 30) * 1000,
  );
  assert.equal(result.score, 100);
  assert.equal(result.ep, s.ep);
  assert.equal(user.balance, 125+s.ep);
  assert.deepEqual(
    completePlay(user, p.id, { inputs: [], ticks: 0, abandon: true }, now),
    result,
  );
  assert.equal(daily(user, p.date).playsUsed, 1);
  const oldInputs = Array.from({ length: 33 }, (_, i) => ({
    tick: 45 + i * 54,
    action: "jump" as const,
  }));
  assert.equal(
    replayGame("dino", 123, oldInputs, 1800, "prototype-game-v1").status,
    "cleared",
  );
  const old2 = Array.from({ length: 20 }, (_, i) => ({
    tick: 75 + i * 90,
    action: "jump" as const,
  }));
  assert.equal(
    replayGame("dino", 123, old2, 1800, "prototype-game-v2").status,
    "cleared",
  );
  assert.throws(() => replayGame("runner", 1, [], 1, "unknown"), /VERSION/);
  assert.throws(
    () =>
      replayGame(
        "runner",
        1,
        [
          { tick: 1, action: "left" },
          { tick: 1, action: "right" },
        ],
        2,
      ),
    /LOG/,
  );
});

import { touchAction, runnerSpeed } from "@aimi/game-core";
import {
  GARDEN_ITEM_GEOMETRY,
  GARDEN_ASPECT,
  gardenItemSize,
  clampGardenPlacement,
  gardenPlacementInBounds,
} from "@aimi/contracts";
test("touch mapping uses the dominant swipe axis and matches the keyboard actions", () => {
  assert.equal(touchAction("crossing", 0, 0), "forward");
  assert.equal(touchAction("crossing", 50, 10), "right");
  assert.equal(touchAction("crossing", -50, 10), "left");
  assert.equal(touchAction("crossing", 20, -80), "forward");
  assert.equal(touchAction("crossing", -20, 80), "back");
  assert.equal(touchAction("runner", 0, 0), undefined);
  assert.equal(touchAction("runner", 25, 80), undefined);
  assert.equal(touchAction("runner", -50, 4), "left");
  assert.equal(touchAction("dino", 0, 0), "jump");
});
test("v4 accelerates distinctly, retains historical v3 rules and keeps tight garden bounds legal", () => {
  assert.ok(runnerSpeed("dino", 99) / runnerSpeed("dino", 0) > 1.85);
  assert.ok(runnerSpeed("runner", 99) / runnerSpeed("runner", 0) > 2.25);
  for (const kind of ["dino", "runner"] as const)
    for (let score = 1; score <= 99; score++)
      assert.ok(runnerSpeed(kind, score) > runnerSpeed(kind, score - 1));
  const old = initialGame("runner", 123, "aimi-game-v3");
  assert.equal(stepGame(old).version, "aimi-game-v3");
  assert.deepEqual(
    replayGame("runner", 123, [], 1, "aimi-game-v3"),
    stepGame(old),
  );
  for (const [id, spec] of Object.entries(GARDEN_ITEM_GEOMETRY)) {
    const size = gardenItemSize(id);
    assert.ok(
      Math.abs(
        (size.width * GARDEN_ASPECT) / size.height -
          spec.viewBox[2] / spec.viewBox[3],
      ) < 1e-8,
    );
    for (const x of [-10, 0, 0.5, 1, 10])
      for (const y of [-10, 0, 0.5, 1, 10])
        assert.ok(
          gardenPlacementInBounds(clampGardenPlacement({ itemId: id, x, y })),
          id,
        );
  }
  assert.ok(gardenItemSize("fence").width < 0.4);
});

import { runnerPattern, runnerGapAfter, dinoPattern } from "@aimi/game-core";
test("authored runner patterns cover both sides, forbid long safe-lane repetition and budget two-lane changes", () => {
  for (let seed = 1; seed <= 30; seed++) {
    const names = new Set<string>(),
      counts = [0, 0, 0];
    let same = 0,
      last = -1;
    for (let index = 3; index < 63; index++) {
      const p = runnerPattern(seed, index),
        next = runnerPattern(seed, index + 1);
      names.add(p.name);
      counts[p.safe]++;
      same = p.safe === last ? same + 1 : 1;
      last = p.safe;
      assert.ok(same <= 2, `seed ${seed} repeats lane ${p.safe}`);
      const gap = runnerGapAfter(seed, index, 700);
      assert.ok(gap >= (Math.abs(next.safe - p.safe) === 2 ? 0.92 : 0.65));
    }
    assert.equal(names.size, 3);
    assert.ok(counts.every((n) => n >= 12));
  }
});
test("camping in any lane or holding one direction cannot survive the opening patterns", () => {
  for (let seed = 1; seed <= 30; seed++)
    for (const lane of [0, 1, 2]) {
      let s = { ...initialGame("runner", seed), lane, positionX: lane };
      while (s.status === "running") s = stepGame(s);
      assert.equal(s.status, "failed");
      assert.ok(s.score < 25, `${seed}/${lane} camped to ${s.score}`);
    }
  for (const action of ["left", "right"] as const) {
    let s = initialGame("runner", 123);
    while (s.status === "running") s = stepGame(s, [action]);
    assert.equal(s.status, "failed");
    assert.ok(s.score < 25);
  }
});
test("latest speed increase and Dino rhythm patterns preserve previous v4 replay", () => {
  assert.equal(stepGame(initialGame("runner", 1, "aimi-game-v4")).speed, 16);
  assert.equal(stepGame(initialGame("runner", 1)).speed, 22);
  assert.equal(stepGame(initialGame("dino", 1, "aimi-game-v4")).speed, 225);
  assert.equal(stepGame(initialGame("dino", 1)).speed, 300);
  const patterns = Array.from({ length: 12 }, (_, i) => dinoPattern(77, i));
  assert.ok(patterns.some((p) => p.width >= 38));
  assert.ok(patterns.some((p) => p.kind === "rock"));
  assert.ok(
    Math.max(...patterns.map((p) => p.gapAfter)) -
      Math.min(...patterns.map((p) => p.gapAfter)) >
      0.3,
  );
  assert.ok(patterns.every((p) => p.gapAfter >= 0.66));
});

test("v6 doubles completion distances, enlarges Dino obstacles and preserves v5 rules", () => {
  assert.equal(GAME_VERSION, "aimi-game-v11");
  assert.equal(V3.dinoDistancePerPoint, 280);
  assert.equal(V3.runnerDistancePerPoint, 20);
  assert.equal(stepGame(initialGame("dino", 1, "aimi-game-v5")).speed, 245);
  assert.equal(stepGame(initialGame("runner", 1, "aimi-game-v5")).speed, 18);
  for (let index = 0; index < 20; index++) {
    const p = dinoPattern(42, index);
    assert.ok(p.width >= 24 && p.height >= 34);
    assert.ok(p.height < V3.dinoJumpHeight);
  }
});


test("v7 shortens Dino airtime and timing window while retaining completable dense patterns", () => {
  assert.equal(V3.dinoJumpTicks, 18);
  assert.equal(V3.dinoJumpHeight, 70);
  assert.equal(stepGame(initialGame("dino", 1, "aimi-game-v6")).speed, 270);
  const survives = (version: string, lead: number) => {
    const speed = version === "aimi-game-v6" ? 435 : 490;
    let s: GameState = {
      ...initialGame("dino", 1, version),
      score: 50, distance: 14000, nextAt: 1e9,
      obstacles: [{ id: 1, at: 14000 + 72 + speed * lead + 27 + 11,
        width: 54, height: 48, lane: 0, kind: "cactus" }],
    };
    s = stepGame(s, ["jump"]);
    for (let t = 0; t < 55 && s.status === "running"; t++) s = stepGame(s);
    return s.status === "running";
  };
  const count = (version: string) => Array.from({ length: 71 }, (_, n) => n / 100)
    .filter(lead => survives(version, lead)).length;
  assert.ok(count(GAME_VERSION) < count("aimi-game-v6") * 0.7);
  assert.ok(survives(GAME_VERSION, 0.22));
  assert.equal(survives(GAME_VERSION, 0.02), false);
  assert.equal(survives(GAME_VERSION, 0.5), false);
  for (let seed = 1; seed <= 30; seed++) {
    const { s } = run("dino", seed);
    assert.equal(s.status, "cleared", `dense Dino seed ${seed} fails at ${s.score}`);
    assert.equal(s.score, 100);
  }
});


import { repeatJumpAction } from "@aimi/game-core";
test("v8 dense pairs require two jumps; double tap and held input clear them with identical replay", () => {
  const make = () => {
    const distance = 14000, speed = 490;
    const first = distance + V3.playerX + speed * 0.22 + 13 + 11;
    return {
      ...initialGame("dino", 7), score: 50, distance, nextAt: 1e9,
      obstacles: [0,1].map(index => ({ id: index, at: first + index * speed * .66,
        width: 26, height: 40, lane: 0, kind: "cactus" as const })),
    };
  };
  const simulate = (mode: "single" | "double" | "hold") => {
    let s: GameState = make();
    const events: GameInput[] = [];
    const takeoffs: number[] = [];
    while (s.tick < 60 && s.status === "running") {
      const action = mode === "hold" ? repeatJumpAction(s, s.tick < 20)
        : s.tick === 0 || (mode === "double" && s.tick === 1) ? "jump" : undefined;
      const old = s;
      if (action) events.push({tick:s.tick+1,action});
      s = stepGame(s, action ? [action] : []);
      if (s.jumpUntil > old.jumpUntil) takeoffs.push(s.tick);
    }
    let replay: GameState = make();
    for (let tick=1; tick<=s.tick; tick++) {
      const e=events.find(e=>e.tick===tick);
      replay=stepGame(replay,e?[e.action]:[]);
    }
    assert.deepEqual(replay,s);
    return {s,takeoffs};
  };
  assert.equal(simulate("single").s.status,"failed");
  for (const mode of ["double","hold"] as const) {
    const {s,takeoffs}=simulate(mode);
    assert.equal(s.status,"running");
    assert.equal(s.passed,2);
    assert.deepEqual(takeoffs,[1,19]);
  }
  assert.equal(repeatJumpAction({...make(),status:"failed"},true),undefined);
  assert.equal(repeatJumpAction(make(),false),undefined);
});
test("v8 reserves only one extra jump and keeps historical v7 double-tap timing", () => {
  for (const version of [GAME_VERSION,"aimi-game-v7"]) {
    let s=initialGame("dino",1,version);
    s={...s,nextAt:1e9};
    const takeoffs:number[]=[];
    for(let tick=1;tick<=60;tick++) {
      const old=s;
      s=stepGame(s,tick<=2?["jump"]:[]);
      if(s.jumpUntil>old.jumpUntil)takeoffs.push(tick);
    }
    assert.deepEqual(takeoffs,version===GAME_VERSION?[1,19]:[1]);
  }
  for(let index=2;index<26;index++) {
    const p=dinoPattern(7,index);
    if ([0,3,6].includes((index-2)%8))assert.ok(p.gapAfter>=.66&&p.gapAfter<=.68);
  }
});


import { gameInputReady } from "@aimi/game-core";
test("v9 starts moving on the input tick and chains two tiles without an idle frame or score loss", () => {
  let s=initialGame("crossing",1);
  const pending:GameAction[]=["forward","forward"], inputs:GameInput[]=[];
  let last=0;
  for(let tick=1;tick<=10;tick++) {
    const action=gameInputReady(s)?pending.shift():undefined;
    if(action)inputs.push({tick,action});
    s=stepGame(s,action?[action]:[]);
    assert.ok(Math.abs(s.positionRow!-last-.2)<1e-8, `motion interrupted at ${tick}`);
    assert.equal(s.status,"running");
    last=s.positionRow!;
    if(tick===5)assert.equal(s.score,1);
  }
  assert.equal(V3.hopTicks,5);
  assert.equal(s.row,2);
  assert.equal(s.score,2);
  assert.deepEqual(inputs.map(e=>e.tick),[1,5]);
  assert.deepEqual(replayGame("crossing",1,inputs,10),s);
  const old=stepGame(initialGame("crossing",1,"aimi-game-v8"),["forward"]);
  assert.equal(old.positionRow,0);
  assert.equal(old.motion!.duration,7);
});
test("v9 consecutive hops still collide with a car in the intermediate lane", () => {
  const car=crossingEntities(1,3,3).find(e=>e.x>2&&e.x<6)!;
  let s:GameState={...initialGame("crossing",1),row:2,positionRow:2,maxRow:2,score:2,
    positionX:car.x,lane:Math.round(car.x)};
  const pending:GameAction[]=["forward","forward"];
  for(let tick=0;tick<10&&s.status==="running";tick++) {
    const action=gameInputReady(s)?pending.shift():undefined;
    s=stepGame(s,action?[action]:[]);
  }
  assert.equal(s.status,"failed");
  assert.equal(s.score,2);
  assert.ok(s.positionRow!<3);
});


test("economy v3 limits random collected game rewards plus challenge, attendance and tip to 34 EP", async () => {
  const { FileRepository } = await import("../src/modules/repository.js");
  const { registerPrototype } = await import("../src/modules/routes.js");
  const { submitAttempt } = await import("../src/modules/domain.js");
  const { contentForDate, KEYWORDS } = await import("../src/services/content/fixture.js");
  const { ECONOMY_POLICY, seoulDate } = await import("@aimi/contracts");
  const Fastify = (await import("fastify")).default;
  // Keep the simulated 100-second play inside the same Korean day, including real midnight test runs.
  const date=seoulDate(),now=Date.parse(date+"T12:00:00+09:00"),repo=new FileRepository();
  await repo.transaction(["economy-v2"],states=>{
    const s=states["economy-v2"];
    const amounts=[];
    for(let i=0;i<5;i++){
      const p=startPlay(s,"runner",now-100000);
      const {s:game,inputs}=run("runner",p.seed);
      amounts.push(completePlay(s,p.id,{inputs,ticks:game.tick,abandon:false},now).ep);
    }
    assert.ok(amounts.every(ep=>ep>=0&&ep<=7));
    assert.equal(amounts.reduce((sum,ep)=>sum+ep,0),15);
    assert.equal(daily(s,date).gameEP,15);
    const expected=contentForDate(date).expected as Record<string,string>;
    const ids=KEYWORDS.filter(k=>expected[k.group]===k.value).map(k=>k.id);
    const result=submitAttempt(s,{keywordIds:ids,model:"low",date},now);
    assert.equal(result.ep,15);
    assert.throws(()=>submitAttempt(s,{keywordIds:ids,model:"low",date},now),/ALREADY_SUCCEEDED/);
  });
  const app=Fastify();registerPrototype(app,repo,async()=>"economy-v2");
  try{
    for(const type of ["attendance","tip"]){
      const results=await Promise.all([1,2].map(()=>app.inject({method:"POST",url:"/v1/dev/rewards/"+type,
        headers:{"idempotency-key":"economy-v2-"+type},payload:{}})));
      assert.ok(results.every(r=>r.statusCode===200));
    }
    assert.equal((await repo.read("economy-v2")).balance-125,ECONOMY_POLICY.dailyMaximum);
  }finally{await app.close();}
});


import { coinCountFor, gameCoins, crossingVelocity, crossingTraffic } from "@aimi/game-core";
test("physical coins require the correct position and cannot be collected twice or replaced by score", () => {
  const cross=()=>({...initialGame("crossing",1),nextAt:1e9,coins:[{id:1,x:4,row:0,at:0,height:0}]});
  assert.equal(stepGame({...cross(),positionX:1,lane:1}).ep,0);
  let s=stepGame(cross());assert.equal(s.ep,1);assert.equal(gameCoins(s).length,0);
  assert.equal(stepGame(s).ep,1);
  assert.equal(stepGame({...cross(),coins:[],score:100,maxRow:100}).ep,0);
  const dino=()=>({...initialGame("dino",1),nextAt:1e9,coins:[{id:1,x:0,row:0,at:77,height:82}]});
  assert.equal(stepGame(dino()).ep,0); // Same horizontal location, wrong height.
  assert.equal(stepGame({...dino(),jumpUntil:9}).ep,1);
  assert.equal(stepGame({...dino(),jumpUntil:9,coins:[{...dino().coins[0],at:999}]}).ep,0);
  const runner=()=>({...initialGame("runner",1),nextAt:1e9,score:95,distance:1900,
    coins:[{id:1,x:1,row:0,at:1901,height:0}]});
  assert.equal(stepGame({...runner(),positionX:0,lane:0}).ep,0);
  assert.equal(stepGame(runner()).ep,1); // Crosses the coin between two fast frames.
});
test("seeded coin counts vary from four to seven and fast traffic stays versioned", () => {
  for(const kind of ["crossing","dino","runner"] as const){
    const counts=new Set<number>();
    for(let seed=0;seed<100;seed++){
      const count=coinCountFor(kind,seed);counts.add(count);
      assert.ok(count>=4&&count<=7);
      assert.equal(count,coinCountFor(kind,seed));
    }
    assert.equal(counts.size,4);
  }
  let fast=0,normal=0;
  for(let row=3;row<60;row++) {
    if(crossingRow(1,row)!=="road")continue;
    const old=Math.abs(crossingVelocity(1,row,"aimi-game-v10")), current=Math.abs(crossingVelocity(1,row));
    if(crossingTraffic(1,row)==="fast"){fast++;assert.ok(Math.abs(current/old-1.55)<1e-8);}
    else{normal++;assert.equal(current,old);}
  }
  assert.ok(fast>0&&normal>0);
  let old=initialGame("dino",1,"aimi-game-v10");
  old=stepGame({...old,score:100,distance:28000,nextAt:1e9});
  assert.equal(old.ep,10);
});
