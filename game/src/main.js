// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between five screens: title, play, paused, win and lose.
//
// ?shot=cover|play|stealth|getaway stages that scene instead of running the loop,
// paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createWorld, EVENT_CAUGHT, EVENT_BUSTED, EVENT_CRACK, EVENT_LOOT, EVENT_SPOTTED, EVENT_TOOL, EVENT_WIN } from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_LOSE, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld();
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, { muted: true, best: scene.best });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let crackTick = 0;

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Sneak past the guards, crack the vault, slip out the exit.');
  }

  function endGame() {
    const state = world.state;
    if (state.won) {
      screen = SCREEN_WIN;
      audio.win();
      if (state.score > best) {
        best = state.score;
        saveBest(best);
      }
      announce(`Clean getaway. Score ${state.score}. Best ${best}.`);
    } else {
      screen = SCREEN_LOSE;
      audio.caught();
      announce(state.loseKind === 'caught' ? 'Caught by a guard.' : 'Busted. The alarm hit 100 percent.');
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      audio.toggleMute();
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_WIN || screen === SCREEN_LOSE)) {
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step() {
    const move = input.read();
    const tool = input.takeTool();
    if (tool.select === 'sound') {
      audio.toggleMute();
    }
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { dx: 0, dy: 0, sneak: false, crack: false, useTool: false, toolSelect: null }, true);
      return;
    }
    const state = world.state;
    if (tool.select === 'smoke' || tool.select === 'emp') {
      state.tools.selected = tool.select;
    }
    const events = world.step(STEP, {
      dx: move.dx,
      dy: move.dy,
      sneak: move.sneak,
      crack: move.crack,
      useTool: tool.use,
      toolSelect: state.tools.selected,
    }, false);
    if (events & EVENT_LOOT) audio.pickup();
    if (events & EVENT_CRACK) audio.pickup();
    if (events & EVENT_TOOL) audio.tool();
    if (events & EVENT_SPOTTED) audio.spotted();
    if (events & (EVENT_CAUGHT | EVENT_BUSTED | EVENT_WIN)) {
      endGame();
      return;
    }
    if (move.crack && state.crack > 0) {
      crackTick -= STEP;
      if (crackTick <= 0) {
        crackTick = 0.25;
        audio.crack();
      }
    }
    audio.alarmTick(STEP, state.alarm);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, { muted: audio.muted, best });
  }

  // Leaving the tab pauses a running game rather than letting guards close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Velvet Vault. Press Enter or click to start the heist.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
