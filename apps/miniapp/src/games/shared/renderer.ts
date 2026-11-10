import {
  V3,
  GAME_VERSION,
  gameCoins,
  crossingTraffic,
  crossingEntities,
  crossingRow,
  crossingVelocity,
  jumpHeight,
  type GameState,
} from "@aimi/game-core";

/** Original AIMI Canvas artwork. Perspective/world-lifecycle ideas are documented in GAME_REFERENCES.md. */
export type SceneView = { cameraRow: number; pulse: number; debug: boolean };
const ink = "#36593c",
  grass = "#b9d2a0",
  cream = "#f8f6dd";
function oval(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: string,
) {
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
}
function box(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string,
) {
  c.fillStyle = color;
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fill();
}
function tree(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  tint = "#7caa75",
) {
  box(
    c,
    x - size * 0.07,
    y - size * 0.5,
    size * 0.14,
    size * 0.5,
    2,
    "#a48663",
  );
  oval(c, x, y - size * 0.7, size * 0.43, size * 0.45, tint);
  oval(c, x - size * 0.22, y - size * 0.56, size * 0.26, size * 0.27, tint);
  oval(c, x + size * 0.1, y - size * 0.84, size * 0.2, size * 0.2, "#afc99c");
}
function diamond(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
  c.fillStyle = "#f8d579";
  c.strokeStyle = "#e6ba61";
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(x, y - size);
  c.lineTo(x + size * 0.7, y);
  c.lineTo(x, y + size);
  c.lineTo(x - size * 0.7, y);
  c.closePath();
  c.fill();
  c.stroke();
}
export function drawGameScene(
  c: CanvasRenderingContext2D,
  s: GameState,
  w: number,
  h: number,
  im: HTMLImageElement | undefined,
  view: SceneView,
) {
  c.save();
  c.clearRect(0, 0, w, h);
  const avatar = (
    x: number,
    ground: number,
    size: number,
    lift = 0,
    hop = false,
  ) => {
    oval(
      c,
      x,
      ground + 1,
      size * 0.28 * (1 - lift / 160),
      size * 0.065,
      "#60784b35",
    );
    c.save();
    c.translate(x, ground - lift);
    const running = s.status === "running" && (!hop || !!s.motion);
    const bounce = running && lift === 0 ? Math.sin(s.tick * 0.95) * 1.5 : 0;
    const lean = s.motion
      ? (s.motion.toX - s.motion.fromX) * 0.07
      : running && lift === 0
        ? Math.sin(s.tick * 0.6) * 0.025
        : 0;
    c.rotate(lean);
    if (s.status === "failed") c.rotate(-0.18);
    if (im?.complete && im.naturalWidth) {
      // SVG source rectangles crop inconsistently in WebKit; draw the full AIMI asset.
      c.drawImage(im, -size / 2, -size + bounce, size, size);
    }
    c.restore();
  };
  if (s.kind === "crossing") {
    const tile = w / V3.columns,
      base = h * 0.73;
    view.cameraRow += (s.positionRow! - view.cameraRow) * 0.2;
    c.fillStyle = grass;
    c.fillRect(0, 0, w, h);
    const first = Math.max(0, Math.floor(view.cameraRow) - 5),
      last = Math.ceil(view.cameraRow + h / tile);
    for (let row = last; row >= first; row--) {
      const y = base - (row - view.cameraRow) * tile,
        type = crossingRow(s.seed, row);
      c.fillStyle =
        type === "road"
          ? "#879990"
          : type === "water"
            ? "#84b9c0"
            : row % 2
              ? "#bdd5a7"
              : "#b4cf9c";
      c.fillRect(0, y - tile / 2, w, tile + 0.5);
      if (type === "road") {
        // Logical rows are lanes: paint dividers at their boundaries, never through a vehicle centre.
        if (crossingRow(s.seed, row + 1) === "road") {
          c.fillStyle = "#edeee0";
          for (let x = 0; x < 9; x++)
            c.fillRect((x + 0.08) * tile, y - tile / 2, tile * 0.43, 2);
        } else {
          c.fillStyle = "#647f6c";
          c.fillRect(0, y - tile / 2, w, 2);
        }
        if (crossingRow(s.seed, row - 1) !== "road") {
          c.fillStyle = "#647f6c";
          c.fillRect(0, y + tile / 2 - 2, w, 2);
        }
      } else if (type === "water") {
        for (let x = 0; x < 11; x++) {
          const offset = (s.tick * 0.3 + row * 9) % tile;
          c.strokeStyle = "#c0dfe0";
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(x * tile - offset, y + tile * 0.24);
          c.lineTo(x * tile - offset + tile * 0.27, y + tile * 0.24);
          c.stroke();
        }
      } else {
        for (let x = 0; x < 9; x++)
          if ((row * 7 + x * 3) % 11 === 0) {
            c.fillStyle = "#98b97b";
            c.fillRect((x + 0.25) * tile, y + tile * 0.14, 3, 5);
            c.fillRect((x + 0.4) * tile, y + tile * 0.2, 2, 4);
          }
        if (row % 5 === 0) {
          tree(c, tile * 0.35, y + tile * 0.25, tile * 0.75);
          tree(c, w - tile * 0.25, y + tile * 0.23, tile * 0.6);
        }
      }
      c.strokeStyle = type === "road" ? "#eef4df15" : "#6f945b1c";
      c.lineWidth = 1;
      for (let col = 1; col < 9; col++) {
        c.beginPath();
        c.moveTo(col * tile, y - tile / 2 + 2);
        c.lineTo(col * tile, y + tile / 2 - 2);
        c.stroke();
      }
      for (const e of crossingEntities(s.seed, row, s.tick, s.version)) {
        const x = (e.x + 0.5) * tile,
          ew = e.width * tile;
        if (type === "water") {
          box(c, x - ew / 2, y - tile * 0.28, ew, tile * 0.56, 7, "#a78c62");
          c.strokeStyle = "#806e50";
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(x - ew * 0.4, y - tile * 0.08);
          c.lineTo(x + ew * 0.39, y - tile * 0.08);
          c.moveTo(x - ew * 0.34, y + tile * 0.13);
          c.lineTo(x + ew * 0.33, y + tile * 0.13);
          c.stroke();
          oval(c, x - ew * 0.43, y, 4, tile * 0.2, "#bea579");
        } else {
          const carColor =
            s.version===GAME_VERSION && crossingTraffic(s.seed,row)==="fast" ? "#d99a79" :
            row % 3 === 0 ? "#e8bc91" : row % 3 === 1 ? "#afc5d1" : "#e2d89f";
          oval(c, x, y + tile * 0.24, ew * 0.47, tile * 0.1, "#3c5c4a36");
          box(
            c,
            x - ew * 0.38,
            y - tile * 0.37,
            ew * 0.18,
            tile * 0.74,
            3,
            "#40564c",
          );
          box(
            c,
            x + ew * 0.2,
            y - tile * 0.37,
            ew * 0.18,
            tile * 0.74,
            3,
            "#40564c",
          );
          box(c, x - ew / 2, y - tile * 0.3, ew, tile * 0.6, 5, carColor);
          box(
            c,
            x - ew * 0.18,
            y - tile * 0.24,
            ew * 0.36,
            tile * 0.48,
            3,
            "#567878",
          );
          c.fillStyle = "#eff7e7";
          c.fillRect(
            x + (crossingVelocity(s.seed, row, s.version) > 0 ? ew * 0.37 : -ew * 0.45),
            y - tile * 0.22,
            ew * 0.08,
            tile * 0.12,
          );
        }
        if (view.debug) {
          c.strokeStyle = "red";
          c.strokeRect(x - ew / 2, y - tile * 0.33, ew, tile * 0.66);
        }
      }
      for(const coin of gameCoins(s).filter(coin=>coin.row===row))
        diamond(c,(coin.x+.5)*tile,y,Math.max(5,tile*.14));
    }
    const x = (s.positionX! + 0.5) * tile,
      ground = base - (s.positionRow! - view.cameraRow) * tile;
    const hop = s.motion
      ? Math.sin(
          Math.min(1, (s.tick - s.motion.start) / s.motion.duration) * Math.PI,
        ) *
        tile *
        0.18
      : 0;
    // Place the body centre on the same row centre as cars and collision coordinates.
    const centreOffset = s.version === "aimi-game-v3" ? 0.27 : 0.5;
    avatar(x, ground + tile * centreOffset, tile * 1.05, hop, true);
    if (view.debug) {
      c.strokeStyle = "red";
      c.strokeRect(
        x - tile * 0.23,
        ground - tile * 0.23,
        tile * 0.46,
        tile * 0.46,
      );
    }
  } else if (s.kind === "dino") {
    const scale = w / 360,
      ground = h * 0.63,
      dist = s.distance!;
    const sky = c.createLinearGradient(0, 0, 0, ground);
    sky.addColorStop(0, "#e8eed5");
    sky.addColorStop(1, "#d5e4bb");
    c.fillStyle = sky;
    c.fillRect(0, 0, w, h);
    oval(c, w * 0.8, h * 0.23, 30 * scale, 30 * scale, "#f5dc95");
    for (let i = 0; i < 5; i++) {
      const x = ((((i * 125 - dist * 0.08) % 600) + 600) % 600) * scale;
      oval(c, x, h * 0.2 + (i % 3) * 26, 35 * scale, 9 * scale, "#f8fae6");
      oval(
        c,
        x - 15 * scale,
        h * 0.2 - 5 + (i % 3) * 26,
        17 * scale,
        12 * scale,
        "#f8fae6",
      );
    }
    for (let layer = 0; layer < 2; layer++) {
      c.fillStyle = layer ? "#b2c99a" : "#c3d6ac";
      c.beginPath();
      c.moveTo(0, ground);
      for (let x = -40; x <= w + 40; x += 10)
        c.lineTo(
          x,
          ground -
            (layer ? 30 : 55) -
            Math.sin((x / scale + dist * (layer ? 0.18 : 0.08)) / 95) * 25,
        );
      c.lineTo(w, h);
      c.lineTo(0, h);
      c.fill();
    }
    for (let i = 0; i < 6; i++) {
      const x = (((((i * 95 - dist * 0.27) % 570) + 570) % 570) - 40) * scale;
      tree(c, x, ground - 12, 46 * scale, "#8fae7d");
    }
    c.fillStyle = "#c9bb93";
    c.fillRect(0, ground, w, h - ground);
    c.fillStyle = "#ede0b7";
    c.fillRect(0, ground, w, 6 * scale);
    for (let i = 0; i < 15; i++) {
      const x = (((((i * 41 - dist) % 615) + 615) % 615) - 20) * scale;
      c.fillStyle = i % 2 ? "#b3a17b" : "#e4d5ae";
      c.fillRect(x, ground + 17 + (i % 4) * 17, 10 * scale, 2 * scale);
    }
    for (const o of s.obstacles!) {
      const x = (o.at - dist) * scale,
        ow = o.width * scale,
        oh = o.height * scale;
      oval(c, x, ground + 2, ow * 0.7, 4 * scale, "#6d78503a");
      if (o.kind === "rock") {
        oval(c, x, ground - oh * 0.4, ow * 0.55, oh * 0.6, "#9da58b");
        oval(
          c,
          x - ow * 0.15,
          ground - oh * 0.62,
          ow * 0.3,
          oh * 0.3,
          "#bac2a5",
        );
      } else {
        box(c, x - ow * 0.23, ground - oh, ow * 0.46, oh, 5 * scale, "#6e985e");
        box(
          c,
          x - ow * 0.55,
          ground - oh * 0.65,
          ow * 0.4,
          oh * 0.18,
          3 * scale,
          "#6e985e",
        );
        box(
          c,
          x - ow * 0.55,
          ground - oh * 0.82,
          ow * 0.16,
          oh * 0.3,
          3 * scale,
          "#6e985e",
        );
        box(
          c,
          x + ow * 0.1,
          ground - oh * 0.43,
          ow * 0.45,
          oh * 0.16,
          3 * scale,
          "#83a76e",
        );
        box(
          c,
          x + ow * 0.4,
          ground - oh * 0.6,
          ow * 0.15,
          oh * 0.3,
          3 * scale,
          "#83a76e",
        );
      }
      if (view.debug) {
        c.strokeStyle = "red";
        c.strokeRect(x - ow / 2, ground - oh, ow, oh);
      }
    }
    for(const coin of gameCoins(s)) {
      const x=(coin.at-dist)*scale;
      if(x>=-10 && x<=w+10)diamond(c,x,ground-coin.height*scale,7*scale);
    }
    const lift = jumpHeight(s) * scale;
    avatar(V3.playerX * scale, ground, 64 * scale, lift);
    if (view.debug) {
      c.strokeStyle = "red";
      c.strokeRect(
        (V3.playerX - 11) * scale,
        ground - lift - 38 * scale,
        22 * scale,
        38 * scale,
      );
    }
  } else {
    const dist = s.distance!,
      horizon = h * 0.23,
      ground = h * 0.79,
      half = w * 0.47;
    const project = (z: number, lane: number) => {
      const p = 14 / (14 + Math.max(-8.5, z));
      return {
        x:
          w / 2 +
          (((lane - 1) * half * 2) / 3) * p -
          (s.positionX! - 1) * w * 0.025 * (1 - p),
        y: horizon + (ground - horizon) * p,
        scale: p,
      };
    };
    const sky = c.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#dce8c7");
    sky.addColorStop(0.55, "#b8d09d");
    sky.addColorStop(1, "#8baa75");
    c.fillStyle = sky;
    c.fillRect(0, 0, w, h);
    oval(c, w * 0.76, h * 0.16, 23, 23, "#f1d999");
    for (let i = 0; i < 8; i++)
      tree(c, (i * w) / 7, horizon + 20, 65 + (i % 3) * 20, "#92b284");
    for (
      let i = Math.floor((dist + 140) / 4);
      i >= Math.floor((dist - 8) / 4);
      i--
    ) {
      const a = project(i * 4 - dist, 1),
        b = project((i + 1) * 4 - dist, 1);
      if (a.y < b.y || b.y > h + 30) continue;
      c.fillStyle = i % 2 ? "#c2ad82" : "#cbb88e";
      c.beginPath();
      c.moveTo(a.x - half * a.scale, a.y);
      c.lineTo(a.x + half * a.scale, a.y);
      c.lineTo(b.x + half * b.scale, b.y);
      c.lineTo(b.x - half * b.scale, b.y);
      c.closePath();
      c.fill();
      for (const edge of [-1, 1]) {
        c.strokeStyle = i % 2 ? "#a59268" : "#e8dab3";
        c.lineWidth = Math.max(1, 5 * a.scale);
        c.beginPath();
        c.moveTo(a.x + edge * half * a.scale, a.y);
        c.lineTo(b.x + edge * half * b.scale, b.y);
        c.stroke();
      }
      if (i % 2 === 0)
        for (const lane of [0.5, 1.5]) {
          const p1 = project(i * 4 - dist, lane),
            p2 = project((i + 1) * 4 - dist, lane);
          c.strokeStyle = "#eee1b7";
          c.lineWidth = Math.max(1, 2 * a.scale);
          c.beginPath();
          c.moveTo(p1.x, p1.y);
          c.lineTo(p2.x, p2.y);
          c.stroke();
        }
    }
    for (
      let i = Math.floor((dist + 130) / 11);
      i >= Math.floor((dist - 5) / 11);
      i--
    ) {
      const z = i * 11 - dist;
      if (z < -4) continue;
      for (const side of [-1, 1]) {
        const p = project(z, 1 + side * 2);
        tree(c, p.x, p.y, w * 0.3 * p.scale, i % 2 ? "#709466" : "#82a16d");
      }
    }
    for (const o of [...s.obstacles!].sort((a, b) => b.at - a.at)) {
      const z = o.at - dist;
      if (z > 115 || z < -7) continue;
      const p = project(z, o.lane),
        ow = ((o.width * half * 2) / 3) * p.scale,
        oh = w * 0.14 * p.scale;
      oval(c, p.x, p.y + 2, ow * 0.6, 4 * p.scale, "#4b583c40");
      box(
        c,
        p.x - ow / 2,
        p.y - oh,
        ow,
        oh,
        3 * p.scale,
        o.kind === "barrier" ? "#a38162" : "#b19468",
      );
      box(
        c,
        p.x - ow * 0.4,
        p.y - oh * 0.87,
        ow * 0.8,
        oh * 0.15,
        1,
        "#d3b98b",
      );
      c.strokeStyle = "#806c50";
      c.lineWidth = Math.max(1, 2 * p.scale);
      c.beginPath();
      c.moveTo(p.x - ow * 0.35, p.y - oh * 0.65);
      c.lineTo(p.x + ow * 0.35, p.y - oh * 0.15);
      c.moveTo(p.x + ow * 0.35, p.y - oh * 0.65);
      c.lineTo(p.x - ow * 0.35, p.y - oh * 0.15);
      c.stroke();
      if (view.debug) {
        c.strokeStyle = "red";
        c.strokeRect(p.x - ow / 2, p.y - oh, ow, oh);
      }
    }
    for(const coin of [...gameCoins(s)].sort((a,b)=>b.at-a.at)) {
      const z=coin.at-dist;
      if(z>115||z< -4)continue;
      const p=project(z,coin.x);
      diamond(c,p.x,p.y-Math.min(68,w*.18)*.48*p.scale,Math.max(2,7*p.scale));
    }
    const player = project(0, s.positionX!);
    avatar(player.x, player.y, Math.min(68, w * 0.18));
    // A moving ground shadow and foot streaks make the running cadence visible.
    if (s.status === "running")
      for (let i = 0; i < 3; i++) {
        c.strokeStyle = "#f6e8bd88";
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(
          player.x - 13 + i * 13,
          ground + 12 + ((s.tick * 2 + i * 7) % 22),
        );
        c.lineTo(
          player.x - 14 + i * 13,
          ground + 20 + ((s.tick * 2 + i * 7) % 22),
        );
        c.stroke();
      }
  }
  if (
    s.lastPassTick &&
    s.tick - s.lastPassTick < 15 &&
    s.kind === "dino" &&
    s.status === "running"
  ) {
    c.font = '700 14px "AIMI UX"';
    c.textAlign = "center";
    c.fillStyle = ink;
    c.fillText("좋아요!", w * 0.27, h * 0.49 - (s.tick - s.lastPassTick) * 0.7);
  }
  if (s.lastCoinTick && s.tick-s.lastCoinTick<18 && s.status === "running") {
    c.font = '700 13px "AIMI UX"';
    c.textAlign = "right";
    c.fillStyle = ink;
    c.fillText("+1 EP", w - 18, h * 0.34);
  }
  c.restore();
}
