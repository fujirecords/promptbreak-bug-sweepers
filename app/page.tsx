"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import "./game.css";

type Language = "ja" | "en";
type Screen = "title" | "playing" | "levelup" | "victory" | "gameover";
type PetId = "relay" | "tidal" | "kiln" | "vector" | "anvil" | "lumen" | "parcel" | "chroma" | "hollow";
type UpgradeId = "power" | "range" | "orbit" | "flame" | "pulse" | "chain" | "boomerang" | "shutdown" | "helper" | "haste" | "speed" | "magnet" | "vitality" | "repair";

type Enemy = {
  mesh: THREE.Group;
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  xp: number;
  boss: boolean;
  lastHit: number;
  lastOrbitHit: number;
  kind: number;
  mega: boolean;
  skillCooldown: number;
};

type Orb = { mesh: THREE.Mesh; value: number; born: number };
type PickupKind = "bomb" | "repair" | "overclock";
type Pickup = { mesh: THREE.Group; kind: PickupKind; born: number };
type Hazard = { mesh: THREE.Mesh; velocity: THREE.Vector3; born: number; damage: number };
type CombatFx = { object: THREE.Object3D; life: number; maxLife: number; velocity?: THREE.Vector3; grow?: number };
type Obstacle = { x: number; z: number; halfX: number; halfZ: number; mesh: THREE.Mesh; hp: number; active: boolean };
type LeaderboardEntry = { stage: number; hard: boolean; handle: string; score: number; level: number; kills: number; time: number; at: number };
type Cinematic = "team" | "boss" | null;
type PetFacing = "front" | "back" | "left" | "right";
type PetTextures = {
  front: THREE.Texture; frontStep: THREE.Texture;
  side: THREE.Texture; sideStep: THREE.Texture;
  back: THREE.Texture; backStep: THREE.Texture;
};

const PETS: { id: PetId; name: string; color: number; css: string; level: number; atlas: [number, number] }[] = [
  { id: "relay", name: "Relay", color: 0x26d9ee, css: "#26d9ee", level: 1, atlas: [0, 0] },
  { id: "tidal", name: "Tidal", color: 0x32c9d8, css: "#32c9d8", level: 3, atlas: [1, 0] },
  { id: "kiln", name: "Kiln", color: 0xff642f, css: "#ff642f", level: 5, atlas: [2, 0] },
  { id: "vector", name: "Vector", color: 0xd9d4ff, css: "#d9d4ff", level: 7, atlas: [0, 1] },
  { id: "anvil", name: "Anvil", color: 0x68758f, css: "#68758f", level: 9, atlas: [1, 1] },
  { id: "lumen", name: "Lumen", color: 0xaee84e, css: "#aee84e", level: 12, atlas: [2, 1] },
  { id: "parcel", name: "Parcel", color: 0xe5a92c, css: "#e5a92c", level: 15, atlas: [0, 2] },
  { id: "chroma", name: "Chroma", color: 0x397cff, css: "#397cff", level: 18, atlas: [1, 2] },
  { id: "hollow", name: "Hollow", color: 0x8b65c8, css: "#8b65c8", level: 20, atlas: [2, 2] },
];

const PET_SKILLS: Record<PetId, { name: string; ja: string; en: string }> = {
  relay: { name: "CHAIN RELAY", ja: "複数の敵へ電流を中継する", en: "Relays current through nearby bugs" },
  tidal: { name: "TIDAL PATCH", ja: "修復水流で敵を押し返し耐久を回復", en: "Repels bugs and restores integrity with a repair tide" },
  kiln: { name: "FORGE BREATH", ja: "前方へ鍛造炎を吐く", en: "Breathes a cone of forge fire" },
  vector: { name: "VECTOR LANCE", ja: "遠距離から弱点を貫く精密射撃", en: "Pierces weak points with a precision vector" },
  anvil: { name: "MAGNETIC QUAKE", ja: "磁力で地面を叩き広範囲へ衝撃波", en: "Slams the ground with a magnetic shockwave" },
  lumen: { name: "ROOTLIGHT SNARE", ja: "発光蔓で敵を拘束し回収範囲を拡張", en: "Rootlight vines bind bugs and extend pickup range" },
  parcel: { name: "TOOL DROP", ja: "工具箱を上空から連続投下", en: "Drops a barrage of packed tools" },
  chroma: { name: "PRISM FREEZE", ja: "周囲の処理をプリズム凍結させる", en: "Freezes nearby processes in a prism pulse" },
  hollow: { name: "EVENT HORIZON", ja: "敵を吸い込む日食領域を展開", en: "Deploys an eclipse that pulls bugs inward" },
};

const UPGRADE_IDS: UpgradeId[] = ["power", "range", "orbit", "flame", "pulse", "chain", "boomerang", "shutdown", "helper", "haste", "speed", "magnet", "vitality", "repair"];
const UPGRADE_ICONS: Record<UpgradeId, string> = {
  power: "⚡", range: "◎", orbit: "⌕", flame: "♨", pulse: "◌", chain: "ϟ", boomerang: "↬", shutdown: "⏻", helper: "✦", haste: "≫", speed: "➤", magnet: "◉", vitality: "♥", repair: "✚",
};
const BOSS_TIMES = [28, 72] as const;
const OUTBREAK_TIME = 50;
const STAGE_BOSS_TIME = BOSS_TIMES[1];
const SAVE_KEY = "promptbreak-bug-sweepers-v1";
const LEADERBOARD_KEY = "promptbreak-local-ranking-v1";
const HANDLE_KEY = "promptbreak-handle-v1";
const BUG_COLORS = [0x9c78ff, 0xffc857, 0xff6b4a, 0x46e0bd, 0x5e8cff, 0xf05cff, 0xe6ff5c, 0xff8966, 0x63d7ff, 0xff315e];
const STAGES = [
  { name: { ja: "タスク工房", en: "TASK WORKSHOP" }, mission: { ja: "タスク管理アプリを構築せよ", en: "Build a task management app" }, theme: "boot", color: 0x37c7ff },
  { name: { ja: "クッキングラボ", en: "COOKING LAB" }, mission: { ja: "クッキングアプリを構築せよ", en: "Build a cooking app" }, theme: "kitchen", color: 0xff8a24 },
  { name: { ja: "コーポレートオフィス", en: "CORPORATE OFFICE" }, mission: { ja: "企業ポータルサイトを構築せよ。机から物資を回収可能", en: "Build a corporate portal. Break desks for supplies" }, theme: "office", color: 0x66a7ff },
  { name: { ja: "マーケットモール", en: "MARKET MALL" }, mission: { ja: "ECストアを構築せよ", en: "Build an e-commerce storefront" }, theme: "market", color: 0xffc857 },
  { name: { ja: "メッセージハブ", en: "MESSAGE HUB" }, mission: { ja: "リアルタイムチャットを構築せよ", en: "Build a realtime chat app" }, theme: "chat", color: 0x46e0bd },
  { name: { ja: "予約ターミナル", en: "BOOKING TERMINAL" }, mission: { ja: "予約管理サービスを構築せよ", en: "Build a booking service" }, theme: "booking", color: 0xe6ff5c },
  { name: { ja: "ペイメント金庫", en: "PAYMENT VAULT" }, mission: { ja: "安全な決済フローを構築せよ", en: "Build a secure payment flow" }, theme: "finance", color: 0xffd45e },
  { name: { ja: "サウンドスタジオ", en: "SOUND STUDIO" }, mission: { ja: "音楽配信アプリを構築せよ", en: "Build a music streaming app" }, theme: "music", color: 0xf05cff },
  { name: { ja: "ラーニングキャンパス", en: "LEARNING CAMPUS" }, mission: { ja: "学習プラットフォームを構築せよ", en: "Build a learning platform" }, theme: "school", color: 0x9adf53 },
  { name: { ja: "ヘルスセンター", en: "HEALTH CENTER" }, mission: { ja: "健康管理アプリを構築せよ", en: "Build a health tracker" }, theme: "health", color: 0xff6687 },
  { name: { ja: "トラベルポート", en: "TRAVEL PORT" }, mission: { ja: "旅行計画サービスを構築せよ", en: "Build a travel planner" }, theme: "travel", color: 0x63d7ff },
  { name: { ja: "物流ヤード", en: "LOGISTICS YARD" }, mission: { ja: "配送追跡システムを構築せよ", en: "Build a delivery tracker" }, theme: "logistics", color: 0xff8966 },
  { name: { ja: "ビデオスタジオ", en: "VIDEO STUDIO" }, mission: { ja: "動画編集サービスを構築せよ", en: "Build a video editor" }, theme: "video", color: 0x9c78ff },
  { name: { ja: "ソーシャルスクエア", en: "SOCIAL SQUARE" }, mission: { ja: "コミュニティアプリを構築せよ", en: "Build a community app" }, theme: "social", color: 0xff6b9e },
  { name: { ja: "スマートホーム", en: "SMART HOME" }, mission: { ja: "IoTコントロールを構築せよ", en: "Build an IoT control center" }, theme: "home", color: 0x76f7ad },
  { name: { ja: "ゲームロビー", en: "GAME LOBBY" }, mission: { ja: "オンラインゲーム基盤を構築せよ", en: "Build an online game lobby" }, theme: "game", color: 0xff4b70 },
  { name: { ja: "データ観測所", en: "DATA OBSERVATORY" }, mission: { ja: "分析ダッシュボードを構築せよ", en: "Build an analytics dashboard" }, theme: "data", color: 0x25c8ff },
  { name: { ja: "AIリサーチ棟", en: "AI RESEARCH" }, mission: { ja: "AIアシスタントを構築せよ", en: "Build an AI assistant" }, theme: "ai", color: 0xb78cff },
  { name: { ja: "クラウド司令室", en: "CLOUD COMMAND" }, mission: { ja: "クラウド運用基盤を構築せよ", en: "Build a cloud operations center" }, theme: "cloud", color: 0x6f9dff },
  { name: { ja: "プロダクション・ゼロ", en: "PRODUCTION ZERO" }, mission: { ja: "最終プロダクトを世界へリリースせよ", en: "Ship the final product worldwide" }, theme: "production", color: 0xff315e },
] as const;

const copy = {
  ja: {
    kicker: "PROMPTBREAK // AI WAIT MODE",
    titleA: "BUG",
    titleB: "SWEEPERS",
    subtitle: "生成AIの待ち時間を、短いデバッグ任務に変えよう。",
    start: "START BREAK",
    loading: "ASSET LOADING...",
    choose: "パッチリングを選ぶ",
    locked: (level: number) => `LV.${level} で解放`,
    best: "最高到達レベル",
    controls: "WASD / 矢印キーで移動・攻撃はオート",
    level: "LEVEL",
    hp: "INTEGRITY",
    special: "PATCH PARADE",
    bossIn: "親玉の侵入まで",
    bossLive: "CRITICAL BOSS ONLINE",
    stage: "STAGE",
    mode: "MODE",
    normal: "NORMAL",
    hard: "HARD",
    nextStage: "次のステージ",
    hardStart: "HARD MODEへ",
    stages: "ステージ選択",
    bugs: "FIXED",
    coins: "COINS",
    workshop: "起動能力",
    buyPower: "初期攻撃力",
    buyHp: "初期耐久力",
    share: "Xで攻略結果を投稿",
    bossCount: (count: number) => `BOSS ${count}/2`,
    outbreak: "BUG大量発生",
    levelUp: "PATCH SELECT",
    levelSub: "アップグレードを1つ適用",
    victory: "RELEASE COMPLETE",
    victorySub: "ボスバグを撃退。プロダクトは無事リリースされました。",
    defeated: "BUILD FAILED",
    defeatedSub: "バグに飲み込まれました。構成を変えて再挑戦しよう。",
    retry: "もう一度",
    back: "タイトルへ",
    space: "SPACE / タップで発動",
    newPet: "NEW PATCHLING UNLOCKED!",
    bossAlertTitle: "CRITICAL BUG侵入",
    bossAlertSub: "巨大な反応を検知。ボスが戦域へ突入しました。",
    teamAlertTitle: "ALL PATCHLINGS ONLINE",
    teamAlertSub: "応援部隊、全員到着。PATCH PARADEを実行します。",
    paused: "PAUSED",
    resume: "続ける",
    quit: "タイトルへ戻る",
    reroll: "候補を再抽選",
    combo: "COMBO",
    upgrades: {
      power: ["POWER PATCH", "攻撃ダメージ +35%"],
      range: ["WIDE SCOPE", "攻撃範囲 +22%"],
      orbit: ["PLIERS ORBIT", "回転するデバッグペンチ +1"],
      flame: ["FIREWALL BREATH", "前方へ炎を吐く攻撃を解放・強化"],
      pulse: ["PULSE WAVE", "周期的な全周パルスを解放・強化"],
      chain: ["CHAIN DEBUG", "敵を連鎖するデバッグ電撃を解放・強化"],
      boomerang: ["VIRUS REMOVER", "除去ブーメランが往復して敵を切り抜ける"],
      shutdown: ["FORCE QUIT WAVE", "前方へ強制終了ウェーブを放つ"],
      helper: ["SUPPORT PING", "大量発生・瀕死時にお助けペットを呼ぶ"],
      haste: ["FAST LOOP", "攻撃速度 +18%"],
      speed: ["QUICK STEP", "移動速度 +12%"],
      magnet: ["AUTO IMPORT", "XP吸引範囲 +40%"],
      vitality: ["STABLE BUILD", "最大HP +25・全回復"],
      repair: ["HOT FIX", "HPを40回復"],
    },
  },
  en: {
    kicker: "PROMPTBREAK // AI WAIT MODE",
    titleA: "BUG",
    titleB: "SWEEPERS",
    subtitle: "Turn AI waiting time into a quick debug break.",
    start: "START BREAK",
    loading: "ASSET LOADING...",
    choose: "Choose your Patchling",
    locked: (level: number) => `Unlock at LV.${level}`,
    best: "Best level",
    controls: "Move with WASD / Arrow keys · Auto attack",
    level: "LEVEL",
    hp: "INTEGRITY",
    special: "PATCH PARADE",
    bossIn: "Boss breach in",
    bossLive: "CRITICAL BOSS ONLINE",
    stage: "STAGE",
    mode: "MODE",
    normal: "NORMAL",
    hard: "HARD",
    nextStage: "Next stage",
    hardStart: "Enter HARD MODE",
    stages: "Select stage",
    bugs: "FIXED",
    coins: "COINS",
    workshop: "BOOT UPGRADES",
    buyPower: "Starting power",
    buyHp: "Starting integrity",
    share: "Share result on X",
    bossCount: (count: number) => `BOSS ${count}/2`,
    outbreak: "BUG OUTBREAK",
    levelUp: "PATCH SELECT",
    levelSub: "Apply one upgrade",
    victory: "RELEASE COMPLETE",
    victorySub: "Boss bug eliminated. Your product shipped successfully.",
    defeated: "BUILD FAILED",
    defeatedSub: "The bugs took over. Change your build and try again.",
    retry: "Retry",
    back: "Title",
    space: "SPACE / Tap to deploy",
    newPet: "NEW PATCHLING UNLOCKED!",
    bossAlertTitle: "CRITICAL BUG BREACH",
    bossAlertSub: "Massive signature detected. The boss has entered the sector.",
    teamAlertTitle: "ALL PATCHLINGS ONLINE",
    teamAlertSub: "Every support unit has arrived. Executing PATCH PARADE.",
    paused: "PAUSED",
    resume: "Resume",
    quit: "Return to title",
    reroll: "Reroll choices",
    combo: "COMBO",
    upgrades: {
      power: ["POWER PATCH", "Attack damage +35%"],
      range: ["WIDE SCOPE", "Attack range +22%"],
      orbit: ["PLIERS ORBIT", "Add one orbiting debug pliers"],
      flame: ["FIREWALL BREATH", "Unlock or improve a forward flame attack"],
      pulse: ["PULSE WAVE", "Unlock or improve a radial pulse"],
      chain: ["CHAIN DEBUG", "Unlock or improve chain lightning"],
      boomerang: ["VIRUS REMOVER", "A removal boomerang cuts through bugs twice"],
      shutdown: ["FORCE QUIT WAVE", "Launch a wide force-quit wave forward"],
      helper: ["SUPPORT PING", "Call a helper during outbreaks or critical integrity"],
      haste: ["FAST LOOP", "Attack speed +18%"],
      speed: ["QUICK STEP", "Move speed +12%"],
      magnet: ["AUTO IMPORT", "XP pickup range +40%"],
      vitality: ["STABLE BUILD", "Max HP +25 · Full heal"],
      repair: ["HOT FIX", "Restore 40 HP"],
    },
  },
} as const;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function positionBlocked(position: THREE.Vector3, radius: number, obstacles: Obstacle[]) {
  return obstacles.some((obstacle) =>
    obstacle.active &&
    position.x + radius > obstacle.x - obstacle.halfX &&
    position.x - radius < obstacle.x + obstacle.halfX &&
    position.z + radius > obstacle.z - obstacle.halfZ &&
    position.z - radius < obstacle.z + obstacle.halfZ,
  );
}

