import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("serves the game page with production metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.match(response.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
  const html = await response.text();
  assert.match(html, /<title>PromptBreak: Bug Sweepers<\/title>/i);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("contains the requested progression and language features", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /const STAGES = \[/);
  assert.match(page, /PRODUCTION ZERO/);
  assert.match(page, /COOKING LAB/);
  assert.match(page, /CORPORATE OFFICE/);
  assert.match(page, /const BOSS_TIMES = \[28, 72\]/);
  assert.match(page, /const OUTBREAK_TIME = 50/);
  assert.match(page, /const BUG_COLORS = \[/);
  assert.match(page, /hardUnlocked/);
  assert.match(page, /日本語/);
  assert.match(page, /English/);
  assert.match(page, /enemy\.boss/);
  assert.match(page, /setScreen\("victory"\)/);
  for (const pet of ["relay", "tidal", "kiln", "vector", "anvil", "lumen", "parcel", "chroma", "hollow"]) {
    assert.match(page, new RegExp(`id: "${pet}"`));
  }
  assert.match(page, /original-companions-front\.png/);
  assert.match(page, /original-companions-left\.png/);
  assert.match(page, /original-companions-back\.png/);
  assert.match(page, /bug-enemies-atlas\.png/);
  assert.match(page, /bug-enemies-atlas-back\.png/);
  assert.match(page, /courtyard-floor\.png/);
  assert.match(page, /kitchen-floor\.png/);
  assert.match(page, /office-floor\.png/);
  assert.match(page, /PLIERS ORBIT/);
  assert.match(page, /FIREWALL BREATH/);
  assert.match(page, /spawnAllySignature/);
  assert.match(page, /PET_SKILLS/);
  assert.match(page, /TIDAL PATCH/);
  assert.match(page, /FORGE BREATH/);
  assert.match(page, /spawnPickup/);
  assert.match(page, /PickupKind = "bomb" \| "repair" \| "overclock"/);
  assert.match(page, /setStageMusic/);
  assert.match(page, /spawnPlayerDamageFx/);
  assert.doesNotMatch(page, /getEnemyPlateTexture/);
  assert.match(page, /READY \/\/ 4 SEC SAFE WINDOW/);
  assert.match(page, /rerollUpgrades/);
  assert.match(page, /togglePause/);
  assert.match(page, /game\.combo/);
  assert.match(page, /navigator\.vibrate/);
  assert.match(page, /const enemyCap/);
  assert.match(page, /const copier/);
  assert.match(page, /const cake/);
  assert.match(page, /const donut/);
  assert.match(page, /setPetFacing/);
  assert.match(page, /spawnStrikeFx/);
  assert.match(page, /UPGRADE_ICONS/);
  assert.match(page, /resolveObstacleCollisions/);
  assert.match(page, /PlaneGeometry\(116, 116/);
  assert.match(page, /className="team-arrival"/);
  assert.match(page, /className="boss-breach"/);
  assert.match(page, /EMERGENCY CALL/);
  assert.match(page, /x\.com\/intent\/post/);
  assert.match(page, /noopener,noreferrer/);
  assert.match(page, /pulseLevel/);
  assert.match(page, /chainLevel/);
  assert.match(page, /VIRUS REMOVER/);
  assert.match(page, /FORCE QUIT WAVE/);
  assert.match(page, /SUPPORT PING/);
  assert.match(page, /launchBossVirusScatter/);
  assert.match(page, /serpent-segment/);
  assert.match(page, /registerLocalScore/);
});
