import React, { useState, useEffect, useRef } from "react";
import type { Play } from "@aimi/contracts";
import {
  RULES,
  GAME_VERSION,
  initialGame,
  replayGame,
  stepGame,
  rowType,
  crossingObstacle,
  crossingPosition,
  timingFor,
  jumpHeight,
  obstacleLane,
  touchAction,
  repeatJumpAction,
  gameInputReady,
  coinCountFor,
  type GameState,
  type GameInput,
  type GameAction,
} from "@aimi/game-core";
import { drawGameScene, type SceneView } from "./renderer";
import { useApp } from "../../app/context";
import { Button, Icon, Modal } from "../../ui/primitives";
import { request } from "../../lib/api/client";
export function GameScreen() {
  const a = useApp(),
    canvas = useRef<HTMLCanvasElement>(null),
    simulation = useRef<GameState | null>(null),
    events = useRef<GameInput[]>([]),
    pending = useRef<GameAction[]>([]),
    jumpHeld = useRef(new Set<string>()),
    moveHeld = useRef(new Map<string, GameAction>()),
    playRef = useRef<Play | null>(null),
    [play, setPlay] = useState<Play | null>(null),
    [paused, setPaused] = useState(false),
    pausedRef = useRef(false),
    [hud, setHud] = useState({ score: 0, ep: 0 }),
    [result, setResult] = useState<Play["result"] | null>(null),
    [saving, setSaving] = useState(false),
    [ending, setEnding] = useState<string | null>(null),
    submitted = useRef(false),
    [started, setStarted] = useState(false),
    [saveError, setSaveError] = useState(false);
  const enqueue = (action: GameAction) => {
    if (
      !started ||
      pausedRef.current ||
      simulation.current?.status !== "running" ||
      submitted.current
    )
      return;
    if (playRef.current?.kind === "crossing" && simulation.current?.motion)
      pending.current = [action];
    else if (pending.current.length < 2) pending.current.push(action);
  };
  const syncPause = (value: boolean) => {
    pausedRef.current = value;
    if (value) {
      pending.current = [];
      jumpHeld.current.clear();
      moveHeld.current.clear();
    }
    setPaused(value);
  };
  async function finish(abandon = false) {
    const origin = a.path;
    const p = playRef.current,
      s = simulation.current;
    if (!p || !s || submitted.current) return;
    submitted.current = true;
    setHud({ score: s.score, ep: s.ep });
    if (!abandon && s.status !== "running") {
      setEnding(
        s.status === "cleared"
          ? "100점! 숲길 완주!"
          : (s.deathReason ?? "다음에는 조금 더 멀리 가봐요."),
      );
      await new Promise((resolve) => setTimeout(resolve, 700));
      setEnding(null);
    }
    setSaving(true);
    const r = await a.perform(
      () =>
        request<NonNullable<Play["result"]>>(
          "/v1/game-plays/" + p.id + "/complete",
          "POST",
          { inputs: events.current, ticks: s.tick, abandon },
        ),
      undefined,
      "background",
    );
    setSaving(false);
    if (r) {
      if (!a.isCurrentPath(origin)) return;
      sessionStorage.removeItem("aimi.game." + p.id);
      setSaveError(false);
      if (abandon) {
        a.navigate("/mission", { replace: true });
      } else {
        setResult(r);
        a.navigate("/results/game/" + encodeURIComponent(p.id), {
          replace: true,
        });
      }
    } else {
      submitted.current = false;
      pausedRef.current = true;
      setSaveError(true);
    }
  }
  useEffect(() => {
    let cancelled = false;
    const returnToMission = () => {
      history.replaceState({}, "", "/mission");
      window.dispatchEvent(new PopStateEvent("popstate"));
    };
    const params = new URLSearchParams(location.search);
    if (params.has("practice") || params.has("kind")) {
      returnToMission();
      return;
    }
    if (
      a.data &&
      (a.data.daily.attemptsUsed > 0 ||
        a.data.daily.success ||
        a.data.daily.challengeClosed ||
        (!a.data.daily.challengeVersion && a.data.daily.attemptsUsed >= 5))
    ) {
      returnToMission();
      return;
    }
    if (a.data && a.data.daily.playsUsed >= 5 && !a.data.activePlay) {
      returnToMission();
      return;
    }
    void a
      .perform(
        () => request<Play>("/v1/game-plays", "POST", {}),
        undefined,
        "background",
      )
      .then((p) => {
        if (cancelled) return;
        if (!p) {
          returnToMission();
          return;
        }
        let s = initialGame(p.kind, p.seed, p.version);
        let log: GameInput[] = [];
        try {
          const old = JSON.parse(
            sessionStorage.getItem("aimi.game." + p.id) ?? "null",
          );
          if (old) {
            s = replayGame(p.kind, p.seed, old.events, old.tick, p.version);
            log = old.events;
          }
        } catch {
          sessionStorage.removeItem("aimi.game." + p.id);
        }
        simulation.current = s;
        events.current = log;
        playRef.current = p;
        setPlay(p);
        setHud({ score: s.score, ep: s.ep });
        if (s.tick > 0) {
          setStarted(true);
          syncPause(s.status === "running");
        }
        if (s.status !== "running") void finish();
      });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!play) return;
    let raf = 0,
      last = performance.now(),
      acc = 0;
    const timing = timingFor(play.version);
    const sceneView: SceneView = {
      cameraRow: simulation.current?.positionRow ?? 0,
      pulse: 0,
      debug:
        import.meta.env.DEV &&
        a.localRuntime &&
        new URLSearchParams(location.search).get("hitboxes") === "1",
    };
    const visual = {
      row: simulation.current?.row ?? 0,
      lane: simulation.current?.lane ?? 1,
    };
    let renderDt = 0;
    const sprites: Record<string, HTMLImageElement> = {};
    for (const id of [play.character]) {
      const im = new Image();
      im.src = "/content/" + id + ".svg";
      sprites[id] = im;
    }
    const draw = (s: GameState) => {
      const el = canvas.current;
      if (!el) return;
      const rect = el.getBoundingClientRect(),
        dpr = Math.min(devicePixelRatio, 2);
      if (
        el.width !== Math.floor(rect.width * dpr) ||
        el.height !== Math.floor(rect.height * dpr)
      ) {
        el.width = Math.floor(rect.width * dpr);
        el.height = Math.floor(rect.height * dpr);
      }
      const c = el.getContext("2d")!;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = rect.width,
        h = rect.height;
      c.clearRect(0, 0, w, h);
      if (
        s.version === GAME_VERSION ||
        s.version === "aimi-game-v3" ||
        s.version === "aimi-game-v4" ||
        s.version === "aimi-game-v5" ||
        s.version === "aimi-game-v6" ||
        s.version === "aimi-game-v7" ||
        s.version === "aimi-game-v8" ||
        s.version === "aimi-game-v9" ||
        s.version === "aimi-game-v10" ||
        s.version === "aimi-game-v11"
      ) {
        drawGameScene(c, s, w, h, sprites[play.character], sceneView);
        return;
      }
      const blend = 1 - Math.exp(-renderDt / 90);
      visual.row += (s.row - visual.row) * blend;
      visual.lane += (s.lane - visual.lane) * blend;
      const avatar = (x: number, y: number, size = 64) => {
        const im = sprites[play.character];
        if (im?.complete && im.naturalWidth)
          c.drawImage(im, x - size / 2, y - size / 2, size, size);
      };
      if (s.kind === "crossing") {
        c.fillStyle = "#B4D1B5";
        c.fillRect(0, 0, w, h);
        const rh = 70,
          lw = w / 5,
          base = h * 0.78;
        for (let offset = -2; offset < 10; offset++) {
          const row = s.row + offset;
          if (row < 0) continue;
          const y = base - (row - visual.row) * rh,
            type = rowType(s.seed, row);
          c.fillStyle =
            type === "grass"
              ? "#B4D1B5"
              : type === "road"
                ? "#77887E"
                : "#8BB7C4";
          c.fillRect(0, y - rh, w, rh);
          if (type === "road") {
            c.fillStyle = "#E7EEDD";
            for (let k = 0; k < 5; k++)
              c.fillRect(k * lw + 10, y - rh / 2, 24, 3);
            const car =
              play.version === "prototype-game-v1"
                ? crossingObstacle(s.seed, row, s.tick, play.version)
                : crossingPosition(s.seed, row, s.tick);
            c.fillStyle = ["#E8C5A2", "#A7BCC5"][row % 2];
            for (const wrap of [-5, 0, 5])
              c.fillRect((car + wrap) * lw + 4, y - rh + 18, lw - 8, 28);
            c.fillStyle = "#52655A";
            for (const wrap of [-5, 0, 5])
              c.fillRect((car + wrap) * lw + 12, y - rh + 23, lw - 24, 10);
          }
          if (type === "water") {
            const log =
              play.version === "prototype-game-v1"
                ? crossingObstacle(s.seed, row, s.tick, play.version)
                : crossingPosition(s.seed, row, s.tick);
            c.fillStyle = "#A78361";
            for (const lane of [log - 5, log - 4, log, log + 1, log + 5])
              c.fillRect(lane * lw + 3, y - rh + 15, lw - 6, 27);
          }
          if (row % 5 === 0) {
            c.fillStyle = "#527A41";
            c.beginPath();
            c.arc(lw * 2.5, y - rh / 2, 7, 0, Math.PI * 2);
            c.fill();
          }
        }
        avatar(
          (visual.lane + 0.5) * lw,
          base - rh / 2 - (s.row - visual.row) * rh,
          64,
        );
      } else if (s.kind === "dino") {
        c.fillStyle = "#DFE9D5";
        c.fillRect(0, 0, w, h);
        c.fillStyle = "#BDCFAB";
        c.beginPath();
        c.arc(w * 0.8, h * 0.4, 110, 0, Math.PI * 2);
        c.fill();
        const floor = h * 0.75;
        c.fillStyle = "#B3C49B";
        c.fillRect(0, floor, w, h - floor);
        c.strokeStyle = "#7E9968";
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(0, floor);
        c.lineTo(w, floor);
        c.stroke();
        for (let i = 0; i < 10; i++) {
          const x = (((i * 57 - s.tick * 1.5) % (w + 60)) + w + 60) % (w + 60);
          c.fillStyle = "#A1B58F";
          c.fillRect(x, floor + 24, 18, 2);
        }
        const phase = s.tick % timing.obstacleTicks,
          playerX = w * 0.24,
          x = playerX + (1 - phase / timing.obstacleTicks) * (w + 40 - playerX);
        c.fillStyle = "#668A51";
        c.fillRect(x, floor - 40, 17, 40);
        c.fillRect(x - 9, floor - 29, 9, 8);
        c.fillRect(x + 17, floor - 23, 8, 8);
        avatar(playerX, floor - 30 - jumpHeight(s), 76);
      } else {
        c.fillStyle = "#B4D1B5";
        c.fillRect(0, 0, w, h);
        c.fillStyle = "#6B8E68";
        for (let i = 0; i < 8; i++) {
          c.beginPath();
          c.arc((i * 71 + (s.seed % 31)) % w, 100 + i * 57, 40, 0, Math.PI * 2);
          c.fill();
        }
        c.fillStyle = "#C0AD88";
        c.beginPath();
        c.moveTo(w * 0.43, 110);
        c.lineTo(w * 0.57, 110);
        c.lineTo(w, h);
        c.lineTo(0, h);
        c.closePath();
        c.fill();
        c.strokeStyle = "#E2D7BC";
        c.lineWidth = 2;
        for (const f of [1 / 3, 2 / 3]) {
          c.beginPath();
          c.moveTo(w * 0.43 + w * 0.14 * f, 110);
          c.lineTo(w * f, h);
          c.stroke();
        }
        const phase = (s.tick % timing.obstacleTicks) / timing.obstacleTicks,
          index = Math.floor(s.tick / timing.obstacleTicks) + 1,
          y = 150 + phase * (h - 235),
          lane = obstacleLane(s.seed, index),
          width = 20 + phase * 50,
          spread = 25 + phase * (w / 3 - 25),
          x = w / 2 + (lane - 1) * spread;
        c.fillStyle = "#A48664";
        c.fillRect(x - width / 2, y - width / 2, width, width);
        avatar((w * (visual.lane + 0.5)) / 3, h - 85, 80);
      }
    };
    const frame = (now: number) => {
      const s = simulation.current;
      if (!s) return;
      const dt = Math.min(now - last, 100);
      last = now;
      renderDt = dt;
      if (
        started &&
        !pausedRef.current &&
        s.status === "running" &&
        !submitted.current
      ) {
        acc += dt;
        while (acc >= 1000 / RULES.tickRate) {
          const current = simulation.current!;
          const action = !gameInputReady(current)
            ? undefined
            : (pending.current.shift() ??
              (play.kind === "crossing"
                ? [...moveHeld.current.values()].at(-1)
                : repeatJumpAction(current, jumpHeld.current.size > 0)));
          if (action)
            events.current.push({ tick: simulation.current!.tick + 1, action });
          simulation.current = stepGame(
            simulation.current!,
            action ? [action] : [],
          );
          acc -= 1000 / RULES.tickRate;
          if (simulation.current!.status !== "running") {
            void finish();
            break;
          }
        }
        if (
          simulation.current!.tick % 3 === 0 ||
          simulation.current!.status !== "running"
        ) {
          setHud({
            score: simulation.current!.score,
            ep: simulation.current!.ep,
          });
          if (simulation.current!.tick % 15 === 0)
            sessionStorage.setItem(
              "aimi.game." + play.id,
              JSON.stringify({
                tick: simulation.current!.tick,
                events: events.current,
              }),
            );
        }
      }
      draw(simulation.current!);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const keydown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (
        !started ||
        pausedRef.current ||
        simulation.current?.status !== "running" ||
        document.querySelector("dialog[open]")
      )
        return;
      const map: Record<string, GameAction> = {
        ArrowUp: play.kind === "dino" ? "jump" : "forward",
        " ": play.kind === "dino" ? "jump" : "forward",
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowDown: "back",
      };
      if (map[e.key]) {
        e.preventDefault();
        if (play.kind === "dino" && map[e.key] === "jump")
          jumpHeld.current.add("key:" + e.key);
        if (play.kind === "crossing")
          moveHeld.current.set("key:" + e.key, map[e.key]);
        if (e.repeat) return;
        enqueue(map[e.key]);
      }
    };
    const visibility = () => {
      if (
        started &&
        document.hidden &&
        simulation.current?.status === "running"
      ) {
        syncPause(true);
        sessionStorage.setItem(
          "aimi.game." + play.id,
          JSON.stringify({
            tick: simulation.current!.tick,
            events: events.current,
          }),
        );
      }
    };
    const keyup = (e: KeyboardEvent) => {
      jumpHeld.current.delete("key:" + e.key);
      moveHeld.current.delete("key:" + e.key);
    };
    const releaseHeld = () => {
      jumpHeld.current.clear();
      moveHeld.current.clear();
    };
    document.addEventListener("keyup", keyup);
    window.addEventListener("blur", releaseHeld);
    document.addEventListener("keydown", keydown);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelAnimationFrame(raf);
      jumpHeld.current.clear();
      moveHeld.current.clear();
      document.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", releaseHeld);
      document.removeEventListener("keydown", keydown);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [play, started]);
  useEffect(() => {
    a.blockNavigation(() => {
      if (
        started &&
        !saveError &&
        simulation.current?.status === "running" &&
        !submitted.current
      ) {
        syncPause(true);
        return false;
      }
      return true;
    });
    return () => a.blockNavigation(null);
  }, [started, saveError, a.blockNavigation]);
  const startTouch = useRef<{ x: number; y: number } | null>(null);
  const pointerDown = (e: React.PointerEvent) => {
    if (play?.kind === "dino") {
      if (
        !started ||
        pausedRef.current ||
        submitted.current ||
        simulation.current?.status !== "running" ||
        !e.isPrimary
      )
        return;
      e.preventDefault();
      jumpHeld.current.add("pointer:" + e.pointerId);
      e.currentTarget.setPointerCapture(e.pointerId);
      enqueue("jump");
      return;
    }
    startTouch.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const releasePointer = (e: React.PointerEvent) => {
    jumpHeld.current.delete("pointer:" + e.pointerId);
    moveHeld.current.delete("pointer:" + e.pointerId);
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  };
  const pressDirection = (e: React.PointerEvent, action: GameAction) => {
    e.preventDefault();
    if (
      play?.kind === "crossing" &&
      started &&
      !pausedRef.current &&
      !submitted.current
    ) {
      moveHeld.current.set("pointer:" + e.pointerId, action);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    enqueue(action);
  };
  const pointerMove = (e: React.PointerEvent) => {
    const start = startTouch.current;
    if (play?.kind !== "crossing" || !start) return;
    const dx = e.clientX - start.x,
      dy = e.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    const action = touchAction(play.kind, dx, dy);
    if (action) enqueue(action);
    startTouch.current = null;
  };
  const pointerUp = (e: React.PointerEvent) => {
    releasePointer(e);
    if (!play || !started || paused || simulation.current?.status !== "running")
      return;
    const start = startTouch.current;
    if (!start) return;
    const dx = e.clientX - start.x,
      dy = e.clientY - start.y;
    const action = touchAction(play.kind, dx, dy);
    if (action) enqueue(action);
    startTouch.current = null;
  };
  if (!play)
    return (
      <div className="game-loading" role="status">
        게임을 준비하고 있어요.
      </div>
    );
  return (
    <div
      className="game-container"
      data-game-version={play.version}
      data-game-kind={play.kind}
    >
      <canvas
        ref={canvas}
        aria-label="게임 화면"
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={(e) => {
          releasePointer(e);
          startTouch.current = null;
        }}
        onLostPointerCapture={releasePointer}
      />
      <div
        className="game-progress"
        aria-label="완주 진행률"
        role="progressbar"
        aria-valuenow={hud.score}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <i style={{ width: `${hud.score}%` }} />
      </div>
      <div className="game-stage">
        {hud.score < 25
          ? "가볍게 출발!"
          : hud.score < 60
            ? "리듬을 타봐요"
            : hud.score < 85
              ? "조금 더 집중!"
              : "완주까지 조금만!"}
      </div>
      <div className="game-hud">
        <span>점수 {hud.score} / 100</span>
        <span>
          {`모은 EP ${hud.ep}${play.version === GAME_VERSION ? " / " + coinCountFor(play.kind, play.seed) : ""}`}
        </span>
      </div>
      <button
        className="game-pause icon-button"
        aria-label="일시정지"
        disabled={!started || !!ending || saving || !!result}
        onClick={() => syncPause(true)}
      >
        <Icon name="pause" />
      </button>
      {started && !result && !ending && !saving && !paused && (
        <div className={"game-controls " + play.kind} aria-label="게임 조작">
          {play.kind === "dino" ? (
            <button
              aria-label="점프"
              onClick={(e) => {
                if (e.detail === 0) enqueue("jump");
              }}
              onPointerDown={pointerDown}
              onPointerUp={releasePointer}
              onPointerCancel={releasePointer}
              onLostPointerCapture={releasePointer}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  jumpHeld.current.add("key:" + e.key);
                  if (!e.repeat) enqueue("jump");
                }
              }}
              onKeyUp={(e) => jumpHeld.current.delete("key:" + e.key)}
            >
              점프 · 꾹 누르면 연속
            </button>
          ) : (
            <>
              <button
                aria-label="왼쪽으로 이동"
                onPointerDown={(e) => pressDirection(e, "left")}
                onPointerUp={releasePointer}
                onPointerCancel={releasePointer}
                onLostPointerCapture={releasePointer}
                onClick={(e) => {
                  if (e.detail === 0) enqueue("left");
                }}
              >
                ←
              </button>
              {play.kind === "crossing" && (
                <button
                  aria-label="앞으로 이동"
                  onPointerDown={(e) => pressDirection(e, "forward")}
                  onPointerUp={releasePointer}
                  onPointerCancel={releasePointer}
                  onLostPointerCapture={releasePointer}
                  onClick={(e) => {
                    if (e.detail === 0) enqueue("forward");
                  }}
                >
                  ↑
                </button>
              )}
              <button
                aria-label="오른쪽으로 이동"
                onPointerDown={(e) => pressDirection(e, "right")}
                onPointerUp={releasePointer}
                onPointerCancel={releasePointer}
                onLostPointerCapture={releasePointer}
                onClick={(e) => {
                  if (e.detail === 0) enqueue("right");
                }}
              >
                →
              </button>
              {play.kind === "crossing" && (
                <button
                  aria-label="뒤로 이동"
                  onPointerDown={(e) => pressDirection(e, "back")}
                  onPointerUp={releasePointer}
                  onPointerCancel={releasePointer}
                  onLostPointerCapture={releasePointer}
                  onClick={(e) => {
                    if (e.detail === 0) enqueue("back");
                  }}
                >
                  ↓
                </button>
              )}
            </>
          )}
        </div>
      )}
      {ending && (
        <div
          className={"game-feedback " + (hud.score === 100 ? "clear" : "hit")}
          role="status"
        >
          {ending}
        </div>
      )}
      {play && !started && (
        <Modal title="준비됐나요?" onClose={() => a.navigate("/mission")}>
          <p>
            {play.kind === "crossing"
              ? "탭해서 앞으로, 좌우로 밀어서 이동해요."
              : play.kind === "dino"
                ? "탭해서 점프해요. 두 번 탭하거나 꾹 눌러 연속으로 뛰어요."
                : "좌우로 밀어서 장애물을 피해요."}
          </p>
          <p className="caption">
            100점에 도달하면 완주해요. 코인은 직접 닿아야 획득해요.
          </p>
          <div className="dialog-actions">
            <Button onClick={() => setStarted(true)}>게임 시작하기</Button>
          </div>
        </Modal>
      )}
      {paused && !result && !saving && !saveError && (
        <Modal title="게임을 나갈까요?" onClose={() => syncPause(false)}>
          <p>
            게임이 일시정지됐어요.
            <br />
            취소를 누르면 이어서 플레이할 수 있어요.
          </p>
          <p className="caption">나가면 게임 횟수 1회가 차감돼요.</p>
          <div className="dialog-actions">
            <Button
              loading={saving}
              onClick={() => {
                void finish(true);
              }}
            >
              나가기
            </Button>
            <Button weak disabled={saving} onClick={() => syncPause(false)}>
              취소
            </Button>
          </div>
        </Modal>
      )}
      {(saving || saveError) && !result && (
        <Modal
          title={saving ? "기록을 확인하고 있어요" : "기록을 다시 확인해주세요"}
          onClose={() => {
            if (saveError) a.navigate("/mission", { replace: true });
          }}
        >
          <p>
            {saving
              ? "잠시만 기다려주세요."
              : "같은 플레이 결과를 다시 요청해요. 보상은 중복 지급하지 않아요. 취소하면 미션으로 돌아가요."}
          </p>
          {saveError && (
            <div className="dialog-actions">
              <Button
                onClick={() =>
                  void finish(simulation.current?.status === "running")
                }
              >
                다시 확인
              </Button>
              <Button weak onClick={() => a.navigate("/mission")}>
                취소
              </Button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