function resolveObstacleCollisions(position: THREE.Vector3, radius: number, obstacles: Obstacle[]) {
  let collided = false;
  for (const obstacle of obstacles) {
    if (!obstacle.active) continue;
    const minX = obstacle.x - obstacle.halfX;
    const maxX = obstacle.x + obstacle.halfX;
    const minZ = obstacle.z - obstacle.halfZ;
    const maxZ = obstacle.z + obstacle.halfZ;
    const closestX = clamp(position.x, minX, maxX);
    const closestZ = clamp(position.z, minZ, maxZ);
    const dx = position.x - closestX;
    const dz = position.z - closestZ;
    const distanceSq = dx * dx + dz * dz;
    if (distanceSq >= radius * radius) continue;
    collided = true;
    if (distanceSq > 0.00001) {
      const distance = Math.sqrt(distanceSq);
      position.x += (dx / distance) * (radius - distance);
      position.z += (dz / distance) * (radius - distance);
      continue;
    }
    const exits = [
      { amount: Math.abs(position.x - (minX - radius)), axis: "x" as const, value: minX - radius },
      { amount: Math.abs(position.x - (maxX + radius)), axis: "x" as const, value: maxX + radius },
      { amount: Math.abs(position.z - (minZ - radius)), axis: "z" as const, value: minZ - radius },
      { amount: Math.abs(position.z - (maxZ + radius)), axis: "z" as const, value: maxZ + radius },
    ].sort((a, b) => a.amount - b.amount);
    position[exits[0].axis] = exits[0].value;
  }
  return collided;
}

function loadProgress() {
  const fallback = { bestLevel: 1, highestStage: 1, hardUnlocked: false, language: "ja" as Language, coins: 0, powerRank: 0, hpRank: 0 };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as { bestLevel?: unknown; highestStage?: unknown; hardUnlocked?: unknown; language?: unknown; coins?: unknown; powerRank?: unknown; hpRank?: unknown };
    return {
      bestLevel: typeof parsed.bestLevel === "number" ? clamp(Math.floor(parsed.bestLevel), 1, 999) : 1,
      highestStage: typeof parsed.highestStage === "number" ? clamp(Math.floor(parsed.highestStage), 1, 20) : 1,
      hardUnlocked: parsed.hardUnlocked === true,
      language: parsed.language === "en" ? "en" as Language : "ja" as Language,
      coins: typeof parsed.coins === "number" ? clamp(Math.floor(parsed.coins), 0, 999999) : 0,
      powerRank: typeof parsed.powerRank === "number" ? clamp(Math.floor(parsed.powerRank), 0, 20) : 0,
      hpRank: typeof parsed.hpRank === "number" ? clamp(Math.floor(parsed.hpRank), 0, 20) : 0,
    };
  } catch {
    window.localStorage.removeItem(SAVE_KEY);
    return fallback;
  }
}

function normalizeHandle(value: string) {
  return value.normalize("NFKC").replace(/[^\p{L}\p{N}_-]/gu, "").slice(0, 12);
}

function loadLocalLeaderboard(): LeaderboardEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LEADERBOARD_KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 100).flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const entry = item as Partial<LeaderboardEntry>;
      const handle = typeof entry.handle === "string" ? normalizeHandle(entry.handle) : "";
      if (!handle || typeof entry.stage !== "number" || typeof entry.score !== "number") return [];
      return [{ stage: clamp(Math.floor(entry.stage), 1, 20), hard: entry.hard === true, handle, score: clamp(Math.floor(entry.score), 0, 99999999), level: clamp(Math.floor(entry.level ?? 1), 1, 999), kills: clamp(Math.floor(entry.kills ?? 0), 0, 99999), time: clamp(Number(entry.time ?? 0), 0, 99999), at: clamp(Number(entry.at ?? 0), 0, Number.MAX_SAFE_INTEGER) }];
    });
  } catch {
    window.localStorage.removeItem(LEADERBOARD_KEY);
    return [];
  }
}

function cropPetTexture(source: THREE.Texture, pet: (typeof PETS)[number], mirror = false) {
  const map = source.clone();
  map.colorSpace = THREE.SRGBColorSpace;
  map.repeat.set(mirror ? -1 / 3 : 1 / 3, 1 / 3);
  map.offset.set(mirror ? (pet.atlas[0] + 1) / 3 : pet.atlas[0] / 3, (2 - pet.atlas[1]) / 3);
  map.magFilter = THREE.NearestFilter;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  return map;
}

function makePet(petId: PetId, atlases: PetTextures, scale = 1) {
  const group = new THREE.Group();
  const pet = PETS.find((entry) => entry.id === petId) ?? PETS[0];
  const maps: Record<PetFacing, [THREE.Texture, THREE.Texture]> = {
    front: [cropPetTexture(atlases.front, pet), cropPetTexture(atlases.frontStep, pet)],
    back: [cropPetTexture(atlases.back, pet), cropPetTexture(atlases.backStep, pet)],
    left: [cropPetTexture(atlases.side, pet), cropPetTexture(atlases.sideStep, pet)],
    right: [cropPetTexture(atlases.side, pet, true), cropPetTexture(atlases.sideStep, pet, true)],
  };
  const material = new THREE.SpriteMaterial({ map: maps.front[0], transparent: true, alphaTest: 0.035, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.name = "pet-art";
  sprite.userData = { maps, facing: "front" as PetFacing, frame: 0, baseScale: 2.12 * scale };
  sprite.center.set(0.5, 0.08);
  sprite.scale.set(2.12 * scale, 2.12 * scale, 1);
  sprite.renderOrder = 4;
  group.add(sprite);
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(0.48 * scale, 24),
    new THREE.MeshBasicMaterial({ color: pet.color, transparent: true, opacity: 0.16, depthWrite: false }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.025;
  group.add(glow);
  return group;
}

function setPetFacing(group: THREE.Group, direction: THREE.Vector3, walking: boolean, elapsed = 0) {
  const sprite = group.getObjectByName("pet-art") as THREE.Sprite | undefined;
  if (!sprite) return;
  if (walking) {
    let facing: PetFacing;
    if (Math.abs(direction.x) > Math.abs(direction.z) * 0.7) facing = direction.x < 0 ? "left" : "right";
    else facing = direction.z < 0 ? "back" : "front";
    sprite.userData.facing = facing;
  }
  const frame = walking ? Math.floor(elapsed * 7.5) % 2 : 0;
  if (sprite.userData.frame !== frame || (sprite.material as THREE.SpriteMaterial).map !== sprite.userData.maps[sprite.userData.facing][frame]) {
    sprite.userData.frame = frame;
    (sprite.material as THREE.SpriteMaterial).map = sprite.userData.maps[sprite.userData.facing][frame];
    (sprite.material as THREE.SpriteMaterial).needsUpdate = true;
  }
  const base = sprite.userData.baseScale as number;
  const step = Math.sin(elapsed * (walking ? 15 : 2.4));
  sprite.position.y = walking ? Math.abs(step) * 0.035 : 0.008 + Math.max(0, step) * 0.006;
  sprite.scale.set(base * (walking ? 1 : 1 + step * 0.004), base * (walking ? 1 : 1 - step * 0.004), 1);
}

function cropBugTexture(atlasTexture: THREE.Texture, kind: number, mirror = false) {
  const map = atlasTexture.clone();
  const column = kind % 5;
  const row = Math.floor(kind / 5);
  map.colorSpace = THREE.SRGBColorSpace;
  map.repeat.set(mirror ? -1 / 5 : 1 / 5, 1 / 2);
  map.offset.set(mirror ? (column + 1) / 5 : column / 5, (1 - row) / 2);
  map.magFilter = THREE.NearestFilter;
  return map;
}

function makeBug(kind: number, frontAtlas: THREE.Texture, backAtlas: THREE.Texture, boss = false, mega = false) {
  const group = new THREE.Group();
  const color = boss ? 0xff315e : BUG_COLORS[kind % BUG_COLORS.length];
  const maps: Record<PetFacing, THREE.Texture> = {
    front: cropBugTexture(frontAtlas, kind),
    left: cropBugTexture(frontAtlas, kind),
    right: cropBugTexture(frontAtlas, kind, true),
    back: cropBugTexture(backAtlas, kind),
  };
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: maps.front, transparent: true, alphaTest: 0.42, depthWrite: false }));
  const size = mega ? 5.2 : boss ? 3.35 : 1.62 + (kind % 3) * 0.13;
  sprite.name = "bug-art";
  sprite.center.set(0.5, 0.08);
  sprite.scale.set(size, size, 1);
  sprite.userData = { baseSize: size, maps, facing: "front" as PetFacing };
  sprite.renderOrder = boss ? 5 : 3;
  group.add(sprite);
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry((boss ? 0.92 : 0.4) + (kind % 3) * 0.035, 18),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: boss ? 0.48 : 0.3, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);
  if (mega) {
    const segmentMaterial = new THREE.MeshStandardMaterial({ color: 0x321146, emissive: 0xff315e, emissiveIntensity: 0.7, roughness: 0.62 });
    for (let i = 0; i < 7; i++) {
      const segment = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 - i * 0.065, 1), segmentMaterial);
      segment.position.set(Math.sin(i * 0.72) * 0.72, 0.45 - i * 0.025, 1.25 + i * 0.82);
      segment.scale.z = 1.25;
      segment.name = "serpent-segment";
      group.add(segment);
    }
    group.userData.mega = true;
  }
  if (boss) {
    const aura = new THREE.Mesh(new THREE.RingGeometry(1.12, 1.22, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false }));
    aura.rotation.x = -Math.PI / 2;
    aura.position.y = 0.035;
    aura.name = "boss-aura";
    group.add(aura);
  }
  return group;
}

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

