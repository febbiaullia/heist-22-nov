// Everything the eye sees: the museum floor, the cones, the guards, the cameras,
// the thief, the HUD and the screens. The logical viewport is 1280x784: a 64 px
// HUD bar on top, then the 1280x720 field. The renderer scales that viewport to
// the window, so the game looks the same at any size and the cover screenshot
// (1280x784) holds the whole room plus the alarm meter in one frame.

import { ALARM, CAMERA, FIELD, FONT, GUARD, PALETTE, THIEF } from './config.js';
import { LEVEL } from './level.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_WIN = 3;
export const SCREEN_LOSE = 4;

export const VIEW = { w: 1280, h: 784, fieldY: 64 };

const HUD = { smoke: { x: 892, y: 12, w: 108, h: 40 }, emp: { x: 1008, y: 12, w: 108, h: 40 }, sound: { x: 1124, y: 12, w: 84, h: 40 } };

function alarmColor(alarm) {
  if (alarm >= ALARM.chaseAt) return PALETTE.alarmHigh;
  if (alarm >= 40) return PALETTE.alarmMid;
  return PALETTE.alarmLow;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCone(ctx, x, y, angle, range, halfAngle, fill) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
  }
  window.addEventListener('resize', resize);
  resize();

  function drawFloor() {
    // Parquet checker.
    const tile = 80;
    for (let ty = 0; ty < FIELD.height / tile; ty += 1) {
      for (let tx = 0; tx < FIELD.width / tile; tx += 1) {
        ctx.fillStyle = (tx + ty) % 2 === 0 ? PALETTE.floor : PALETTE.floorDark;
        ctx.fillRect(tx * tile, ty * tile, tile, tile);
      }
    }
    // Carpet runner down the main hall.
    ctx.fillStyle = PALETTE.carpet;
    ctx.fillRect(540, FIELD.wall, 200, FIELD.height - FIELD.wall * 2);
    ctx.fillStyle = PALETTE.carpetEdge;
    ctx.fillRect(540, FIELD.wall, 4, FIELD.height - FIELD.wall * 2);
    ctx.fillRect(736, FIELD.wall, 4, FIELD.height - FIELD.wall * 2);
    // Walls.
    ctx.fillStyle = PALETTE.wallTop;
    ctx.fillRect(0, 0, FIELD.width, FIELD.wall);
    ctx.fillRect(0, FIELD.height - FIELD.wall, FIELD.width, FIELD.wall);
    ctx.fillRect(0, 0, FIELD.wall, FIELD.height);
    ctx.fillRect(FIELD.width - FIELD.wall, 0, FIELD.wall, FIELD.height);
    ctx.fillStyle = PALETTE.goldDim;
    ctx.fillRect(0, FIELD.wall - 3, FIELD.width, 3);
    ctx.fillRect(0, FIELD.height - FIELD.wall, FIELD.width, 3);
    ctx.fillRect(FIELD.wall - 3, 0, 3, FIELD.height);
    ctx.fillRect(FIELD.width - FIELD.wall, 0, 3, FIELD.height);
  }

  function drawObstacle(o) {
    if (o.kind === 'case') {
      ctx.fillStyle = PALETTE.caseFrame;
      ctx.fillRect(o.x - 3, o.y - 3, o.w + 6, o.h + 6);
      ctx.fillStyle = PALETTE.caseGlass;
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(o.x + 6, o.y + 4, o.w - 12, 8);
      if (o.label) {
        ctx.fillStyle = PALETTE.goldDim;
        ctx.font = `600 11px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(o.label.toUpperCase(), o.x + o.w / 2, o.y + o.h / 2 + 8);
      }
    } else if (o.kind === 'crates') {
      ctx.fillStyle = PALETTE.crate;
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.strokeStyle = '#5d4426';
      ctx.lineWidth = 2;
      ctx.strokeRect(o.x + 4, o.y + 4, o.w - 8, o.h - 8);
      ctx.beginPath();
      ctx.moveTo(o.x + 4, o.y + 4);
      ctx.lineTo(o.x + o.w - 4, o.y + o.h - 4);
      ctx.moveTo(o.x + o.w - 4, o.y + 4);
      ctx.lineTo(o.x + 4, o.y + o.h - 4);
      ctx.stroke();
    } else if (o.kind === 'statue') {
      ctx.fillStyle = PALETTE.statue;
      ctx.beginPath();
      ctx.arc(o.x + o.w / 2, o.y + o.h / 2, o.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7c828f';
      ctx.beginPath();
      ctx.arc(o.x + o.w / 2, o.y + o.h / 2 - 4, 12, 0, Math.PI * 2);
      ctx.fill();
    } else if (o.kind === 'bench') {
      ctx.fillStyle = PALETTE.bench;
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.fillStyle = '#6b543a';
      ctx.fillRect(o.x, o.y, o.w, 6);
    } else {
      // column
      ctx.fillStyle = PALETTE.statue;
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.fillStyle = '#7c828f';
      ctx.fillRect(o.x - 4, o.y - 4, o.w + 8, 8);
      ctx.fillRect(o.x - 4, o.y + o.h - 4, o.w + 8, 8);
    }
  }

  function drawVault(state) {
    const v = LEVEL.vault;
    ctx.fillStyle = PALETTE.vault;
    ctx.fillRect(v.x, v.y, v.w, v.h);
    ctx.strokeStyle = state.hasLoot ? PALETTE.vaultGlow : PALETTE.goldDim;
    ctx.lineWidth = 3;
    ctx.strokeRect(v.x + 2, v.y + 2, v.w - 4, v.h - 4);
    // Safe wheel.
    ctx.beginPath();
    ctx.arc(v.x + v.w / 2, v.y + v.h / 2, 13, 0, Math.PI * 2);
    ctx.strokeStyle = state.hasLoot ? PALETTE.vaultGlow : PALETTE.gold;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(v.x + v.w / 2 - 13, v.y + v.h / 2);
    ctx.lineTo(v.x + v.w / 2 + 13, v.y + v.h / 2);
    ctx.moveTo(v.x + v.w / 2, v.y + v.h / 2 - 13);
    ctx.lineTo(v.x + v.w / 2, v.y + v.h / 2 + 13);
    ctx.stroke();
    ctx.fillStyle = state.hasLoot ? PALETTE.vaultGlow : PALETTE.gold;
    ctx.font = `700 13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(state.hasLoot ? 'VAULT — OPEN' : 'VAULT', v.x + v.w / 2, v.y + v.h + 18);
    if (state.crack > 0) {
      const w = 110;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(v.x + v.w / 2 - w / 2, v.y + v.h + 26, w, 10);
      ctx.fillStyle = PALETTE.vaultGlow;
      ctx.fillRect(v.x + v.w / 2 - w / 2, v.y + v.h + 26, w * (state.crack / THIEF.crackTime), 10);
    }
  }

  function drawExit(state) {
    const e = LEVEL.exit;
    ctx.fillStyle = state.hasLoot ? PALETTE.exit : PALETTE.exitDark;
    ctx.fillRect(e.x - 40, FIELD.height - FIELD.wall, 80, FIELD.wall);
    ctx.fillStyle = '#eef1f5';
    ctx.font = `700 13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.hasLoot ? 'EXIT — OPEN' : 'EXIT — LOCKED', e.x, FIELD.height - 12);
    if (!state.hasLoot) {
      // Little padlock drawn above the door.
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, FIELD.height - FIELD.wall - 16, 6, Math.PI, 0);
      ctx.stroke();
      ctx.fillStyle = PALETTE.gold;
      ctx.fillRect(e.x - 8, FIELD.height - FIELD.wall - 16, 16, 12);
    }
  }

  function drawEntry() {
    ctx.fillStyle = PALETTE.exitDark;
    ctx.fillRect(LEVEL.entry.x - 40, FIELD.height - FIELD.wall, 80, FIELD.wall);
    ctx.fillStyle = '#cfe8d8';
    ctx.font = `700 12px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ENTRY', LEVEL.entry.x, FIELD.height - 12);
  }

  function drawGems(state) {
    for (const gem of state.gems) {
      if (gem.taken) continue;
      const pulse = 0.7 + 0.3 * Math.sin(state.time * 4 + gem.x);
      ctx.fillStyle = PALETTE.gem;
      ctx.globalAlpha = pulse;
      ctx.beginPath();
      ctx.moveTo(gem.x, gem.y - 10);
      ctx.lineTo(gem.x + 8, gem.y);
      ctx.lineTo(gem.x, gem.y + 10);
      ctx.lineTo(gem.x - 8, gem.y);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawSmokes(state) {
    for (const s of state.smokes) {
      ctx.fillStyle = PALETTE.smoke;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s.x - 30, s.y + 12, s.r * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s.x + 28, s.y - 14, s.r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawGuards(state) {
    for (const guard of state.guards) {
      const alerted = guard.seesThief || guard.state !== 'patrol';
      drawCone(ctx, guard.x, guard.y, guard.angle, GUARD.range, GUARD.halfAngle, alerted ? PALETTE.coneAlert : PALETTE.cone);
      // Body: navy uniform, direction tick, alert mark.
      ctx.fillStyle = alerted ? PALETTE.guardAlert : PALETTE.guard;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, GUARD.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0d0f14';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#dfe6f2';
      ctx.beginPath();
      ctx.arc(guard.x + Math.cos(guard.angle) * 9, guard.y + Math.sin(guard.angle) * 9, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.text;
      ctx.font = `600 11px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(guard.name.toUpperCase(), guard.x, guard.y - GUARD.radius - 6);
      if (guard.state === 'chase') {
        ctx.fillStyle = PALETTE.guardAlert;
        ctx.font = `700 14px ${FONT}`;
        ctx.fillText('!', guard.x, guard.y - GUARD.radius - 20);
      }
    }
  }

  function drawCameras(state) {
    for (const cam of state.cameras) {
      if (cam.disabledT > 0) {
        ctx.fillStyle = PALETTE.cameraOff;
        ctx.font = `700 11px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('OFFLINE', cam.x, cam.y + 30);
      } else {
        drawCone(ctx, cam.x, cam.y, cam.angle, CAMERA.range, CAMERA.halfAngle, 'rgba(232, 134, 46, 0.20)');
      }
      ctx.fillStyle = cam.disabledT > 0 ? PALETTE.cameraOff : PALETTE.camera;
      ctx.beginPath();
      ctx.arc(cam.x, cam.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0d0f14';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#0d0f14';
      ctx.beginPath();
      ctx.arc(cam.x + Math.cos(cam.angle) * 5, cam.y + Math.sin(cam.angle) * 5, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `600 10px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('CAM', cam.x, cam.y - 14);
    }
  }

  function drawThief(state) {
    const t = state.thief;
    const r = t.sneaking ? THIEF.radius - 3 : THIEF.radius;
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(t.x, t.y + r * 0.8, r, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    // Hooded figure.
    ctx.fillStyle = PALETTE.thief;
    ctx.beginPath();
    ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.thiefDark;
    ctx.beginPath();
    ctx.moveTo(t.x + Math.cos(t.angle) * r, t.y + Math.sin(t.angle) * r);
    ctx.lineTo(t.x + Math.cos(t.angle + 2.4) * r * 0.9, t.y + Math.sin(t.angle + 2.4) * r * 0.9);
    ctx.lineTo(t.x + Math.cos(t.angle - 2.4) * r * 0.9, t.y + Math.sin(t.angle - 2.4) * r * 0.9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f2e6ff';
    ctx.beginPath();
    ctx.arc(t.x + Math.cos(t.angle) * 5, t.y + Math.sin(t.angle) * 5, 3.5, 0, Math.PI * 2);
    ctx.fill();
    if (state.hasLoot) {
      // Loot sack on the back.
      ctx.fillStyle = PALETTE.vaultGlow;
      ctx.beginPath();
      ctx.arc(t.x - Math.cos(t.angle) * (r + 4), t.y - Math.sin(t.angle) * (r + 4), 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawHud(state, ui) {
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(0, 0, VIEW.w, VIEW.fieldY - 8);
    ctx.fillStyle = PALETTE.panelEdge;
    ctx.fillRect(0, VIEW.fieldY - 8, VIEW.w, 2);
    ctx.textBaseline = 'middle';

    // Title + score.
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `700 17px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText('VELVET VAULT', 16, 26);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `600 14px ${FONT}`;
    ctx.fillText(`SCORE ${state.score}`, 16, 46);

    // Alarm meter.
    const ax = 330;
    const aw = 280;
    ctx.fillStyle = state.alarm > 0 || state.guards.some((g) => g.seesThief) || state.cameras.some((c) => c.seesThief) ? PALETTE.alarmHigh : PALETTE.muted;
    ctx.font = `700 13px ${FONT}`;
    ctx.textAlign = 'left';
    const spotted = state.guards.some((g) => g.seesThief) || state.cameras.some((c) => c.seesThief);
    ctx.fillText(spotted ? '⚠ SPOTTED!' : 'ALARM', ax, 20);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    roundRect(ctx, ax, 30, aw, 16, 4);
    ctx.fill();
    ctx.fillStyle = alarmColor(state.alarm);
    if (state.alarm > 0) {
      roundRect(ctx, ax, 30, (aw * state.alarm) / ALARM.max, 16, 4);
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.text;
    ctx.font = `600 13px ${FONT}`;
    ctx.fillText(`${Math.round(state.alarm)}%`, ax + aw + 10, 38);

    // Loot.
    ctx.fillStyle = state.hasLoot ? PALETTE.vaultGlow : PALETTE.muted;
    ctx.font = `700 15px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(state.hasLoot ? '◆ VAULT ✓' : '◆ VAULT', 660, 26);
    ctx.fillStyle = PALETTE.gem;
    ctx.fillText(`◆ ${state.gemsGot}/3`, 660, 46);

    // Tool buttons (clickable; input.js reads these boxes).
    const buttons = [
      { ...HUD.smoke, tool: 'smoke', label: `SMOKE ×${state.tools.smoke}` },
      { ...HUD.emp, tool: 'emp', label: `EMP ×${state.tools.emp}` },
    ];
    for (const b of buttons) {
      const selected = state.tools.selected === b.tool;
      const empty = (b.tool === 'smoke' ? state.tools.smoke : state.tools.emp) === 0;
      ctx.fillStyle = selected ? '#3a2f10' : 'rgba(255,255,255,0.08)';
      roundRect(ctx, b.x, b.y, b.w, b.h, 6);
      ctx.fill();
      ctx.strokeStyle = selected ? PALETTE.gold : PALETTE.panelEdge;
      ctx.lineWidth = selected ? 2 : 1;
      roundRect(ctx, b.x, b.y, b.w, b.h, 6);
      ctx.stroke();
      ctx.fillStyle = empty ? PALETTE.muted : PALETTE.text;
      ctx.font = `700 12px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1);
    }
    window.__heistToolButtons = [
      ...buttons.map((b) => ({ x: b.x, y: b.y, w: b.w, h: b.h, tool: b.tool })),
      { x: HUD.sound.x, y: HUD.sound.y, w: HUD.sound.w, h: HUD.sound.h, tool: 'sound' },
    ];

    // Sound button.
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(ctx, HUD.sound.x, HUD.sound.y, HUD.sound.w, HUD.sound.h, 6);
    ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 1;
    roundRect(ctx, HUD.sound.x, HUD.sound.y, HUD.sound.w, HUD.sound.h, 6);
    ctx.stroke();
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 12px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(ui.muted ? 'MUTE ✕' : 'SOUND ♪', HUD.sound.x + HUD.sound.w / 2, HUD.sound.y + HUD.sound.h / 2 + 1);

    // Time.
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 13px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.floor(state.time / 60)}:${String(Math.floor(state.time % 60)).padStart(2, '0')}`, VIEW.w - 16, 26);
    ctx.fillText(`BEST ${ui.best}`, VIEW.w - 16, 46);
  }

  function drawHint(state) {
    if (!state.hint) return;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    const w = ctx.measureText(state.hint).width + 28;
    roundRect(ctx, (FIELD.width - w) / 2, FIELD.height - 58, w, 26, 6);
    ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.font = `600 14px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.hint, FIELD.width / 2, FIELD.height - 45);
  }

  function overlay(title, lines, accent) {
    ctx.fillStyle = 'rgba(8, 9, 13, 0.72)';
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    ctx.fillStyle = accent;
    ctx.font = `700 44px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(title, VIEW.w / 2, 250);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `400 17px ${FONT}`;
    let y = 300;
    for (const line of lines) {
      ctx.fillText(line, VIEW.w / 2, y);
      y += 30;
    }
  }

  function draw(state, screen, ui) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = canvas.width / dpr;
    const ch = canvas.height / dpr;
    const scale = Math.min(cw / VIEW.w, ch / VIEW.h);
    const ox = (cw - VIEW.w * scale) / 2;
    const oy = (ch - VIEW.h * scale) / 2;
    window.__heistView = { scale, ox, oy, dpr, cw, ch };
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, cw, ch);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);

    drawHud(state, ui);
    ctx.save();
    ctx.translate(0, VIEW.fieldY);
    drawFloor();
    drawExit(state);
    drawEntry();
    for (const o of LEVEL.obstacles) drawObstacle(o);
    drawVault(state);
    drawGems(state);
    drawSmokes(state);
    drawCameras(state);
    drawGuards(state);
    drawThief(state);
    drawHint(state);
    ctx.restore();

    if (screen === SCREEN_TITLE) {
      overlay('VELVET VAULT', [
        'Midnight at the museum. The Star of Mumbai waits in the vault —',
        'past three guards, two cameras and one very loud alarm.',
        '',
        'Move WASD / arrows · Sneak Shift · Hold E to crack the vault',
        '1 / 2 pick a tool · Space or click to use it · P pause · M mute',
        '',
        'Grab the loot, then slip out the green EXIT door. Stay out of the cones.',
        '',
        'Press Enter or click to start.',
      ], PALETTE.gold);
    } else if (screen === SCREEN_PAUSED) {
      overlay('PAUSED', ['Press P or Enter to keep sneaking.'], PALETTE.text);
    } else if (screen === SCREEN_WIN) {
      const timeBonus = Math.max(0, Math.round(300 - state.time * 2));
      overlay('CLEAN GETAWAY!', [
        `Vault 500  ·  Gems ${state.gemsGot * 100}  ·  Time bonus ${timeBonus}  ·  Tools −${state.toolsUsed * 25}`,
        `Score ${state.score}   ·   Best ${Math.max(ui.best, state.score)}`,
        '',
        'Press Enter to plan the next heist.',
      ], PALETTE.exit);
    } else if (screen === SCREEN_LOSE) {
      overlay(state.loseKind === 'caught' ? 'CAUGHT!' : 'BUSTED!', [
        state.loseKind === 'caught'
          ? 'A guard grabbed you by the collar. The cones were telling the truth.'
          : 'The alarm hit 100%. Every guard in the museum is on you now.',
        `Score ${state.score}   ·   Best ${ui.best}`,
        '',
        'Press Enter to try again — quieter this time.',
      ], PALETTE.alarmHigh);
    }
  }

  return { draw };
}