export default function Home() {
  const mountRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    petTextures: PetTextures;
    enemyAtlas: THREE.Texture;
    enemyBackAtlas: THREE.Texture;
    floorMaterial: THREE.MeshStandardMaterial;
    floorTextures: { default: THREE.Texture; kitchen: THREE.Texture; office: THREE.Texture };
    blockMaterial: THREE.MeshStandardMaterial;
    stageProps: THREE.Group;
    player: THREE.Group;
    weapons: THREE.Group;
    enemies: Enemy[];
    orbs: Orb[];
    pickups: Pickup[];
    hazards: Hazard[];
    effects: CombatFx[];
    obstacles: Obstacle[];
    timer: THREE.Timer;
    keys: Set<string>;
    running: boolean;
    elapsed: number;
    routeTime: number;
    spawnTimer: number;
    attackTimer: number;
    bossesSpawned: number;
    bossesDefeated: number;
    outbreakTriggered: boolean;
    outbreakRemaining: number;
    specialActive: boolean;
    specialCooldown: number;
    pulseTimer: number;
    chainTimer: number;
    flameTimer: number;
    boomerangTimer: number;
    shutdownTimer: number;
    helperTimer: number;
    helperAttackTimer: number;
    helperMesh: THREE.Group | null;
    helperPet: (typeof PETS)[number] | null;
    playerHitFx: number;
    specialFx: number;
    alertFx: number;
    shake: number;
    spawnGrace: number;
    combo: number;
    comboTimer: number;
    rerolls: number;
  } | null>(null);
  const statsRef = useRef({
    hp: 100,
    maxHp: 100,
    level: 1,
    xp: 0,
    nextXp: 14,
    kills: 0,
    special: 0,
    damage: 24,
    range: 3.1,
    weapons: 2,
    attackDelay: 0.48,
    moveSpeed: 5.4,
    magnet: 2.4,
    pulseLevel: 0,
    chainLevel: 0,
    flameLevel: 0,
    boomerangLevel: 0,
    shutdownLevel: 0,
    helperLevel: 0,
  });
  const joystick = useRef({ x: 0, y: 0, active: false });
  const pausedRef = useRef(false);
  const cinematicTimer = useRef<number | null>(null);
  const audioRef = useRef<{ context: AudioContext; master: GainNode; music: GainNode; oscillators: OscillatorNode[]; stepTimer: number | null; stage: number } | null>(null);
  const metaRef = useRef({ stage: 1, hard: false, bestLevel: 1, selectedPet: "relay" as PetId });
  const [lang, setLang] = useState<Language>("ja");
  const [screen, setScreen] = useState<Screen>("title");
  const [selectedPet, setSelectedPet] = useState<PetId>("relay");
  const [bestLevel, setBestLevel] = useState(1);
  const [currentStage, setCurrentStage] = useState(1);
  const [highestStage, setHighestStage] = useState(1);
  const [hardUnlocked, setHardUnlocked] = useState(false);
  const [hardMode, setHardMode] = useState(false);
  const [coins, setCoins] = useState(0);
  const [powerRank, setPowerRank] = useState(0);
  const [hpRank, setHpRank] = useState(0);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const [hud, setHud] = useState({ hp: 100, maxHp: 100, level: 1, xp: 0, nextXp: 14, kills: 0, special: 0, elapsed: 0, routeTime: 0, boss: false, bossHp: 0, bossMaxHp: 1, bossesSpawned: 0, bossesDefeated: 0, outbreakRemaining: 0, specialCooldown: 0, combo: 0, rerolls: 1 });
  const [choices, setChoices] = useState<UpgradeId[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [unlockNotice, setUnlockNotice] = useState(false);
  const [cinematic, setCinematic] = useState<Cinematic>(null);
  const [damageFlash, setDamageFlash] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [paused, setPaused] = useState(false);
  const [stageIntro, setStageIntro] = useState(false);
  const [teamSkillName, setTeamSkillName] = useState("");
  const [handleName, setHandleName] = useState("PLAYER");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const t = copy[lang];

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    metaRef.current = { stage: currentStage, hard: hardMode, bestLevel, selectedPet };
  }, [currentStage, hardMode, bestLevel, selectedPet]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = loadProgress();
      setBestLevel(saved.bestLevel);
      setHighestStage(saved.highestStage);
      setCurrentStage(saved.highestStage);
      setHardUnlocked(saved.hardUnlocked);
      setLang(saved.language);
      setCoins(saved.coins);
      setPowerRank(saved.powerRank);
      setHpRank(saved.hpRank);
      const storedHandle = normalizeHandle(window.localStorage.getItem(HANDLE_KEY) ?? "PLAYER");
      setHandleName(storedHandle || "PLAYER");
      setLeaderboard(loadLocalLeaderboard());
      setStorageLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!storageLoaded) return;
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 3, bestLevel, highestStage, hardUnlocked, language: lang, coins, powerRank, hpRank }));
    document.documentElement.lang = lang;
  }, [bestLevel, highestStage, hardUnlocked, lang, coins, powerRank, hpRank, storageLoaded]);

  useEffect(() => {
    if (storageLoaded) window.localStorage.setItem(HANDLE_KEY, normalizeHandle(handleName) || "PLAYER");
  }, [handleName, storageLoaded]);

  useEffect(() => () => {
    if (cinematicTimer.current !== null) window.clearTimeout(cinematicTimer.current);
    if (audioRef.current?.stepTimer !== null && audioRef.current?.stepTimer !== undefined) window.clearInterval(audioRef.current.stepTimer);
    audioRef.current?.context.close();
    audioRef.current = null;
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.master.gain.setTargetAtTime(soundOn ? 0.24 : 0, audio.context.currentTime, 0.04);
  }, [soundOn]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && gameRef.current?.running) {
        pausedRef.current = true;
        setPaused(true);
        const audio = audioRef.current;
        if (audio) audio.music.gain.setTargetAtTime(0.025, audio.context.currentTime, 0.08);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (!mountRef.current || gameRef.current) return;
    const mount = mountRef.current;
    try {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x03080e);
      scene.fog = new THREE.FogExp2(0x03080e, 0.025);
      const camera = new THREE.PerspectiveCamera(55, mount.clientWidth / mount.clientHeight, 0.1, 100);
      camera.position.set(0, 10, 10);
      const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      mount.appendChild(renderer.domElement);

      const loadingManager = new THREE.LoadingManager();
      let disposed = false;
      loadingManager.onLoad = () => { if (!disposed) setAssetsReady(true); };
      loadingManager.onError = (url) => { if (!disposed) setError(`Asset loading failed: ${url}`); };
      const loader = new THREE.TextureLoader(loadingManager);
      const petTextures: PetTextures = {
        front: loader.load("/assets/companions/original-companions-front.png"),
        frontStep: loader.load("/assets/companions/original-companions-front.png"),
        side: loader.load("/assets/companions/original-companions-left.png"),
        sideStep: loader.load("/assets/companions/original-companions-left.png"),
        back: loader.load("/assets/companions/original-companions-back.png"),
        backStep: loader.load("/assets/companions/original-companions-back.png"),
      };
      Object.values(petTextures).forEach((texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.magFilter = THREE.NearestFilter;
      });
      const floorTexture = loader.load("/assets/world/courtyard-floor.png");
      const kitchenFloorTexture = loader.load("/assets/world/kitchen-floor.png");
      const officeFloorTexture = loader.load("/assets/world/office-floor.png");
      for (const texture of [floorTexture, kitchenFloorTexture, officeFloorTexture]) {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(7, 7);
        texture.magFilter = THREE.NearestFilter;
      }
      const enemyAtlas = loader.load("/assets/enemies/bug-enemies-atlas.png");
      enemyAtlas.colorSpace = THREE.SRGBColorSpace;
      enemyAtlas.magFilter = THREE.NearestFilter;
      const enemyBackAtlas = loader.load("/assets/enemies/bug-enemies-atlas-back.png");
      enemyBackAtlas.colorSpace = THREE.SRGBColorSpace;
      enemyBackAtlas.magFilter = THREE.NearestFilter;

      scene.add(new THREE.HemisphereLight(0x75cfff, 0x061018, 1.5));
      const key = new THREE.DirectionalLight(0xffffff, 2.2);
      key.position.set(-4, 10, 5);
      scene.add(key);
      const floorMat = new THREE.MeshStandardMaterial({ map: floorTexture, color: 0xa9bbd0, roughness: 0.52, metalness: 0.32 });
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(116, 116, 40, 40), floorMat);
      floor.rotation.x = -Math.PI / 2;
      scene.add(floor);
      const grid = new THREE.GridHelper(116, 58, 0x17667d, 0x0a2835);
      grid.position.y = 0.012;
      const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
      gridMaterials.forEach((material) => { material.transparent = true; material.opacity = 0.07; });
      scene.add(grid);

      const traceMat = new THREE.MeshBasicMaterial({ color: 0x16d8ff, transparent: true, opacity: 0.22 });
      for (let i = 0; i < 64; i++) {
        const trace = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.025, 2 + Math.random() * 5), traceMat);
        trace.position.set((Math.random() - 0.5) * 108, 0.035, (Math.random() - 0.5) * 108);
        trace.rotation.y = Math.random() > 0.5 ? Math.PI / 2 : 0;
        scene.add(trace);
      }
      const blockMat = new THREE.MeshStandardMaterial({ color: 0x102330, emissive: 0x06141e, metalness: 0.34, roughness: 0.68 });
      const obstacles: Obstacle[] = [];
      for (let attempt = 0; attempt < 320 && obstacles.length < 46; attempt++) {
        const width = 1.8 + Math.random() * 3.4;
        const depth = 1.8 + Math.random() * 3.4;
        const height = 0.55 + Math.random() * 1.65;
        const x = (Math.random() - 0.5) * 104;
        const z = (Math.random() - 0.5) * 104;
        if (Math.hypot(x, z) < 7.5) continue;
        const block = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), blockMat);
        const obstacle: Obstacle = { x, z, halfX: width / 2, halfZ: depth / 2, mesh: block, hp: 80, active: true };
        if (obstacles.some((other) => Math.abs(x - other.x) < obstacle.halfX + other.halfX + 1.4 && Math.abs(z - other.z) < obstacle.halfZ + other.halfZ + 1.4)) continue;
        obstacles.push(obstacle);
        block.position.set(x, height / 2, z);
        scene.add(block);
      }
      const puddleMat = new THREE.MeshStandardMaterial({ color: 0x071a2b, emissive: 0x07182a, metalness: 0.95, roughness: 0.08, transparent: true, opacity: 0.82 });
      for (let i = 0; i < 58; i++) {
        const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.5 + Math.random() * 1.4, 12), puddleMat);
        puddle.rotation.x = -Math.PI / 2;
        puddle.scale.x = 1.4 + Math.random() * 1.8;
        puddle.position.set((Math.random() - 0.5) * 106, 0.022, (Math.random() - 0.5) * 106);
        scene.add(puddle);
      }
      for (const [x, z, color] of [[-42, -31, 0xff3bbd], [39, -24, 0x28d8ff], [-35, 38, 0xff7a28], [42, 41, 0x4cff9c], [0, -46, 0x9966ff], [-49, 7, 0x28d8ff]] as const) {
        const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 2.8, 6), new THREE.MeshStandardMaterial({ color: 0x10151e, emissive: color, emissiveIntensity: 0.55 }));
        beacon.position.set(x, 1.4, z);
        scene.add(beacon);
        const light = new THREE.PointLight(color, 13, 11, 2);
        light.position.set(x, 1.8, z);
        scene.add(light);
      }
      const player = makePet("relay", petTextures);
      scene.add(player);
      const stageProps = new THREE.Group();
      scene.add(stageProps);
      const weapons = new THREE.Group();
      player.add(weapons);
      const game = {
        scene, camera, renderer, petTextures, enemyAtlas, enemyBackAtlas, floorMaterial: floorMat, floorTextures: { default: floorTexture, kitchen: kitchenFloorTexture, office: officeFloorTexture }, blockMaterial: blockMat, stageProps, player, weapons, enemies: [] as Enemy[], orbs: [] as Orb[], pickups: [] as Pickup[], hazards: [] as Hazard[], effects: [] as CombatFx[], obstacles, timer: new THREE.Timer(), keys: new Set<string>(),
        running: false, elapsed: 0, routeTime: 0, spawnTimer: 0, attackTimer: 0, bossesSpawned: 0, bossesDefeated: 0, outbreakTriggered: false, outbreakRemaining: 0, specialActive: false, specialCooldown: 0, pulseTimer: 0, chainTimer: 0, flameTimer: 0, boomerangTimer: 0, shutdownTimer: 0, helperTimer: 0, helperAttackTimer: 0, helperMesh: null, helperPet: null, playerHitFx: 0, specialFx: 0, alertFx: 0, shake: 0, spawnGrace: 4, combo: 0, comboTimer: 0, rerolls: 1,
      };
      gameRef.current = game;

      const onKeyDown = (event: KeyboardEvent) => {
        game.keys.add(event.key.toLowerCase());
        if (event.code === "Space") {
          event.preventDefault();
          deploySpecial();
        }
        if ((event.key.toLowerCase() === "p" || event.key === "Escape") && game.running) togglePause();
        if (process.env.NODE_ENV === "development" && event.key.toLowerCase() === "b" && game.running && game.bossesSpawned < BOSS_TIMES.length) spawnBoss(game);
        if (process.env.NODE_ENV === "development" && event.key.toLowerCase() === "t" && game.running) {
          statsRef.current.special = 100;
          deploySpecial();
        }
        if (process.env.NODE_ENV === "development" && event.key.toLowerCase() === "k" && game.running) {
          const boss = game.enemies.find((enemy) => enemy.boss);
          if (boss) killEnemy(game, boss);
        }
        if (process.env.NODE_ENV === "development" && event.key.toLowerCase() === "h" && game.running) {
          metaRef.current.stage = 10;
          setCurrentStage(10);
          launchRound(10, false);
        }
        if (process.env.NODE_ENV === "development" && event.key.toLowerCase() === "c" && game.running) {
          metaRef.current.stage = 2;
          setCurrentStage(2);
          launchRound(2, false);
        }
        if (process.env.NODE_ENV === "development" && event.key.toLowerCase() === "o" && game.running) {
          metaRef.current.stage = 3;
          setCurrentStage(3);
          launchRound(3, false);
        }
      };
      const onKeyUp = (event: KeyboardEvent) => game.keys.delete(event.key.toLowerCase());
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);

      let frame = 0;
      game.timer.connect(document);
      const animate = (timestamp?: number) => {
        frame = requestAnimationFrame(animate);
        game.timer.update(timestamp);
        const dt = Math.min(game.timer.getDelta(), 0.05);
        if (game.running && !pausedRef.current) updateGame(game, dt);
        const target = game.player.position.clone();
        const desired = target.clone().add(new THREE.Vector3(0, 12.5, 12.5));
        if (game.shake > 0) desired.add(new THREE.Vector3((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake * 0.35, (Math.random() - 0.5) * game.shake));
        game.camera.position.lerp(desired, 1 - Math.pow(0.001, dt));
        game.camera.lookAt(target.x, 0.6, target.z);
        game.renderer.render(game.scene, game.camera);
      };
      animate();
      const onResize = () => {
        if (!mount.clientWidth || !mount.clientHeight) return;
        camera.aspect = mount.clientWidth / mount.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(mount.clientWidth, mount.clientHeight);
        renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      };
      window.addEventListener("resize", onResize);
      return () => {
        disposed = true;
        cancelAnimationFrame(frame);
        window.removeEventListener("resize", onResize);
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
        game.timer.dispose();
        renderer.dispose();
        Object.values(petTextures).forEach((texture) => texture.dispose());
        enemyAtlas.dispose();
        enemyBackAtlas.dispose();
        floorTexture.dispose();
        kitchenFloorTexture.dispose();
        officeFloorTexture.dispose();
        mount.removeChild(renderer.domElement);
        gameRef.current = null;
      };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "WebGL initialization failed";
      window.setTimeout(() => setError(message), 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncHud = useCallback((game: NonNullable<typeof gameRef.current>) => {
    const s = statsRef.current;
    const boss = game.enemies.find((enemy) => enemy.boss);
    setHud({ hp: s.hp, maxHp: s.maxHp, level: s.level, xp: s.xp, nextXp: s.nextXp, kills: s.kills, special: s.special, elapsed: game.elapsed, routeTime: game.routeTime, boss: Boolean(boss), bossHp: boss?.hp ?? 0, bossMaxHp: boss?.maxHp ?? 1, bossesSpawned: game.bossesSpawned, bossesDefeated: game.bossesDefeated, outbreakRemaining: game.outbreakRemaining, specialCooldown: game.specialCooldown, combo: game.combo, rerolls: game.rerolls });
  }, []);

  function showCinematic(type: Exclude<Cinematic, null>, duration: number) {
    if (cinematicTimer.current !== null) window.clearTimeout(cinematicTimer.current);
    setCinematic(type);
    cinematicTimer.current = window.setTimeout(() => {
      setCinematic(null);
      cinematicTimer.current = null;
    }, duration);
  }

  function rebuildWeapons(game: NonNullable<typeof gameRef.current>) {
    game.weapons.clear();
    const s = statsRef.current;
    for (let i = 0; i < s.weapons; i++) {
      const pivot = new THREE.Group();
      pivot.rotation.y = (i / s.weapons) * Math.PI * 2;
      const color = PETS.find((pet) => pet.id === metaRef.current.selectedPet)?.color ?? 0x37c7ff;
      const distance = Math.min(2.45, 1.12 + s.range * 0.48);
      const tool = new THREE.Group();
      const metal = new THREE.MeshStandardMaterial({ color: 0xcceeff, emissive: color, emissiveIntensity: 1.25, metalness: 0.78, roughness: 0.24 });
      const grip = new THREE.MeshStandardMaterial({ color: 0x164c68, emissive: color, emissiveIntensity: 0.35, roughness: 0.55 });
      for (const side of [-1, 1]) {
        const handle = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.38, 4, 8), grip);
        handle.position.set(side * 0.11, -0.12, 0);
        handle.rotation.z = side * -0.26;
        const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.3, 0.09), metal);
        jaw.position.set(side * 0.075, 0.25, 0);
        jaw.rotation.z = side * 0.18;
        tool.add(handle, jaw);
      }
      const joint = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), metal);
      joint.position.y = 0.05;
      tool.add(joint);
      tool.position.set(0, 0.58, -distance);
      tool.scale.setScalar(1.25);
      pivot.add(tool);
      game.weapons.add(pivot);
    }
  }

  function startAudio() {
    if (audioRef.current) {
      audioRef.current.context.resume();
      return;
    }
    const AudioContextClass = window.AudioContext;
    const context = new AudioContextClass();
    const master = context.createGain();
    master.gain.value = soundOn ? 0.24 : 0;
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.ratio.value = 4;
    master.connect(compressor).connect(context.destination);
    const music = context.createGain();
    music.gain.value = 0.34;
    music.connect(master);
    audioRef.current = { context, master, music, oscillators: [], stepTimer: null, stage: 0 };
  }

  function setStageMusic(stage: number) {
    const audio = audioRef.current;
    if (!audio || audio.stage === stage) return;
    if (audio.stepTimer !== null) window.clearInterval(audio.stepTimer);
    for (const oscillator of audio.oscillators) {
      try { oscillator.stop(); } catch { /* already stopped */ }
      oscillator.disconnect();
    }
    audio.oscillators = [];
    audio.stage = stage;
    const profiles = [
      { root: 55, scale: [1, 1.25, 1.5, 2], wave: "triangle" as OscillatorType, tempo: 520 },
      { root: 65.41, scale: [1, 1.2, 1.5, 1.8], wave: "sine" as OscillatorType, tempo: 430 },
      { root: 49, scale: [1, 1.334, 1.5, 2], wave: "square" as OscillatorType, tempo: 610 },
      { root: 73.42, scale: [1, 1.125, 1.5, 1.875], wave: "triangle" as OscillatorType, tempo: 360 },
      { root: 58.27, scale: [1, 1.25, 1.667, 2], wave: "sawtooth" as OscillatorType, tempo: 470 },
    ];
    const stageRoots = [55, 65.41, 49, 73.42, 58.27, 61.74, 46.25, 77.78, 51.91, 69.3, 43.65, 82.41, 54, 92.5, 48, 87.31, 57.3, 98, 52, 41.2];
    const baseProfile = profiles[(stage - 1) % profiles.length];
    const profile = { ...baseProfile, root: stageRoots[(stage - 1) % stageRoots.length] };
    for (const [frequency, gainValue] of [[profile.root, 0.21], [profile.root * 1.5, 0.07]] as const) {
      const oscillator = audio.context.createOscillator();
      const gain = audio.context.createGain();
      oscillator.type = stage === 2 ? "sine" : profile.wave;
      oscillator.frequency.value = frequency;
      gain.gain.value = gainValue * 1.35;
      oscillator.connect(gain).connect(audio.music);
      oscillator.start();
      audio.oscillators.push(oscillator);
    }
    let step = 0;
    const playStep = () => {
      if (audio.context.state !== "running") return;
      const now = audio.context.currentTime;
      const oscillator = audio.context.createOscillator();
      const gain = audio.context.createGain();
      oscillator.type = profile.wave;
      oscillator.frequency.value = profile.root * 4 * profile.scale[step % profile.scale.length];
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(stage === 2 ? 0.045 : 0.032, now + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      oscillator.connect(gain).connect(audio.music);
      oscillator.start(now);
      oscillator.stop(now + 0.22);
      step += 1;
    };
    playStep();
    audio.stepTimer = window.setInterval(playStep, Math.max(250, profile.tempo - stage * 4));
  }

  function playSfx(type: "hit" | "boss" | "special" | "level" | "flame" | "shock") {
    const audio = audioRef.current;
    if (!audio || !soundOn) return;
    const now = audio.context.currentTime;
    const oscillator = audio.context.createOscillator();
    const gain = audio.context.createGain();
    const settings = {
      hit: [260, 0.035, "square"], boss: [72, 0.34, "sawtooth"], special: [520, 0.28, "triangle"],
      level: [660, 0.18, "sine"], flame: [120, 0.12, "sawtooth"], shock: [880, 0.1, "square"],
    } as const;
    const [frequency, duration, wave] = settings[type];
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(35, frequency * (type === "level" ? 1.5 : 0.45)), now + duration);
    gain.gain.setValueAtTime(type === "hit" ? 0.025 : 0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(audio.master);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  function buildStageSet(game: NonNullable<typeof gameRef.current>, theme: string) {
    game.obstacles = game.obstacles.filter((obstacle) => !obstacle.mesh.userData.stageCollider);
    game.stageProps.clear();
    for (const obstacle of game.obstacles) {
      obstacle.mesh.clear();
      obstacle.mesh.userData.breakable = false;
    }
    const addStageCollider = (x: number, z: number, halfX: number, halfZ: number) => {
      const collider = new THREE.Mesh(new THREE.BoxGeometry(halfX * 2, 0.5, halfZ * 2), new THREE.MeshBasicMaterial({ visible: false }));
      collider.position.set(x, 0.25, z);
      collider.userData.stageCollider = true;
      game.stageProps.add(collider);
      game.obstacles.push({ x, z, halfX, halfZ, mesh: collider, hp: 99999, active: true });
    };
    if (theme === "kitchen") {
      const steel = new THREE.MeshStandardMaterial({ color: 0xb9c5ca, metalness: 0.76, roughness: 0.26 });
      const darkSteel = new THREE.MeshStandardMaterial({ color: 0x26333a, metalness: 0.68, roughness: 0.34 });
      const ceramic = new THREE.MeshStandardMaterial({ color: 0xfff0d2, roughness: 0.48 });
      const red = new THREE.MeshStandardMaterial({ color: 0xe94d3f, roughness: 0.52 });
      const pastry = new THREE.MeshStandardMaterial({ color: 0xe6a04f, roughness: 0.72 });
      const frosting = new THREE.MeshStandardMaterial({ color: 0xff8eb8, roughness: 0.58 });
      const green = new THREE.MeshStandardMaterial({ color: 0x65b95c, roughness: 0.8 });
      const burner = new THREE.MeshBasicMaterial({ color: 0xff8a24, transparent: true, opacity: 0.88 });
      [...game.obstacles].sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z)).slice(0, 24).forEach((obstacle, index) => {
        obstacle.mesh.userData.breakable = index % 3 !== 0;
        obstacle.hp = 48 + index * 1.5;
        const params = (obstacle.mesh.geometry as THREE.BoxGeometry).parameters;
        const top = params.height / 2;
        const counter = new THREE.Mesh(new THREE.BoxGeometry(params.width * 1.03, 0.12, params.depth * 1.03), steel);
        counter.position.y = top + 0.06;
        obstacle.mesh.add(counter);
        if (index % 4 === 0) {
          for (const x of [-0.34, 0.34]) {
            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 8, 20), burner);
            ring.rotation.x = Math.PI / 2;
            ring.position.set(x, top + 0.135, 0);
            obstacle.mesh.add(ring);
          }
          const oven = new THREE.Mesh(new THREE.BoxGeometry(Math.min(1.35, params.width * 0.7), 0.68, 0.08), darkSteel);
          oven.position.set(0, -Math.min(0.06, top * 0.1), params.depth / 2 + 0.045);
          obstacle.mesh.add(oven);
          for (const x of [-0.42, -0.14, 0.14, 0.42]) {
            const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.07, 12), red);
            knob.rotation.x = Math.PI / 2;
            knob.position.set(x, top * 0.34, params.depth / 2 + 0.1);
            obstacle.mesh.add(knob);
          }
        } else if (index % 4 === 1) {
          const sink = new THREE.Mesh(new THREE.BoxGeometry(Math.min(1.25, params.width * 0.62), 0.07, Math.min(0.82, params.depth * 0.62)), darkSteel);
          sink.position.y = top + 0.145;
          obstacle.mesh.add(sink);
          const tap = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.045, 8, 18, Math.PI), steel);
          tap.rotation.x = -Math.PI / 2;
          tap.rotation.z = Math.PI / 2;
          tap.position.set(0, top + 0.45, -0.24);
          obstacle.mesh.add(tap);
        } else if (index % 4 === 2) {
          const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.07, 24), ceramic);
          plate.position.y = top + 0.16;
          obstacle.mesh.add(plate);
          const cake = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.38, 24), pastry);
          cake.position.y = top + 0.36;
          obstacle.mesh.add(cake);
          const icing = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.11, 24), frosting);
          icing.position.y = top + 0.59;
          obstacle.mesh.add(icing);
          for (const x of [-0.18, 0, 0.18]) {
            const berry = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), red);
            berry.position.set(x, top + 0.69, 0);
            obstacle.mesh.add(berry);
          }
        } else {
          const board = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 0.85), new THREE.MeshStandardMaterial({ color: 0xa86f3d, roughness: 0.84 }));
          board.position.y = top + 0.15;
          obstacle.mesh.add(board);
          for (let item = 0; item < 5; item++) {
            const food = new THREE.Mesh(new THREE.SphereGeometry(0.11 + (item % 2) * 0.04, 10, 8), item % 2 ? red : green);
            food.scale.y = 0.62;
            food.position.set(-0.42 + item * 0.21, top + 0.25, Math.sin(item) * 0.18);
            obstacle.mesh.add(food);
          }
          const knife = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.035, 0.1), steel);
          knife.position.set(0.15, top + 0.23, -0.29);
          knife.rotation.y = -0.35;
          obstacle.mesh.add(knife);
        }
      });
      for (const [x, z, kind] of [[-10, -7, 0], [11, 8, 1], [-16, 13, 2], [17, -12, 0], [-21, -20, 1], [22, 19, 2]] as const) {
        const cart = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.16, 1.05), steel);
        body.position.y = 0.82;
        cart.add(body);
        for (const sx of [-0.68, 0.68]) for (const sz of [-0.38, 0.38]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.74, 8), darkSteel);
          leg.position.set(sx, 0.4, sz);
          cart.add(leg);
        }
        if (kind === 0) {
          const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.48, 0.55, 20), darkSteel);
          pot.position.y = 1.18;
          cart.add(pot);
        } else if (kind === 1) {
          for (let item = 0; item < 4; item++) {
            const donut = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.09, 10, 18), item % 2 ? frosting : pastry);
            donut.rotation.x = Math.PI / 2;
            donut.position.set(-0.5 + item * 0.34, 0.99, 0);
            cart.add(donut);
          }
        } else {
          const dome = new THREE.Mesh(new THREE.SphereGeometry(0.58, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xbfefff, transparent: true, opacity: 0.34, roughness: 0.08 }));
          dome.position.y = 0.94;
          cart.add(dome);
        }
        cart.position.set(x, 0, z);
        game.stageProps.add(cart);
        addStageCollider(x, z, 0.94, 0.64);
      }
      for (const [x, z, rotation, accent] of [[-8.2, 0, 0, 0xff8a24], [8.2, 0, Math.PI, 0x66e7ff], [0, -8.2, Math.PI / 2, 0xff8eb8], [0, 8.2, -Math.PI / 2, 0x9adf53]] as const) {
        for (const obstacle of game.obstacles) {
          if (!obstacle.mesh.userData.stageCollider && Math.abs(obstacle.x - x) < obstacle.halfX + 1.8 && Math.abs(obstacle.z - z) < obstacle.halfZ + 1.2) {
            obstacle.active = false;
            obstacle.mesh.visible = false;
          }
        }
        const island = new THREE.Group();
        const base = new THREE.Mesh(new THREE.BoxGeometry(3.25, 1.15, 1.85), darkSteel);
        base.position.y = 0.58;
        const top = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.16, 2.08), steel);
        top.position.y = 1.2;
        island.add(base, top);
        for (const sx of [-1.05, -0.35, 0.35, 1.05]) {
          const drawer = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.36, 0.045), new THREE.MeshStandardMaterial({ color: 0x43525a, metalness: 0.56, roughness: 0.38 }));
          drawer.position.set(sx, 0.66, 0.95);
          island.add(drawer);
        }
        const sign = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.09, 0.55), new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.48 }));
        sign.position.set(0, 1.33, -0.25);
        island.add(sign);
        for (let dish = 0; dish < 5; dish++) {
          const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.27, 0.055, 18), ceramic);
          plate.position.set(-1.18 + dish * 0.58, 1.34, 0.42);
          const meal = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), dish % 2 ? frosting : pastry);
          meal.scale.y = 0.55;
          meal.position.set(plate.position.x, 1.44, 0.42);
          island.add(plate, meal);
        }
        island.position.set(x, 0, z);
        island.rotation.y = rotation;
        game.stageProps.add(island);
        addStageCollider(x, z, 1.82, 1.12);
      }
    }
    if (theme === "office") {
      const screen = new THREE.MeshStandardMaterial({ color: 0x06131c, emissive: 0x35d9ff, emissiveIntensity: 1.8, roughness: 0.16 });
      const dark = new THREE.MeshStandardMaterial({ color: 0x142432, roughness: 0.72 });
      const wood = new THREE.MeshStandardMaterial({ color: 0x8f6547, roughness: 0.7 });
      const paper = new THREE.MeshStandardMaterial({ color: 0xeaf2e8, roughness: 0.82 });
      const green = new THREE.MeshStandardMaterial({ color: 0x4e9b67, roughness: 0.86 });
      [...game.obstacles].sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z)).slice(0, 26).forEach((obstacle, index) => {
        obstacle.mesh.userData.breakable = index % 4 !== 0;
        obstacle.hp = 58 + index * 1.5;
        const params = (obstacle.mesh.geometry as THREE.BoxGeometry).parameters;
        const top = params.height / 2;
        const desktop = new THREE.Mesh(new THREE.BoxGeometry(params.width * 1.04, 0.13, params.depth * 1.04), wood);
        desktop.position.y = top + 0.065;
        obstacle.mesh.add(desktop);
        if (index % 5 < 3) {
          const bezel = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.82, 0.12), dark);
          bezel.position.set(index % 2 ? -0.32 : 0.32, top + 0.66, -0.18);
          obstacle.mesh.add(bezel);
          const monitor = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.65, 0.025), screen);
          monitor.position.set(bezel.position.x, top + 0.66, -0.247);
          obstacle.mesh.add(monitor);
          const stand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.12), dark);
          stand.position.set(bezel.position.x, top + 0.22, -0.18);
          obstacle.mesh.add(stand);
          const keyboard = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.34), dark);
          keyboard.position.set(bezel.position.x, top + 0.16, 0.48);
          obstacle.mesh.add(keyboard);
          const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.12, 0.25, 14), new THREE.MeshStandardMaterial({ color: index % 2 ? 0xffc857 : 0x66a7ff, roughness: 0.55 }));
          mug.position.set(-bezel.position.x * 1.8, top + 0.27, 0.25);
          obstacle.mesh.add(mug);
        } else if (index % 5 === 3) {
          const copier = new THREE.Mesh(new THREE.BoxGeometry(Math.min(1.8, params.width * 0.7), 1.1, Math.min(1.15, params.depth * 0.7)), paper);
          copier.position.y = top + 0.58;
          obstacle.mesh.add(copier);
          const tray = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.65), dark);
          tray.position.set(0, top + 1.18, 0.05);
          obstacle.mesh.add(tray);
          const panel = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.22), screen);
          panel.position.set(0.42, top + 1.24, -0.25);
          obstacle.mesh.add(panel);
        } else {
          for (let file = 0; file < 4; file++) {
            const folder = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32 + file * 0.05, 0.08), new THREE.MeshStandardMaterial({ color: [0x66a7ff, 0xffc857, 0xff6687, 0x76f7ad][file], roughness: 0.72 }));
            folder.position.set(-0.62 + file * 0.4, top + 0.24, 0);
            folder.rotation.z = (file - 1.5) * 0.08;
            obstacle.mesh.add(folder);
          }
        }
        if (index % 2 === 0) {
          const divider = new THREE.Mesh(new THREE.BoxGeometry(Math.min(2.4, params.width * 0.86), 0.75, 0.1), dark);
          divider.position.set(0, top + 0.46, -params.depth * 0.35);
          obstacle.mesh.add(divider);
        }
      });
      for (const [x, z, rotation] of [[-8, 7, 0], [9, -6, 1.2], [-17, -14, 2.4], [16, 15, -0.8], [-23, 18, 0.4], [22, -19, -2]] as const) {
        const chair = new THREE.Group();
        const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.45, 0.18, 16), dark);
        seat.position.y = 0.52;
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.94, 0.16), dark);
        back.position.set(0, 0.95, 0.32);
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 10), dark);
        stem.position.y = 0.27;
        chair.add(seat, back, stem);
        for (let wheel = 0; wheel < 5; wheel++) {
          const angle = wheel / 5 * Math.PI * 2;
          const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.045, 0.07), dark);
          spoke.position.set(Math.cos(angle) * 0.2, 0.08, Math.sin(angle) * 0.2);
          spoke.rotation.y = -angle;
          chair.add(spoke);
        }
        chair.position.set(x, 0, z);
        chair.rotation.y = rotation;
        game.stageProps.add(chair);
        addStageCollider(x, z, 0.58, 0.58);
      }
      for (const [x, z] of [[-13, 18], [18, 10], [-20, -8], [13, -20]] as const) {
        const plant = new THREE.Group();
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.32, 0.62, 16), wood);
        pot.position.y = 0.31;
        plant.add(pot);
        for (let leaf = 0; leaf < 7; leaf++) {
          const blade = new THREE.Mesh(new THREE.SphereGeometry(0.29, 10, 8), green);
          const angle = leaf / 7 * Math.PI * 2;
          blade.scale.set(0.55, 1.7, 0.38);
          blade.position.set(Math.cos(angle) * 0.25, 0.88 + (leaf % 2) * 0.24, Math.sin(angle) * 0.25);
          blade.rotation.z = Math.cos(angle) * 0.38;
          plant.add(blade);
        }
        plant.position.set(x, 0, z);
        game.stageProps.add(plant);
        addStageCollider(x, z, 0.5, 0.5);
      }
    }
  }

  function clearRound(game: NonNullable<typeof gameRef.current>) {
    setTeamSkillName("");
    for (const enemy of game.enemies) game.scene.remove(enemy.mesh);
    for (const orb of game.orbs) game.scene.remove(orb.mesh);
    for (const pickup of game.pickups) game.scene.remove(pickup.mesh);
    for (const hazard of game.hazards) game.scene.remove(hazard.mesh);
    if (game.helperMesh) game.scene.remove(game.helperMesh);
    for (const effect of game.effects) game.scene.remove(effect.object);
    game.enemies = [];
    game.orbs = [];
    game.pickups = [];
    game.hazards = [];
    game.effects = [];
    game.elapsed = 0;
    game.routeTime = 0;
    game.spawnTimer = 0;
    game.attackTimer = 0;
    game.bossesSpawned = 0;
    game.bossesDefeated = 0;
    game.outbreakTriggered = false;
    game.outbreakRemaining = 0;
    game.specialActive = false;
    game.specialCooldown = 0;
    game.pulseTimer = 1.2;
    game.chainTimer = 1.8;
    game.flameTimer = 0.8;
    game.boomerangTimer = 1.6;
    game.shutdownTimer = 3.2;
    game.helperTimer = 0;
    game.helperAttackTimer = 0;
    game.helperMesh = null;
    game.helperPet = null;
    game.playerHitFx = 0;
    game.specialFx = 0;
    game.alertFx = 0;
    game.shake = 0;
    game.spawnGrace = 4;
    game.combo = 0;
    game.comboTimer = 0;
    game.rerolls = 1;
    game.player.position.set(0, 0, 0);
    for (const obstacle of game.obstacles) {
      obstacle.active = true;
      obstacle.hp = 80;
      obstacle.mesh.visible = true;
    }
    setCinematic(null);
    pausedRef.current = false;
    setPaused(false);
    const audio = audioRef.current;
    if (audio) audio.music.gain.setTargetAtTime(0.34, audio.context.currentTime, 0.08);
  }

  function startGame() {
    if (!assetsReady) return;
    startAudio();
    metaRef.current = { ...metaRef.current, stage: currentStage, hard: hardMode, selectedPet };
    launchRound(currentStage, hardMode);
  }

  function togglePause() {
    const game = gameRef.current;
    if (!game?.running) return;
    setPaused((value) => {
      const next = !value;
      pausedRef.current = next;
      const audio = audioRef.current;
      if (audio) audio.music.gain.setTargetAtTime(next ? 0.025 : 0.34, audio.context.currentTime, 0.08);
      return next;
    });
  }

  function rerollUpgrades() {
    const game = gameRef.current;
    if (!game || game.rerolls <= 0) return;
    game.rerolls -= 1;
    const pool = UPGRADE_IDS.filter((id) => (id !== "flame" || metaRef.current.selectedPet === "kiln") && (id !== "helper" || metaRef.current.stage >= 2));
    setChoices([...pool].sort(() => Math.random() - 0.5).slice(0, 3));
    syncHud(game);
  }

  function buyMeta(type: "power" | "hp") {
    const rank = type === "power" ? powerRank : hpRank;
    const cost = (rank + 1) * 80;
    if (coins < cost || rank >= 10) return;
    setCoins((value) => value - cost);
    if (type === "power") setPowerRank((value) => value + 1);
    else setHpRank((value) => value + 1);
  }

  function shareResult() {
    const stage = STAGES[currentStage - 1];
    const result = screen === "victory" ? (lang === "ja" ? "リリース成功" : "Release complete") : (lang === "ja" ? "再ビルド中" : "Rebuilding");
    const text = lang === "ja"
      ? `PromptBreak: Bug Sweepers｜STAGE ${currentStage} ${stage.name.ja}\n${result} · LV.${hud.level} · ${hud.kills} bugs fixed · BOSS ${hud.bossesDefeated}/2`
      : `PromptBreak: Bug Sweepers | STAGE ${currentStage} ${stage.name.en}\n${result} · LV.${hud.level} · ${hud.kills} bugs fixed · BOSS ${hud.bossesDefeated}/2`;
    const params = new URLSearchParams({ text, url: window.location.origin });
    window.open(`https://x.com/intent/post?${params.toString()}`, "_blank", "noopener,noreferrer");
  }

  function registerLocalScore(game: NonNullable<typeof gameRef.current>) {
    const handle = normalizeHandle(handleName) || "PLAYER";
    const s = statsRef.current;
    const entry: LeaderboardEntry = {
      stage: metaRef.current.stage,
      hard: metaRef.current.hard,
      handle,
      score: Math.max(0, Math.floor(s.kills * 100 + s.level * 250 + game.bossesDefeated * 1200 - game.elapsed * 2)),
      level: s.level,
      kills: s.kills,
      time: Math.round(game.elapsed * 10) / 10,
      at: Date.now(),
    };
    setLeaderboard((current) => {
      const next = [...current, entry]
        .sort((a, b) => b.score - a.score || a.time - b.time)
        .filter((item, index, all) => all.findIndex((candidate) => candidate.stage === item.stage && candidate.hard === item.hard && candidate.handle === item.handle) === index)
        .filter((item, index, all) => all.slice(0, index).filter((candidate) => candidate.stage === item.stage && candidate.hard === item.hard).length < 5)
        .slice(0, 100);
      window.localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(next));
      return next;
    });
  }

  function launchRound(stage: number, hard: boolean) {
    const game = gameRef.current;
    if (!game) return;
    clearRound(game);
    const maxHp = 100 + hpRank * 12;
    const petId = metaRef.current.selectedPet;
    statsRef.current = { hp: maxHp, maxHp, level: 1, xp: 0, nextXp: 14, kills: 0, special: petId === "hollow" ? 28 : 0, damage: 12 * (1 + powerRank * 0.09), range: 2.35, weapons: petId === "parcel" ? 1 : 0, attackDelay: petId === "chroma" ? 0.66 : 0.72, moveSpeed: 5.4, magnet: petId === "lumen" ? 3.5 : 2.4, pulseLevel: petId === "anvil" || petId === "tidal" ? 1 : 0, chainLevel: petId === "relay" || petId === "chroma" ? 1 : 0, flameLevel: petId === "kiln" ? 1 : 0, boomerangLevel: 0, shutdownLevel: 0, helperLevel: 0 };
    if (petId === "vector") { statsRef.current.damage *= 1.16; statsRef.current.range *= 1.18; }
    if (petId === "tidal") { statsRef.current.maxHp += 10; statsRef.current.hp += 10; }
    game.scene.remove(game.player);
    const pet = PETS.find((entry) => entry.id === metaRef.current.selectedPet) ?? PETS[0];
    game.player = makePet(pet.id, game.petTextures);
    game.weapons = new THREE.Group();
    game.player.add(game.weapons);
    game.scene.add(game.player);
    const config = STAGES[stage - 1];
    const stageColor = new THREE.Color(config.color).multiplyScalar(hard ? 0.11 : 0.075);
    game.floorMaterial.color.set(config.color).lerp(new THREE.Color(0xa9bbd0), 0.68);
    game.floorMaterial.map = config.theme === "kitchen" ? game.floorTextures.kitchen : config.theme === "office" ? game.floorTextures.office : game.floorTextures.default;
    game.floorMaterial.needsUpdate = true;
    if (config.theme === "kitchen") game.blockMaterial.color.set(0x7c8991);
    else if (config.theme === "office") game.blockMaterial.color.set(0x5f412f).multiplyScalar(0.72);
    else game.blockMaterial.color.set(config.color).multiplyScalar(0.22);
    game.scene.fog = new THREE.FogExp2(stageColor, hard ? 0.033 : 0.025);
    game.scene.background = stageColor.clone().multiplyScalar(0.38);
    setStageMusic(stage);
    buildStageSet(game, config.theme);
    rebuildWeapons(game);
    game.running = true;
    game.timer.reset();
    setUnlockNotice(false);
    setScreen("playing");
    setStageIntro(true);
    window.setTimeout(() => setStageIntro(false), 2200);
    syncHud(game);
  }

  function proceedAfterVictory() {
    const meta = metaRef.current;
    if (!meta.hard && meta.stage < STAGES.length) {
      const next = meta.stage + 1;
      metaRef.current.stage = next;
      setCurrentStage(next);
      launchRound(next, false);
      return;
    }
    if (!meta.hard && meta.stage === STAGES.length) {
      metaRef.current = { ...metaRef.current, stage: 1, hard: true };
      setHardMode(true);
      setCurrentStage(1);
      launchRound(1, true);
      return;
    }
    const next = meta.stage >= STAGES.length ? 1 : meta.stage + 1;
    metaRef.current.stage = next;
    setCurrentStage(next);
    launchRound(next, true);
  }

  function spawnEnemy(game: NonNullable<typeof gameRef.current>, boss = false) {
    const distance = boss ? 17 : 15 + Math.random() * 6;
    const progress = game.elapsed / STAGE_BOSS_TIME;
    const { stage, hard } = metaRef.current;
    const mega = boss && stage === 5 && game.bossesSpawned === 2;
    const unlockedKinds = Math.min(10, stage);
    const kind = boss ? (stage + game.bossesSpawned * 3 - 1) % 10 : Math.floor(Math.pow(Math.random(), 0.72) * unlockedKinds);
    const mesh = makeBug(kind, game.enemyAtlas, game.enemyBackAtlas, boss, mega);
    for (let attempt = 0; attempt < 14; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      mesh.position.set(
        clamp(game.player.position.x + Math.cos(angle) * distance, -53, 53),
        boss ? 0.15 : 0.1,
        clamp(game.player.position.z + Math.sin(angle) * distance, -53, 53),
      );
      if (!positionBlocked(mesh.position, boss ? 1.5 : 0.65, game.obstacles)) break;
    }
    game.scene.add(mesh);
    const modeScale = hard ? 1.55 : 1;
    const stageScale = 1 + (stage - 1) * 0.14;
    const bossEase = stage === 1 && !hard ? 0.85 : 1;
    const bossBaseHp = (220 + stage * 45 + Math.max(0, game.bossesSpawned - 1) * 100) * (mega ? 1.8 : 1);
    const hp = boss
      ? bossBaseHp * modeScale * bossEase
      : (16 + kind * 8.5) * (1 + progress * 1.1) * stageScale * modeScale;
    const baseSpeed = 1.05 + (kind % 5) * 0.12 + (kind > 6 ? 0.14 : 0);
    const stagePace = 1 + Math.min(0.34, (stage - 1) * 0.018);
    const enemy = { mesh, hp, maxHp: hp, speed: (boss ? (mega ? 0.74 : 0.94) + stage * 0.014 : baseSpeed * stagePace) * (hard ? 1.16 : 1), radius: mega ? 2.15 : boss ? 1.28 : 0.52 + (kind % 3) * 0.08, xp: boss ? 0 : 2 + Math.floor(kind / 2), boss, mega, skillCooldown: boss ? 4.8 : 999, lastHit: -10, lastOrbitHit: -10, kind };
    game.enemies.push(enemy);
    return enemy;
  }

  function spawnBoss(game: NonNullable<typeof gameRef.current>) {
    if (game.bossesSpawned >= BOSS_TIMES.length || game.enemies.some((enemy) => enemy.boss) || (game.bossesSpawned === 1 && game.outbreakRemaining > 0)) return;
    game.bossesSpawned += 1;
    const boss = spawnEnemy(game, true);
    game.alertFx = 2.5;
    game.shake = 1.4;
    playSfx("boss");
    showCinematic("boss", 2400);
    spawnRadialImpact(game, boss.mesh.position, 0xff315e, 0.82);
    syncHud(game);
  }

  function telegraphBossSkill(game: NonNullable<typeof gameRef.current>, boss: Enemy) {
    for (const [position, radius] of [[boss.mesh.position, boss.mega ? 1.5 : 0.9], [game.player.position, 0.72]] as const) {
      const warning = new THREE.Mesh(
        new THREE.RingGeometry(radius, radius + 0.1, 42),
        new THREE.MeshBasicMaterial({ color: 0xff315e, transparent: true, opacity: 0.82, side: THREE.DoubleSide, depthWrite: false }),
      );
      warning.rotation.x = -Math.PI / 2;
      warning.position.copy(position).setY(0.06);
      addEffect(game, { object: warning, life: 0.82, maxLife: 0.82, grow: 0.28 });
    }
    playSfx("boss");
  }

  function launchBossVirusScatter(game: NonNullable<typeof gameRef.current>, boss: Enemy) {
    const origin = boss.mesh.position.clone().setY(0.48);
    const aim = game.player.position.clone().sub(origin).setY(0).normalize();
    const shots = boss.mega ? 11 : 7;
    const spread = boss.mega ? 1.25 : 0.8;
    for (let i = 0; i < shots; i++) {
      const angle = shots === 1 ? 0 : -spread / 2 + (i / (shots - 1)) * spread;
      const direction = aim.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
      const mesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(boss.mega ? 0.22 : 0.16, 1),
        new THREE.MeshStandardMaterial({ color: 0x8f3cff, emissive: 0xff315e, emissiveIntensity: 1.6, roughness: 0.45 }),
      );
      mesh.position.copy(origin);
      game.scene.add(mesh);
      game.hazards.push({ mesh, velocity: direction.multiplyScalar(boss.mega ? 5.2 : 4.5), born: game.elapsed, damage: boss.mega ? 10 : 7 });
    }
    game.shake = Math.max(game.shake, boss.mega ? 1.1 : 0.55);
  }

  function summonHelper(game: NonNullable<typeof gameRef.current>, rescue = false) {
    if (game.helperMesh) game.scene.remove(game.helperMesh);
    const selectedIndex = PETS.findIndex((pet) => pet.id === metaRef.current.selectedPet);
    const pet = PETS[(selectedIndex + (rescue ? 1 : 2)) % PETS.length];
    const helper = makePet(pet.id, game.petTextures, rescue ? 0.82 : 0.68);
    helper.position.copy(game.player.position).add(new THREE.Vector3(1.6, 0, 1.2));
    game.scene.add(helper);
    game.helperMesh = helper;
    game.helperPet = pet;
    game.helperTimer = rescue ? 16 : 10;
    game.helperAttackTimer = 0.2;
    game.player.userData.lastHelperAt = game.elapsed;
    spawnRadialImpact(game, helper.position, pet.color, 0.36);
    playSfx("level");
  }

  function dropOrb(game: NonNullable<typeof gameRef.current>, enemy: Enemy) {
    if (enemy.boss) return;
    const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), new THREE.MeshBasicMaterial({ color: 0x62f5ff }));
    mesh.position.copy(enemy.mesh.position).setY(0.2);
    game.scene.add(mesh);
    game.orbs.push({ mesh, value: enemy.xp, born: game.elapsed });
  }

  function spawnPickup(game: NonNullable<typeof gameRef.current>, position: THREE.Vector3) {
    const roll = Math.random();
    const kind: PickupKind = roll < 0.42 ? "bomb" : roll < 0.72 ? "repair" : "overclock";
    const group = new THREE.Group();
    if (kind === "bomb") {
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.27, 16, 12), new THREE.MeshStandardMaterial({ color: 0x17202a, metalness: 0.75, roughness: 0.3 }));
      const fuse = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.035, 7, 14, Math.PI * 0.78), new THREE.MeshBasicMaterial({ color: 0xff8a24 }));
      fuse.position.set(0.16, 0.22, 0);
      group.add(body, fuse);
    } else if (kind === "repair") {
      const material = new THREE.MeshStandardMaterial({ color: 0x62f3a5, emissive: 0x123d2b, emissiveIntensity: 1.2 });
      group.add(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.62, 0.18), material), new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.18, 0.18), material));
    } else {
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), new THREE.MeshStandardMaterial({ color: 0xffd45e, emissive: 0x6b4200, emissiveIntensity: 1.7 }));
      core.rotation.z = Math.PI / 4;
      group.add(core);
    }
    group.position.copy(position).setY(0.42);
    group.userData.baseY = 0.42;
    game.scene.add(group);
    game.pickups.push({ mesh: group, kind, born: game.elapsed });
  }

  function collectPickup(game: NonNullable<typeof gameRef.current>, pickup: Pickup) {
    const s = statsRef.current;
    if (pickup.kind === "bomb") {
      game.shake = 1.5;
      spawnRadialImpact(game, game.player.position, 0xff8a24, 2.4);
      for (const enemy of [...game.enemies]) {
        enemy.hp -= enemy.boss ? Math.min(180, enemy.maxHp * 0.12) : 220;
        if (enemy.hp <= 0) killEnemy(game, enemy);
      }
      playSfx("flame");
    } else if (pickup.kind === "repair") {
      s.hp = Math.min(s.maxHp, s.hp + 30);
      playSfx("level");
    } else {
      s.special = Math.min(100, s.special + 42);
      game.attackTimer = 0;
      playSfx("shock");
    }
  }

  function addEffect(game: NonNullable<typeof gameRef.current>, effect: CombatFx) {
    if (game.effects.length >= 72) {
      const oldest = game.effects.shift();
      if (oldest) game.scene.remove(oldest.object);
    }
    game.scene.add(effect.object);
    game.effects.push(effect);
  }

  function spawnRadialImpact(game: NonNullable<typeof gameRef.current>, position: THREE.Vector3, color: number, intensity = 1) {
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.34 + i * 0.24, 0.46 + i * 0.26, 40),
        new THREE.MeshBasicMaterial({ color: i === 1 ? 0xffffff : color, transparent: true, opacity: 0.9 - i * 0.18, side: THREE.DoubleSide, depthWrite: false }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.copy(position).setY(0.08 + i * 0.012);
      ring.scale.setScalar(0.35 + i * 0.15);
      addEffect(game, { object: ring, life: 0.58 + i * 0.08, maxLife: 0.58 + i * 0.08, grow: (1.8 + i * 0.42) * intensity });
    }
    const burst = new THREE.Group();
    for (let i = 0; i < 18; i++) {
      const ray = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 0.04, 0.7 + (i % 4) * 0.25),
        new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? 0xffffff : color, transparent: true, opacity: 0.92, depthWrite: false }),
      );
      ray.position.set(0, 0.22 + (i % 3) * 0.04, -0.48 - (i % 4) * 0.16);
      const pivot = new THREE.Group();
      pivot.rotation.y = (i / 18) * Math.PI * 2;
      pivot.add(ray);
      burst.add(pivot);
    }
    burst.position.copy(position);
    addEffect(game, { object: burst, life: 0.48, maxLife: 0.48, grow: 1.8 * intensity });
  }

  function spawnPlayerDamageFx(game: NonNullable<typeof gameRef.current>) {
    const origin = game.player.position.clone().setY(0.52);
    for (let i = 0; i < 12; i++) {
      const shard = new THREE.Mesh(
        new THREE.TetrahedronGeometry(0.075 + (i % 3) * 0.025, 0),
        new THREE.MeshBasicMaterial({ color: i % 4 === 0 ? 0xffffff : 0xff315e, transparent: true, opacity: 0.96, depthWrite: false }),
      );
      shard.position.copy(origin);
      const angle = i / 12 * Math.PI * 2;
      addEffect(game, { object: shard, life: 0.32, maxLife: 0.32, velocity: new THREE.Vector3(Math.cos(angle) * 3.8, 0.8 + (i % 3) * 0.5, Math.sin(angle) * 3.8), grow: 0.8 });
    }
    const sprite = game.player.getObjectByName("pet-art") as THREE.Sprite | undefined;
    if (sprite) {
      const material = sprite.material as THREE.SpriteMaterial;
      material.color.set(0xff5b72);
      window.setTimeout(() => { if (sprite.parent) material.color.set(0xffffff); }, 110);
    }
  }

  function spawnAllySignature(game: NonNullable<typeof gameRef.current>, from: THREE.Vector3, enemy: Enemy, pet: (typeof PETS)[number]) {
    const start = from.clone().add(new THREE.Vector3(0, 0.62, 0));
    const end = enemy.mesh.position.clone().add(new THREE.Vector3(0, enemy.boss ? 1.15 : 0.48, 0));
    const vector = end.clone().sub(start);
    const addBeam = (color: number, radius: number, life = 0.25) => {
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.55, radius, vector.length(), 8),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.94, depthWrite: false }),
      );
      beam.position.copy(start).lerp(end, 0.5);
      beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vector.clone().normalize());
      beam.renderOrder = 9;
      addEffect(game, { object: beam, life, maxLife: life });
    };
    addBeam(pet.color, 0.028, 0.52);
    if (pet.id === "relay") {
      addBeam(0x7fdcff, 0.07);
      const branches = [...game.enemies].filter((candidate) => candidate !== enemy).sort((a, b) => a.mesh.position.distanceTo(end) - b.mesh.position.distanceTo(end)).slice(0, 2);
      for (const branch of branches) {
        const branchEnd = branch.mesh.position.clone().setY(0.5);
        const branchVector = branchEnd.clone().sub(end);
        const arc = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.045, branchVector.length(), 6), new THREE.MeshBasicMaterial({ color: 0x66e7ff, transparent: true, opacity: 0.8 }));
        arc.position.copy(end).lerp(branchEnd, 0.5);
        arc.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), branchVector.normalize());
        addEffect(game, { object: arc, life: 0.3, maxLife: 0.3 });
      }
    } else if (pet.id === "tidal") {
      for (let i = 0; i < 14; i++) {
        const drop = new THREE.Mesh(new THREE.SphereGeometry(0.08 + (i % 3) * 0.025, 8, 6), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x8cf4ff : 0x2cbfff, transparent: true, opacity: 0.88 }));
        const angle = i / 14 * Math.PI * 2;
        drop.position.copy(end);
        addEffect(game, { object: drop, life: 0.42, maxLife: 0.42, velocity: new THREE.Vector3(Math.cos(angle) * 3, 0.5 + (i % 4) * 0.28, Math.sin(angle) * 3), grow: 0.35 });
      }
      statsRef.current.hp = Math.min(statsRef.current.maxHp, statsRef.current.hp + 4);
    } else if (pet.id === "kiln") {
      addBeam(0xff6b24, 0.16, 0.34);
      for (let i = 0; i < 18; i++) {
        const ember = new THREE.Mesh(new THREE.OctahedronGeometry(0.08 + (i % 3) * 0.035, 0), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffd45e : 0xff4b24, transparent: true, opacity: 0.95 }));
        ember.position.copy(start).addScaledVector(vector, Math.random());
        addEffect(game, { object: ember, life: 0.48, maxLife: 0.48, velocity: new THREE.Vector3((Math.random() - 0.5) * 1.2, 0.7, (Math.random() - 0.5) * 1.2), grow: 0.5 });
      }
    } else if (pet.id === "vector") {
      addBeam(0xfff1a8, 0.12, 0.38);
      addBeam(0xffffff, 0.035, 0.38);
      game.shake = Math.max(game.shake, 0.5);
    } else if (pet.id === "anvil") {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.52, 0), new THREE.MeshStandardMaterial({ color: 0xa99b86, roughness: 0.9 }));
      rock.position.copy(end).add(new THREE.Vector3(0, 2.5, 0));
      addEffect(game, { object: rock, life: 0.48, maxLife: 0.48, velocity: new THREE.Vector3(0, -5.2, 0), grow: 0.15 });
      spawnRadialImpact(game, enemy.mesh.position, 0xd5c8ae, 0.75);
    } else if (pet.id === "lumen") {
      for (let i = 0; i < 5; i++) {
        const vine = new THREE.Mesh(new THREE.TorusKnotGeometry(0.2 + i * 0.035, 0.025, 28, 5), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xb6ff68 : 0x58c66e, transparent: true, opacity: 0.78 }));
        vine.position.copy(end).add(new THREE.Vector3(0, i * 0.08, 0));
        vine.rotation.x = Math.PI / 2;
        addEffect(game, { object: vine, life: 0.58, maxLife: 0.58, grow: 1.4 });
      }
    } else if (pet.id === "parcel") {
      for (let i = 0; i < 6; i++) {
        const block = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), new THREE.MeshStandardMaterial({ color: i % 2 ? 0x9c78ff : 0x513c82, emissive: 0x20153d, emissiveIntensity: 0.8 }));
        block.position.copy(end).add(new THREE.Vector3((i % 3 - 1) * 0.32, 1.7 + Math.floor(i / 3) * 0.55, (i % 2 - 0.5) * 0.3));
        addEffect(game, { object: block, life: 0.5, maxLife: 0.5, velocity: new THREE.Vector3(0, -4.1, 0), grow: 0.2 });
      }
    } else if (pet.id === "chroma") {
      for (let i = 0; i < 4; i++) {
        const cage = new THREE.Mesh(new THREE.BoxGeometry(0.8 + i * 0.25, 0.8 + i * 0.25, 0.8 + i * 0.25), new THREE.MeshBasicMaterial({ color: 0x3b8dff, wireframe: true, transparent: true, opacity: 0.72 }));
        cage.position.copy(end);
        cage.rotation.set(i * 0.28, i * 0.42, 0);
        addEffect(game, { object: cage, life: 0.55, maxLife: 0.55, grow: 0.65 });
      }
      enemy.speed *= 0.72;
    } else {
      const voidCore = new THREE.Mesh(new THREE.SphereGeometry(0.65, 18, 12), new THREE.MeshBasicMaterial({ color: 0x09000f, transparent: true, opacity: 0.94 }));
      voidCore.position.copy(end);
      addEffect(game, { object: voidCore, life: 0.62, maxLife: 0.62, grow: 1.7 });
      for (const nearby of game.enemies) {
        if (nearby.mesh.position.distanceTo(enemy.mesh.position) < 5) nearby.mesh.position.lerp(enemy.mesh.position, 0.28);
      }
    }
    for (let i = 0; i < 6; i++) {
      const spark = new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 0), new THREE.MeshBasicMaterial({ color: i === 0 ? 0xffffff : pet.color, transparent: true, opacity: 0.92 }));
      spark.position.copy(end);
      const angle = i / 6 * Math.PI * 2;
      addEffect(game, { object: spark, life: 0.28, maxLife: 0.28, velocity: new THREE.Vector3(Math.cos(angle) * 2.4, 0.5, Math.sin(angle) * 2.4) });
    }
  }

  function spawnFlameFx(game: NonNullable<typeof gameRef.current>, direction: THREE.Vector3) {
    for (let i = 0; i < 9; i++) {
      const ember = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.08 + (i % 3) * 0.035, 0),
        new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffd45e : 0xff5a24, transparent: true, opacity: 0.95 }),
      );
      ember.position.copy(game.player.position).add(new THREE.Vector3((Math.random() - 0.5) * 0.35, 0.45 + Math.random() * 0.25, (Math.random() - 0.5) * 0.35));
      const velocity = direction.clone().multiplyScalar(5.2 + Math.random() * 2.5);
      velocity.x += (Math.random() - 0.5) * 1.5;
      velocity.z += (Math.random() - 0.5) * 1.5;
      velocity.y = 0.25 + Math.random() * 0.6;
      addEffect(game, { object: ember, life: 0.48, maxLife: 0.48, velocity, grow: 0.5 });
    }
  }

  function fireVirusBoomerang(game: NonNullable<typeof gameRef.current>, level: number) {
    const targets = [...game.enemies].sort((a, b) => a.mesh.position.distanceTo(game.player.position) - b.mesh.position.distanceTo(game.player.position)).slice(0, 2 + level);
    if (!targets.length) return;
    const target = targets[0];
    const direction = target.mesh.position.clone().sub(game.player.position).setY(0).normalize();
    const boomerang = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.09, 7, 20, Math.PI * 1.45),
      new THREE.MeshStandardMaterial({ color: 0xdffaff, emissive: 0x37c7ff, emissiveIntensity: 1.8, metalness: 0.72, roughness: 0.25 }),
    );
    boomerang.rotation.x = Math.PI / 2;
    boomerang.position.copy(game.player.position).setY(0.62);
    addEffect(game, { object: boomerang, life: 0.68, maxLife: 0.68, velocity: direction.multiplyScalar(8.2), grow: 0.12 });
    for (const enemy of targets) {
      enemy.hp -= statsRef.current.damage * (0.52 + level * 0.13);
      if (enemy.hp <= 0) killEnemy(game, enemy);
    }
    playSfx("shock");
  }

  function fireShutdownWave(game: NonNullable<typeof gameRef.current>, level: number) {
    if (!game.enemies.length) return;
    const origin = game.player.position.clone();
    const target = [...game.enemies].sort((a, b) => a.mesh.position.distanceTo(origin) - b.mesh.position.distanceTo(origin))[0];
    const direction = target.mesh.position.clone().sub(origin).setY(0).normalize();
    const wave = new THREE.Group();
    for (let i = -3; i <= 3; i++) {
      const rayDirection = direction.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), i * 0.13);
      const ray = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 3.8 + level * 0.35), new THREE.MeshBasicMaterial({ color: i === 0 ? 0xffffff : 0xff5c86, transparent: true, opacity: 0.72 }));
      ray.position.copy(rayDirection).multiplyScalar(1.9 + level * 0.18).setY(0.18);
      ray.rotation.y = Math.atan2(rayDirection.x, rayDirection.z);
      wave.add(ray);
    }
    wave.position.copy(origin);
    addEffect(game, { object: wave, life: 0.46, maxLife: 0.46, grow: 0.42 });
    const range = 5.2 + level * 0.55;
    for (const enemy of [...game.enemies]) {
      const offset = enemy.mesh.position.clone().sub(origin).setY(0);
      if (offset.length() <= range && offset.normalize().dot(direction) > 0.38) {
        enemy.hp -= statsRef.current.damage * (0.7 + level * 0.16);
        enemy.mesh.position.addScaledVector(direction, enemy.boss ? 0.25 : 0.9);
        if (enemy.hp <= 0) killEnemy(game, enemy);
      }
    }
    playSfx("special");
  }

  function spawnStrikeFx(game: NonNullable<typeof gameRef.current>, enemy: Enemy, damage: number) {
    const color = PETS.find((pet) => pet.id === metaRef.current.selectedPet)?.color ?? 0x66e7ff;
    const from = game.player.position.clone().add(new THREE.Vector3(0, 0.58, 0));
    const to = enemy.mesh.position.clone().add(new THREE.Vector3(0, enemy.boss ? 1.25 : 0.5, 0));
    const beam = new THREE.Group();
    const beamVector = to.clone().sub(from);
    const beamLength = beamVector.length();
    const midpoint = from.clone().lerp(to, 0.5);
    for (const [radius, beamColor, opacity] of [[0.032, color, 0.25], [0.012, 0xffffff, 0.82]] as const) {
      const segment = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, beamLength, 6),
        new THREE.MeshBasicMaterial({ color: beamColor, transparent: true, opacity, depthWrite: false }),
      );
      segment.position.copy(midpoint);
      segment.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), beamVector.clone().normalize());
      beam.add(segment);
    }
    beam.renderOrder = 8;
    addEffect(game, { object: beam, life: 0.13, maxLife: 0.13 });

    const impact = new THREE.Mesh(
      new THREE.RingGeometry(0.08, 0.19, 12),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false }),
    );
    impact.rotation.x = -Math.PI / 2;
    impact.position.copy(enemy.mesh.position).setY(0.1);
    addEffect(game, { object: impact, life: 0.24, maxLife: 0.24, grow: enemy.boss ? 8 : 5 });

    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 64;
    const context = canvas.getContext("2d");
    if (context) {
      context.font = "900 34px monospace";
      context.textAlign = "center";
      context.lineWidth = 8;
      context.strokeStyle = "#071018";
      context.strokeText(String(Math.round(damage)), 64, 42);
      context.fillStyle = enemy.boss ? "#ffdf57" : "#f5feff";
      context.fillText(String(Math.round(damage)), 64, 42);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.magFilter = THREE.NearestFilter;
      const number = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false }));
      number.position.copy(enemy.mesh.position).setY(enemy.boss ? 2.5 : 1.15);
      number.scale.set(enemy.boss ? 1.45 : 0.9, enemy.boss ? 0.72 : 0.45, 1);
      number.renderOrder = 10;
      addEffect(game, { object: number, life: 0.58, maxLife: 0.58, velocity: new THREE.Vector3((Math.random() - 0.5) * 0.25, 0.72, 0) });
    }
  }

  function spawnDefeatFx(game: NonNullable<typeof gameRef.current>, enemy: Enemy) {
    const group = new THREE.Group();
    const color = enemy.boss ? 0xff315e : BUG_COLORS[enemy.kind % BUG_COLORS.length];
    for (let i = 0; i < (enemy.boss ? 14 : 6); i++) {
      const spark = new THREE.Mesh(new THREE.OctahedronGeometry(enemy.boss ? 0.13 : 0.07, 0), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 }));
      const angle = (i / (enemy.boss ? 14 : 6)) * Math.PI * 2;
      spark.position.set(Math.cos(angle) * 0.28, 0.24 + (i % 3) * 0.12, Math.sin(angle) * 0.28);
      group.add(spark);
    }
    group.position.copy(enemy.mesh.position);
    addEffect(game, { object: group, life: enemy.boss ? 0.85 : 0.42, maxLife: enemy.boss ? 0.85 : 0.42, grow: enemy.boss ? 4.2 : 2.8 });
  }

  function killEnemy(game: NonNullable<typeof gameRef.current>, enemy: Enemy) {
    const index = game.enemies.indexOf(enemy);
    if (index < 0) return;
    game.enemies.splice(index, 1);
    game.scene.remove(enemy.mesh);
    spawnDefeatFx(game, enemy);
    if (enemy.boss) {
      game.bossesDefeated += 1;
      setCoins((value) => value + 25 + metaRef.current.stage * 3);
      statsRef.current.hp = Math.min(statsRef.current.maxHp, statsRef.current.hp + statsRef.current.maxHp * 0.15);
      statsRef.current.special = Math.min(100, statsRef.current.special + 18);
      if (game.bossesDefeated < BOSS_TIMES.length) {
        game.shake = 1.2;
        syncHud(game);
        return;
      }
      game.running = false;
      for (const survivor of game.enemies) game.scene.remove(survivor.mesh);
      game.enemies = [];
      const before = metaRef.current.bestLevel;
      const achieved = statsRef.current.level;
      if (achieved > before) {
        setBestLevel(achieved);
        setUnlockNotice(PETS.some((pet) => pet.level > before && pet.level <= achieved));
      }
      if (!metaRef.current.hard && metaRef.current.stage < STAGES.length) setHighestStage((value) => Math.max(value, metaRef.current.stage + 1));
      if (!metaRef.current.hard && metaRef.current.stage === STAGES.length) setHardUnlocked(true);
      if (cinematicTimer.current !== null) window.clearTimeout(cinematicTimer.current);
      cinematicTimer.current = null;
      setCinematic(null);
      setTeamSkillName("");
      game.alertFx = 0;
      game.specialFx = 0;
      registerLocalScore(game);
      setScreen("victory");
      return;
    }
    dropOrb(game, enemy);
    statsRef.current.kills += 1;
    if (game.outbreakRemaining > 0) {
      game.outbreakRemaining = Math.max(0, game.outbreakRemaining - 1);
      if (game.outbreakRemaining === 0) {
        statsRef.current.hp = Math.min(statsRef.current.maxHp, statsRef.current.hp + 25);
        spawnPickup(game, enemy.mesh.position);
        if (statsRef.current.helperLevel > 0) summonHelper(game);
        playSfx("level");
      }
    }
    game.combo = game.comboTimer > 0 ? Math.min(99, game.combo + 1) : 1;
    game.comboTimer = 2.2;
    if (!game.specialActive && game.specialCooldown <= 0) statsRef.current.special = clamp(statsRef.current.special + 3.4, 0, 100);
    if (Math.random() < 0.12) setCoins((value) => value + 1);
  }

  function levelUp(game: NonNullable<typeof gameRef.current>) {
    game.running = false;
    const pool = UPGRADE_IDS.filter((id) => (id !== "flame" || metaRef.current.selectedPet === "kiln") && (id !== "helper" || metaRef.current.stage >= 2));
    const options = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
    setChoices(options);
    playSfx("level");
    setScreen("levelup");
    const achieved = statsRef.current.level;
    if (achieved > metaRef.current.bestLevel) setBestLevel(achieved);
    syncHud(game);
  }

  function collectXp(game: NonNullable<typeof gameRef.current>, value: number) {
    const s = statsRef.current;
    s.xp += value;
    if (s.xp >= s.nextXp && !game.specialActive) {
      s.xp -= s.nextXp;
      s.level += 1;
      s.nextXp = Math.floor(12 + s.level * 6.5 + Math.pow(s.level, 1.35));
      levelUp(game);
    }
  }

  function chooseUpgrade(id: UpgradeId) {
    const game = gameRef.current;
    if (!game) return;
    const s = statsRef.current;
    if (id === "power") s.damage *= 1.35;
    if (id === "range") s.range *= 1.22;
    if (id === "orbit") s.weapons = Math.min(7, s.weapons + 1);
    if (id === "flame") s.flameLevel = Math.min(5, s.flameLevel + 1);
    if (id === "pulse") s.pulseLevel = Math.min(5, s.pulseLevel + 1);
    if (id === "chain") s.chainLevel = Math.min(5, s.chainLevel + 1);
    if (id === "boomerang") s.boomerangLevel = Math.min(5, s.boomerangLevel + 1);
    if (id === "shutdown") s.shutdownLevel = Math.min(5, s.shutdownLevel + 1);
    if (id === "helper") { s.helperLevel = Math.min(3, s.helperLevel + 1); summonHelper(game); }
    if (id === "haste") s.attackDelay = Math.max(0.18, s.attackDelay * 0.82);
    if (id === "speed") s.moveSpeed *= 1.12;
    if (id === "magnet") s.magnet *= 1.4;
    if (id === "vitality") { s.maxHp += 25; s.hp = s.maxHp; }
    if (id === "repair") s.hp = Math.min(s.maxHp, s.hp + 40);
    rebuildWeapons(game);
    game.running = true;
    setScreen("playing");
    syncHud(game);
  }

  function deploySpecial() {
    const game = gameRef.current;
    const s = statsRef.current;
    if (!game?.running || s.special < 100 || game.specialActive || game.specialCooldown > 0) return;
    s.special = 0;
    game.specialActive = true;
    game.specialCooldown = 12;
    game.specialFx = 3.4;
    playSfx("special");
    game.shake = 1.8;
    showCinematic("team", 1150);
    const allies: THREE.Group[] = [];
    PETS.forEach((pet, index) => {
      const ally = makePet(pet.id, game.petTextures, 0.66);
      const angle = (index / PETS.length) * Math.PI * 2;
      ally.position.copy(game.player.position).add(new THREE.Vector3(Math.cos(angle) * 3.25, 0, Math.sin(angle) * 3.25));
      resolveObstacleCollisions(ally.position, 0.45, game.obstacles);
      ally.scale.setScalar(0.01);
      game.scene.add(ally);
      allies.push(ally);
      window.setTimeout(() => ally.scale.setScalar(1), 980 + index * 34);
      window.setTimeout(() => {
        if (gameRef.current !== game || !game.running || !ally.parent) return;
        if (game.enemies.length === 0) spawnEnemy(game);
        const target = [...game.enemies].sort((a, b) => a.mesh.position.distanceTo(ally.position) - b.mesh.position.distanceTo(ally.position))[index % Math.min(game.enemies.length, 4)];
        if (!target) return;
        setTeamSkillName(`${pet.name} // ${PET_SKILLS[pet.id].name}`);
        const attackDirection = target.mesh.position.clone().sub(ally.position).setY(0).normalize();
        setPetFacing(ally, attackDirection, true, game.elapsed + index * 0.08);
        const origin = ally.position.clone();
        ally.position.addScaledVector(attackDirection, pet.id === "vector" ? 0.35 : 1.05);
        ally.position.y = pet.id === "anvil" ? 0.08 : 0.32;
        ally.rotation.z = (index % 2 === 0 ? -1 : 1) * (pet.id === "kiln" ? 0.28 : 0.16);
        ally.scale.setScalar(pet.id === "anvil" ? 1.28 : 1.16);
        spawnAllySignature(game, ally.position, target, pet);
        const signaturePower = pet.id === "vector" || pet.id === "kiln" ? 1.9 : pet.id === "anvil" || pet.id === "parcel" ? 1.65 : 1.45;
        target.hp -= target.boss ? target.maxHp * (pet.id === "vector" ? 0.038 : 0.026) : s.damage * signaturePower;
        window.setTimeout(() => { ally.position.copy(origin); ally.rotation.z = 0; ally.scale.setScalar(1); }, 520);
        if (target.hp <= 0) killEnemy(game, target);
      }, 1450 + index * 260);
      window.setTimeout(() => game.scene.remove(ally), 5000);
    });
    window.setTimeout(() => {
      if (gameRef.current !== game || !game.running) return;
      setTeamSkillName("FULL LINK // COMPILE BURST");
      spawnRadialImpact(game, game.player.position, 0x66e7ff, 0.72);
      allies.forEach((ally, index) => {
        const angle = (index / allies.length) * Math.PI * 2;
        ally.position.copy(game.player.position).add(new THREE.Vector3(Math.cos(angle) * 1.5, 0, Math.sin(angle) * 1.5));
      });
      game.shake = 2.3;
      for (const enemy of [...game.enemies]) {
        enemy.hp -= enemy.boss ? enemy.maxHp * 0.22 + 120 : 9999;
        if (enemy.hp <= 0) killEnemy(game, enemy);
      }
      syncHud(game);
      game.specialActive = false;
      window.setTimeout(() => setTeamSkillName(""), 720);
    }, 4050);
    syncHud(game);
  }

  function updateGame(game: NonNullable<typeof gameRef.current>, dt: number) {
    const s = statsRef.current;
    game.elapsed += dt;
    if (!game.enemies.some((enemy) => enemy.boss)) game.routeTime += dt;
    game.spawnTimer -= dt;
    game.attackTimer -= dt;
    game.pulseTimer -= dt;
    game.chainTimer -= dt;
    game.flameTimer -= dt;
    game.boomerangTimer -= dt;
    game.shutdownTimer -= dt;
    game.helperTimer = Math.max(0, game.helperTimer - dt);
    game.helperAttackTimer -= dt;
    game.spawnGrace = Math.max(0, game.spawnGrace - dt);
    game.comboTimer = Math.max(0, game.comboTimer - dt);
    if (game.comboTimer <= 0) game.combo = 0;
    game.specialCooldown = Math.max(0, game.specialCooldown - dt);
    game.playerHitFx = Math.max(0, game.playerHitFx - dt);
    game.shake = Math.max(0, game.shake - dt * 2.4);
    const nextBossTime = BOSS_TIMES[game.bossesSpawned];
    if (nextBossTime !== undefined && game.routeTime >= nextBossTime && !game.enemies.some((enemy) => enemy.boss)) spawnBoss(game);
    if (!game.outbreakTriggered && game.routeTime >= OUTBREAK_TIME && game.bossesDefeated >= 1) {
      game.outbreakTriggered = true;
      game.outbreakRemaining = 24 + Math.min(16, metaRef.current.stage * 2);
      game.spawnTimer = 0;
      game.alertFx = 1.3;
      game.shake = 1.1;
      if (s.helperLevel > 0) summonHelper(game);
      playSfx("boss");
    }
    const { stage, hard } = metaRef.current;
    const earlyRamp = clamp((game.elapsed - 4) / 42, 0, 1);
    const outbreakActive = game.outbreakRemaining > 0;
    const spawnDelay = outbreakActive ? 0.18 : Math.max(hard ? 0.22 : 0.3, (hard ? 0.62 : 0.78) - earlyRamp * 0.28 - stage * 0.006);
    const enemyCap = Math.min(150, 72 + stage * 3 + (hard ? 28 : 0));
    if (game.spawnGrace <= 0 && game.spawnTimer <= 0 && game.enemies.length < enemyCap) {
      spawnEnemy(game);
      if (outbreakActive || (game.elapsed > 34 && Math.random() < 0.22)) spawnEnemy(game);
      if (game.elapsed > 62 && Math.random() < 0.14) spawnEnemy(game);
      game.spawnTimer = spawnDelay;
    }

    const direction = new THREE.Vector3();
    if (game.keys.has("w") || game.keys.has("arrowup")) direction.z -= 1;
    if (game.keys.has("s") || game.keys.has("arrowdown")) direction.z += 1;
    if (game.keys.has("a") || game.keys.has("arrowleft")) direction.x -= 1;
    if (game.keys.has("d") || game.keys.has("arrowright")) direction.x += 1;
    direction.x += joystick.current.x;
    direction.z += joystick.current.y;
    const walking = direction.lengthSq() > 0.02;
    if (walking) {
      direction.normalize();
      const previousPosition = game.player.position.clone();
      game.player.position.addScaledVector(direction, s.moveSpeed * dt);
      resolveObstacleCollisions(game.player.position, 0.64, game.obstacles);
      resolveObstacleCollisions(game.player.position, 0.64, game.obstacles);
      if (positionBlocked(game.player.position, 0.62, game.obstacles)) game.player.position.copy(previousPosition);
      game.player.position.x = clamp(game.player.position.x, -54, 54);
      game.player.position.z = clamp(game.player.position.z, -54, 54);
    }
    setPetFacing(game.player, direction, walking, game.elapsed);
    game.player.position.y = walking ? Math.abs(Math.sin(game.elapsed * 7)) * 0.025 : 0;
    game.weapons.rotation.y += dt * (2.5 / s.attackDelay);

    const playerPos = game.player.position;
    let attackedEnemy = false;
    for (const enemy of [...game.enemies]) {
      if (enemy.boss) {
        enemy.skillCooldown -= dt;
        if (enemy.skillCooldown <= 0) {
          if (enemy.mesh.userData.telegraphing === true) {
            enemy.mesh.userData.telegraphing = false;
            launchBossVirusScatter(game, enemy);
            enemy.skillCooldown = enemy.mega ? 4.2 : 5.5;
          } else {
            enemy.mesh.userData.telegraphing = true;
            telegraphBossSkill(game, enemy);
            enemy.skillCooldown = 0.82;
          }
        }
        if (enemy.mega && enemy.hp <= enemy.maxHp * 0.55 && enemy.mesh.userData.rescueTriggered !== true) {
          enemy.mesh.userData.rescueTriggered = true;
          setTeamSkillName(lang === "ja" ? "RESCUE LINK // 救援到着" : "RESCUE LINK // SUPPORT ARRIVED");
          summonHelper(game, true);
          window.setTimeout(() => setTeamSkillName(""), 1200);
        }
      }
      const delta = playerPos.clone().sub(enemy.mesh.position);
      const distance = Math.max(delta.length(), 0.001);
      delta.divideScalar(distance);
      if (!enemy.boss && enemy.kind === 3) {
        const side = new THREE.Vector3(-delta.z, 0, delta.x).multiplyScalar(Math.sin(game.elapsed * 5 + enemy.mesh.id) * 0.72);
        delta.add(side).normalize();
      }
      if (!enemy.boss && enemy.kind === 6 && game.elapsed > 18 && Math.sin(game.elapsed * 2.4 + enemy.mesh.id) > 0.82) delta.multiplyScalar(1.6);
      if (!enemy.boss && enemy.kind === 8 && game.elapsed > 22) enemy.speed = Math.min(enemy.speed + dt * 0.018, 2.45 * (metaRef.current.hard ? 1.16 : 1));
      enemy.mesh.position.addScaledVector(delta, enemy.speed * dt);
      if (!enemy.boss) {
        for (const other of game.enemies) {
          if (other === enemy || other.boss) continue;
          const separation = enemy.mesh.position.clone().sub(other.mesh.position).setY(0);
          const minimum = (enemy.radius + other.radius) * 0.72;
          const gap = separation.length();
          if (gap > 0.001 && gap < minimum) enemy.mesh.position.addScaledVector(separation.normalize(), (minimum - gap) * 0.055);
        }
      }
      const hitObstacle = resolveObstacleCollisions(enemy.mesh.position, enemy.radius * 0.82, game.obstacles);
      if (hitObstacle) {
        const tangent = new THREE.Vector3(-delta.z, 0, delta.x).multiplyScalar(enemy.mesh.id % 2 === 0 ? 1 : -1);
        enemy.mesh.position.addScaledVector(tangent, enemy.speed * dt * 1.7);
        resolveObstacleCollisions(enemy.mesh.position, enemy.radius * 0.82, game.obstacles);
      }
      enemy.mesh.position.x = clamp(enemy.mesh.position.x, -54, 54);
      enemy.mesh.position.z = clamp(enemy.mesh.position.z, -54, 54);
      const hover = Math.abs(Math.sin(game.elapsed * 4 + enemy.mesh.id));
      enemy.mesh.position.y = enemy.mega ? 0.18 + hover * 0.025 : enemy.boss ? 0.28 + hover * 0.05 : 0.12 + hover * 0.1;
      const bugArt = enemy.mesh.getObjectByName("bug-art") as THREE.Sprite | undefined;
      if (bugArt) {
        const baseSize = bugArt.userData.baseSize as number;
        const maps = bugArt.userData.maps as Record<PetFacing, THREE.Texture>;
        const facing: PetFacing = Math.abs(delta.x) > Math.abs(delta.z) * 0.7 ? (delta.x < 0 ? "left" : "right") : (delta.z < 0 ? "back" : "front");
        if (bugArt.userData.facing !== facing) {
          const material = bugArt.material as THREE.SpriteMaterial;
          material.map = maps[facing];
          material.needsUpdate = true;
          bugArt.userData.facing = facing;
        }
        bugArt.scale.x = baseSize;
        bugArt.scale.y = baseSize * (1 + (enemy.boss ? 0.012 : 0.035) * Math.abs(Math.sin(game.elapsed * 7 + enemy.mesh.id)));
      }
      const bossAura = enemy.mesh.getObjectByName("boss-aura");
      if (bossAura) bossAura.rotation.z += dt * 1.9;
      if (distance < enemy.radius + 0.58 && game.elapsed - enemy.lastHit > 0.9) {
        s.hp -= enemy.boss ? 15 : Math.min(6, 4.5 + stage * 0.08);
        enemy.lastHit = game.elapsed;
        game.playerHitFx = 0.28;
        game.shake = Math.max(game.shake, 0.65);
        spawnPlayerDamageFx(game);
        playSfx("hit");
        if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(enemy.boss ? 80 : 30);
        setDamageFlash(true);
        window.setTimeout(() => setDamageFlash(false), 150);
        if (s.hp <= 0) {
          s.hp = 0;
          game.running = false;
          if (s.level > metaRef.current.bestLevel) setBestLevel(s.level);
          setScreen("gameover");
          syncHud(game);
          return;
        }
      }
      if (game.attackTimer <= 0 && distance < s.range + enemy.radius) {
        attackedEnemy = true;
        enemy.hp -= s.damage;
        spawnStrikeFx(game, enemy, s.damage);
        enemy.mesh.scale.multiplyScalar(1.08);
        window.setTimeout(() => enemy.mesh.scale.multiplyScalar(1 / 1.08), 60);
        if (enemy.hp <= 0) { killEnemy(game, enemy); continue; }
      }
      if (s.weapons > 0) {
        const orbitDistance = Math.min(2.45, 1.12 + s.range * 0.48);
        if (Math.abs(distance - orbitDistance) < enemy.radius + 0.38 && game.elapsed - enemy.lastOrbitHit > 0.42) {
          enemy.lastOrbitHit = game.elapsed;
          enemy.hp -= s.damage * 0.62;
          spawnRadialImpact(game, enemy.mesh.position, 0x66e7ff, 0.16);
          if (enemy.hp <= 0) { killEnemy(game, enemy); continue; }
        }
      }
    }
    if (s.pulseLevel > 0 && game.pulseTimer <= 0) {
      const radius = 4.2 + s.pulseLevel * 0.65;
      const pulseColor = metaRef.current.selectedPet === "tidal" ? 0x32cfff : metaRef.current.selectedPet === "anvil" ? 0xc5b79d : 0x9c78ff;
      spawnRadialImpact(game, playerPos, pulseColor, 0.34 + s.pulseLevel * 0.06);
      playSfx("shock");
      for (const enemy of [...game.enemies]) {
        if (enemy.mesh.position.distanceTo(playerPos) <= radius) {
          enemy.hp -= s.damage * (0.55 + s.pulseLevel * 0.15);
          if (enemy.hp <= 0) killEnemy(game, enemy);
        }
      }
      game.pulseTimer = Math.max(1.5, 3.4 - s.pulseLevel * 0.28);
    }
    if (s.chainLevel > 0 && game.chainTimer <= 0 && game.enemies.length) {
      playSfx("shock");
      const targets = [...game.enemies].sort((a, b) => a.mesh.position.distanceTo(playerPos) - b.mesh.position.distanceTo(playerPos)).slice(0, 2 + s.chainLevel);
      for (const enemy of targets) {
        enemy.hp -= s.damage * 0.72;
        spawnStrikeFx(game, enemy, s.damage * 0.72);
        if (enemy.hp <= 0) killEnemy(game, enemy);
      }
      game.chainTimer = Math.max(1.1, 2.6 - s.chainLevel * 0.2);
    }
    if (s.flameLevel > 0 && game.flameTimer <= 0 && game.enemies.length) {
      const nearest = [...game.enemies].sort((a, b) => a.mesh.position.distanceTo(playerPos) - b.mesh.position.distanceTo(playerPos))[0];
      const flameDirection = nearest.mesh.position.clone().sub(playerPos).setY(0).normalize();
      spawnFlameFx(game, flameDirection);
      playSfx("flame");
      const flameRange = 4.2 + s.flameLevel * 0.55;
      for (const enemy of [...game.enemies]) {
        const offset = enemy.mesh.position.clone().sub(playerPos).setY(0);
        const distance = offset.length();
        if (distance <= flameRange && offset.normalize().dot(flameDirection) > 0.52) {
          enemy.hp -= s.damage * (0.5 + s.flameLevel * 0.18);
          if (enemy.hp <= 0) killEnemy(game, enemy);
        }
      }
      game.flameTimer = Math.max(0.85, 2.35 - s.flameLevel * 0.2);
    }
    if (s.boomerangLevel > 0 && game.boomerangTimer <= 0) {
      fireVirusBoomerang(game, s.boomerangLevel);
      game.boomerangTimer = Math.max(1.2, 3.2 - s.boomerangLevel * 0.32);
    }
    if (s.shutdownLevel > 0 && game.shutdownTimer <= 0) {
      fireShutdownWave(game, s.shutdownLevel);
      game.shutdownTimer = Math.max(2.8, 6.4 - s.shutdownLevel * 0.48);
    }
    const lastHelperAt = typeof game.player.userData.lastHelperAt === "number" ? game.player.userData.lastHelperAt : -999;
    if (s.helperLevel > 0 && s.hp / s.maxHp < 0.35 && game.helperTimer <= 0 && game.elapsed - lastHelperAt > 24) summonHelper(game);
    if (game.helperMesh && game.helperPet) {
      if (game.helperTimer <= 0) {
        game.scene.remove(game.helperMesh);
        game.helperMesh = null;
        game.helperPet = null;
      } else {
        const desired = game.player.position.clone().add(new THREE.Vector3(1.35, 0, 1.05));
        game.helperMesh.position.lerp(desired, Math.min(1, dt * 5.5));
        const target = [...game.enemies].sort((a, b) => a.mesh.position.distanceTo(game.helperMesh!.position) - b.mesh.position.distanceTo(game.helperMesh!.position))[0];
        if (target && game.helperAttackTimer <= 0) {
          const attackDirection = target.mesh.position.clone().sub(game.helperMesh.position).setY(0).normalize();
          setPetFacing(game.helperMesh, attackDirection, true, game.elapsed);
          spawnAllySignature(game, game.helperMesh.position, target, game.helperPet);
          target.hp -= target.boss ? Math.min(42, target.maxHp * 0.035) : s.damage * (0.8 + s.helperLevel * 0.18);
          if (target.hp <= 0) killEnemy(game, target);
          game.helperAttackTimer = Math.max(0.85, 1.65 - s.helperLevel * 0.16);
        }
      }
    }

    const stageTheme = STAGES[metaRef.current.stage - 1].theme;
    if (game.attackTimer <= 0 && !attackedEnemy && (stageTheme === "office" || stageTheme === "kitchen")) {
      const prop = game.obstacles.find((obstacle) => obstacle.active && obstacle.mesh.userData.breakable === true && new THREE.Vector2(obstacle.x - playerPos.x, obstacle.z - playerPos.z).length() < s.range + 1.45);
      if (prop) {
        prop.hp -= s.damage * 1.15;
        spawnRadialImpact(game, prop.mesh.position, stageTheme === "kitchen" ? 0xffb454 : 0x66e7ff, 0.12);
        if (prop.hp <= 0) {
          prop.active = false;
          prop.mesh.visible = false;
          spawnRadialImpact(game, prop.mesh.position, stageTheme === "kitchen" ? 0xff8a24 : 0x66e7ff, 0.48);
          spawnPickup(game, prop.mesh.position);
          setCoins((value) => value + 3);
        }
      }
    }
    if (game.attackTimer <= 0) game.attackTimer = s.attackDelay;

    for (let i = game.orbs.length - 1; i >= 0; i--) {
      const orb = game.orbs[i];
      const delta = playerPos.clone().sub(orb.mesh.position);
      const distance = delta.length();
      orb.mesh.rotation.y += dt * 6;
      orb.mesh.position.y = 0.25 + Math.sin(game.elapsed * 6 + orb.mesh.id) * 0.08;
      if (distance < s.magnet) orb.mesh.position.addScaledVector(delta.normalize(), dt * (4 + (s.magnet - distance) * 2.5));
      if (distance < 0.55) {
        game.scene.remove(orb.mesh);
        game.orbs.splice(i, 1);
        collectXp(game, orb.value);
        if (!game.running) break;
      } else if (game.elapsed - orb.born > 40) {
        game.scene.remove(orb.mesh);
        game.orbs.splice(i, 1);
      }
    }
    for (let i = game.pickups.length - 1; i >= 0; i--) {
      const pickup = game.pickups[i];
      pickup.mesh.rotation.y += dt * 2.8;
      pickup.mesh.position.y = (pickup.mesh.userData.baseY as number) + Math.sin(game.elapsed * 4 + pickup.mesh.id) * 0.08;
      if (pickup.mesh.position.distanceTo(playerPos) < 0.85) {
        collectPickup(game, pickup);
        game.scene.remove(pickup.mesh);
        game.pickups.splice(i, 1);
      } else if (game.elapsed - pickup.born > 24) {
        game.scene.remove(pickup.mesh);
        game.pickups.splice(i, 1);
      }
    }
    for (let i = game.hazards.length - 1; i >= 0; i--) {
      const hazard = game.hazards[i];
      hazard.mesh.position.addScaledVector(hazard.velocity, dt);
      hazard.mesh.rotation.x += dt * 6;
      hazard.mesh.rotation.y += dt * 8;
      const expired = game.elapsed - hazard.born > 5 || Math.abs(hazard.mesh.position.x) > 58 || Math.abs(hazard.mesh.position.z) > 58;
      if (!expired && hazard.mesh.position.distanceTo(playerPos) < 0.68) {
        s.hp = Math.max(0, s.hp - hazard.damage);
        spawnPlayerDamageFx(game);
        setDamageFlash(true);
        window.setTimeout(() => setDamageFlash(false), 150);
        playSfx("hit");
        game.scene.remove(hazard.mesh);
        game.hazards.splice(i, 1);
        if (s.hp <= 0) {
          game.running = false;
          setScreen("gameover");
          syncHud(game);
          return;
        }
      } else if (expired) {
        game.scene.remove(hazard.mesh);
        game.hazards.splice(i, 1);
      }
    }
    for (let i = game.effects.length - 1; i >= 0; i--) {
      const effect = game.effects[i];
      effect.life -= dt;
      if (effect.velocity) effect.object.position.addScaledVector(effect.velocity, dt);
      if (effect.grow) effect.object.scale.multiplyScalar(1 + effect.grow * dt);
      const opacity = clamp(effect.life / effect.maxLife, 0, 1);
      effect.object.traverse((child) => {
        const material = (child as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
        const materials = material ? (Array.isArray(material) ? material : [material]) : [];
        materials.forEach((entry) => {
          if ("opacity" in entry) {
            entry.transparent = true;
            entry.opacity = opacity;
          }
        });
      });
      if (effect.life <= 0) {
        game.scene.remove(effect.object);
        game.effects.splice(i, 1);
      }
    }
    if (game.alertFx > 0) {
      game.alertFx -= dt;
      game.scene.background = new THREE.Color(game.alertFx % 0.16 < 0.08 ? 0x3a040b : 0x090105);
    } else if (game.specialFx > 0) {
      game.specialFx -= dt;
      game.scene.background = new THREE.Color(game.specialFx % 0.18 < 0.09 ? 0x123047 : 0x03080e);
    } else {
      const baseColor = new THREE.Color(STAGES[metaRef.current.stage - 1].color).multiplyScalar(metaRef.current.hard ? 0.042 : 0.029);
      if ((game.scene.background as THREE.Color).getHex() !== baseColor.getHex()) game.scene.background = baseColor;
    }
    if (Math.floor(game.elapsed * 8) % 2 === 0) syncHud(game);
  }

  function moveJoystick(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - (rect.left + rect.width / 2);
    const y = event.clientY - (rect.top + rect.height / 2);
    const length = Math.max(Math.hypot(x, y), 1);
    const max = rect.width * 0.34;
    const scale = Math.min(length, max) / length;
    joystick.current = { x: (x * scale) / max, y: (y * scale) / max, active: true };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function stopJoystick() {
    joystick.current = { x: 0, y: 0, active: false };
  }

  const hpPercent = (hud.hp / hud.maxHp) * 100;
  const xpPercent = (hud.xp / hud.nextXp) * 100;
  const nextBossIndex = Math.min(hud.bossesSpawned, BOSS_TIMES.length - 1);
  const nextBossTime = BOSS_TIMES[nextBossIndex];
  const bossRemaining = nextBossTime - hud.routeTime;
  const bossRoutePercent = clamp((hud.routeTime / STAGE_BOSS_TIME) * 100, 0, 100);
  const activePet = PETS.find((pet) => pet.id === selectedPet) ?? PETS[0];
  const activeStage = STAGES[currentStage - 1];
  const stageLeaderboard = leaderboard.filter((entry) => entry.stage === currentStage && entry.hard === hardMode).sort((a, b) => b.score - a.score || a.time - b.time).slice(0, 3);

  return (
    <main className={`game-shell ${cinematic ? `cinematic-${cinematic}` : ""} ${damageFlash ? "damage-flash" : ""} ${hud.hp / hud.maxHp < 0.3 ? "low-integrity" : ""}`}>
      <div ref={mountRef} className="viewport" aria-label="3D game world" />
      <div className="scanlines" />
      <div className="damage-vignette" />

      <div className="language-tabs" role="group" aria-label="Language">
        <button className="sound-toggle" onClick={() => setSoundOn((value) => !value)} aria-label={soundOn ? "Mute sound" : "Enable sound"}>{soundOn ? "BGM♪" : "BGM×"}</button>
        <button className={lang === "ja" ? "active" : ""} onClick={() => setLang("ja")}>日本語</button>
        <button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>English</button>
      </div>

      {cinematic === "boss" && (
        <section className="boss-breach" role="alert">
          <div className="alarm-stripes" />
          <div className="boss-signal"><i /><span>EMERGENCY CALL</span><i /></div>
          <h2>{t.bossAlertTitle}</h2>
          <p>{t.bossAlertSub}</p>
          <div className="threat-meter"><span /><span /><span /><span /><span /></div>
        </section>
      )}

      {cinematic === "team" && (
        <section className="team-arrival" role="status">
          <div className="team-flare" />
          <div className="team-cutins">
            {PETS.map((pet, index) => (
              <div className="team-cutin" key={pet.id} style={{ "--delay": `${index * 45}ms`, "--pet-color": pet.css } as React.CSSProperties}>
                <b style={{ backgroundPosition: `${pet.atlas[0] * 50}% ${pet.atlas[1] * 50}%` }} />
                <span>{pet.name}</span>
              </div>
            ))}
          </div>
          <div className="team-convergence">{PETS.map((pet, index) => <i key={pet.id} style={{ "--ray": `${index * 40}deg`, "--pet-color": pet.css } as React.CSSProperties} />)}</div>
          <div className="team-impact-word">FULL LINK</div>
          <div className="team-command"><small>PATCH PARADE // SUPPORT LINK 09/09</small><h2>{t.teamAlertTitle}</h2><p>{t.teamAlertSub}</p></div>
        </section>
      )}
      {teamSkillName && screen === "playing" && <div className="team-skill-callout" role="status">{teamSkillName}</div>}

      {stageIntro && screen === "playing" && !cinematic && (
        <section className="stage-intro" aria-live="polite">
          <small>DEPLOYMENT {String(currentStage).padStart(2, "0")}</small>
          <h2>{activeStage.name[lang]}</h2>
          <p>{activeStage.mission[lang]}</p>
          <b>READY // 4 SEC SAFE WINDOW</b>
        </section>
      )}

      {screen === "title" && (
        <section className="title-screen">
          <div className="title-copy">
            <p className="kicker"><span />{t.kicker}</p>
            <h1><span>{t.titleA}</span><strong>{t.titleB}</strong></h1>
            <p className="subtitle">{t.subtitle}</p>
            <div className="selection-label"><span>{t.choose}</span><i /></div>
            <div className="pet-row">
              {PETS.map((pet) => {
                const unlocked = bestLevel >= pet.level;
                return (
                  <button
                    key={pet.id}
                    className={`pet-card ${selectedPet === pet.id ? "selected" : ""} ${!unlocked ? "locked" : ""}`}
                    onClick={() => unlocked && setSelectedPet(pet.id)}
                    disabled={!unlocked}
                    style={{ "--pet-color": pet.css } as React.CSSProperties}
                  >
                    <b
                      className="pet-portrait"
                      style={{ backgroundPosition: `${pet.atlas[0] * 50}% ${pet.atlas[1] * 50}%` }}
                    />
                    <span>{unlocked ? pet.name.toUpperCase() : t.locked(pet.level)}</span>
                  </button>
                );
              })}
            </div>
            <div className="selection-label stage-heading"><span>{t.stages}</span><i /></div>
            <div className="stage-row">
              {STAGES.map((stageConfig, index) => {
                const stage = index + 1;
                const unlocked = stage <= highestStage;
                return <button key={stageConfig.theme} disabled={!unlocked} className={currentStage === stage ? "active" : ""} onClick={() => setCurrentStage(stage)} title={stageConfig.name[lang]}>{String(stage).padStart(2, "0")}</button>;
              })}
              <button className={`hard-toggle ${hardMode ? "active" : ""}`} disabled={!hardUnlocked} onClick={() => setHardMode((value) => !value)}>HARD</button>
            </div>
            <div className="meta-workshop">
              <span>{t.coins} <b>{coins}</b></span>
              <button onClick={() => buyMeta("power")} disabled={coins < (powerRank + 1) * 80 || powerRank >= 10}>⚡ {t.buyPower} +{powerRank} · {(powerRank + 1) * 80}</button>
              <button onClick={() => buyMeta("hp")} disabled={coins < (hpRank + 1) * 80 || hpRank >= 10}>♥ {t.buyHp} +{hpRank} · {(hpRank + 1) * 80}</button>
            </div>
            <div className="local-ranking">
              <label><span>{lang === "ja" ? "端末内ランキング名" : "Local ranking handle"}</span><input value={handleName} maxLength={12} onChange={(event) => setHandleName(normalizeHandle(event.target.value))} aria-label={lang === "ja" ? "ランキング用ハンドルネーム" : "Ranking handle"} /></label>
              <div><b>{lang === "ja" ? `STAGE ${currentStage} 端末内TOP` : `STAGE ${currentStage} LOCAL TOP`}</b>{stageLeaderboard.length ? stageLeaderboard.map((entry, index) => <span key={`${entry.handle}-${entry.at}`}>{index + 1}. {entry.handle} <strong>{entry.score}</strong></span>) : <span>{lang === "ja" ? "まだ記録はありません" : "No local records yet"}</span>}</div>
            </div>
            <button className="start-button" onClick={() => startGame()} disabled={!assetsReady}><span>{assetsReady ? t.start : t.loading}</span><b>{assetsReady ? "→" : "…"}</b></button>
            <p className="controls-hint">{t.controls}</p>
          </div>
          <div className="title-status">
            <span>{hardMode ? t.hard : t.normal} / {activeStage.name[lang]}</span><b>{t.stage} {String(currentStage).padStart(2, "0")}</b><small>{activeStage.mission[lang]}</small><em>{PET_SKILLS[activePet.id].name}</em><small>{PET_SKILLS[activePet.id][lang]}</small>
          </div>
        </section>
      )}

      {(screen === "playing" || screen === "levelup") && (
        <section className="hud" aria-live="polite">
          <div className="hud-top">
            <div className="identity">
              <div
                className="mini-pet"
                style={{ "--pet-color": activePet.css, backgroundPosition: `${activePet.atlas[0] * 50}% ${activePet.atlas[1] * 50}%` } as React.CSSProperties}
              />
              <div><span>{activePet.name.toUpperCase()}</span><b>{t.level} {hud.level}</b></div>
            </div>
            <div className={`boss-clock ${hud.boss ? "danger" : ""}`}>
              <span>{activeStage.mission[lang]}</span>
              <b>{hud.boss ? t.bossLive : hud.outbreakRemaining > 0 ? `${t.outbreak} · ${hud.outbreakRemaining}` : `${t.bossCount(Math.min(2, hud.bossesSpawned + 1))} · ${formatTime(bossRemaining)}`}</b>
              <div className="boss-route"><i style={{ width: `${bossRoutePercent}%` }} /><em className={hud.outbreakRemaining === 0 && hud.routeTime >= OUTBREAK_TIME ? "cleared outbreak-mark" : "outbreak-mark"} style={{ left: `${(OUTBREAK_TIME / STAGE_BOSS_TIME) * 100}%` }}>!</em>{BOSS_TIMES.map((time, index) => <em key={time} className={hud.bossesDefeated > index ? "cleared" : ""} style={{ left: `${(time / STAGE_BOSS_TIME) * 100}%` }}>{index + 1}</em>)}</div>
              {hud.boss && <div className="boss-hp"><i style={{ width: `${clamp((hud.bossHp / hud.bossMaxHp) * 100, 0, 100)}%` }} /></div>}
            </div>
            <div className="kill-count"><span>{t.bugs}</span><b>{String(hud.kills).padStart(4, "0")}</b></div>
          </div>
          <div className="integrity"><span>{t.hp}</span><div><i style={{ width: `${hpPercent}%` }} /></div><b>{Math.ceil(hud.hp)}/{hud.maxHp}</b></div>
          <div className="xp-bar"><i style={{ width: `${xpPercent}%` }} /></div>
          <button className="pause-button" onClick={togglePause} aria-label={t.paused}>Ⅱ</button>
          {hud.combo >= 3 && <div className="combo-counter"><b>{hud.combo}</b><span>{t.combo}</span></div>}
          <button className={`special-button ${hud.special >= 100 && hud.specialCooldown <= 0 ? "ready" : ""}`} onClick={deploySpecial} aria-label={t.special} disabled={hud.specialCooldown > 0}>
            <span className="special-fill" style={{ height: `${hud.special}%` }} />
            <b>⌁</b><small>{t.special}</small><em>{hud.specialCooldown > 0 ? `${Math.ceil(hud.specialCooldown)}s` : `${Math.floor(hud.special)}%`}</em>
          </button>
          {hud.special >= 100 && hud.specialCooldown <= 0 && <div className="special-hint">{t.space}</div>}
          <div
            className="joystick"
            onPointerDown={moveJoystick}
            onPointerMove={(event) => joystick.current.active && moveJoystick(event)}
            onPointerUp={stopJoystick}
            onPointerCancel={stopJoystick}
          ><i style={{ transform: `translate(${joystick.current.x * 28}px, ${joystick.current.y * 28}px)` }} /></div>
        </section>
      )}

      {screen === "levelup" && (
        <section className="modal level-modal">
          <p className="kicker"><span />LEVEL {hud.level}</p>
          <h2>{t.levelUp}</h2>
          <p>{t.levelSub}</p>
          <div className="upgrade-grid">
            {choices.map((id, index) => (
              <button key={id} onClick={() => chooseUpgrade(id)}>
                <em>0{index + 1}</em><strong className={`upgrade-icon icon-${id}`}>{UPGRADE_ICONS[id]}</strong><b>{t.upgrades[id][0]}</b><span>{t.upgrades[id][1]}</span><i>APPLY →</i>
              </button>
            ))}
          </div>
          <button className="reroll-button" onClick={rerollUpgrades} disabled={hud.rerolls <= 0}>↻ {t.reroll} · {hud.rerolls}</button>
        </section>
      )}

      {paused && screen === "playing" && (
        <section className="modal pause-modal" role="dialog" aria-modal="true">
          <p className="kicker"><span />SYSTEM HOLD</p>
          <h2>{t.paused}</h2>
          <p>{activeStage.name[lang]} · {formatTime(hud.elapsed)}</p>
          <button className="start-button" onClick={togglePause}><span>{t.resume}</span><b>▶</b></button>
          <button className="ghost-button" onClick={() => { pausedRef.current = false; setPaused(false); if (gameRef.current) gameRef.current.running = false; setScreen("title"); }}>{t.quit}</button>
        </section>
      )}

      {(screen === "victory" || screen === "gameover") && (
        <section className={`modal result-modal ${screen}`}>
          <div className="result-mark">{screen === "victory" ? "✓" : "×"}</div>
          {unlockNotice && <div className="unlock-notice">{t.newPet}</div>}
          <h2>{screen === "victory" ? t.victory : t.defeated}</h2>
          <p>{screen === "victory" ? t.victorySub : t.defeatedSub}</p>
          <div className="result-stats"><span>LEVEL <b>{hud.level}</b></span><span>{t.bugs} <b>{hud.kills}</b></span><span>TIME <b>{formatTime(hud.elapsed)}</b></span></div>
          <div className="result-actions">
            {screen === "victory" ? (
              <button className="start-button" onClick={proceedAfterVictory}><span>{!hardMode && currentStage === STAGES.length ? t.hardStart : t.nextStage}</span><b>→</b></button>
            ) : (
              <button className="start-button" onClick={() => startGame()}><span>{t.retry}</span><b>↻</b></button>
            )}
            <button className="share-button" onClick={shareResult}>{t.share}</button>
            <button className="ghost-button" onClick={() => setScreen("title")}>{t.back}</button>
          </div>
        </section>
      )}

      {error && <section className="error-overlay"><b>WEBGL ERROR</b><p>{error}</p><small>Please enable hardware acceleration or try another browser.</small></section>}
    </main>
  );
}
