// Keyboard and mouse: WASD or arrows to move, Shift to sneak, E (hold) to crack the
// vault, 1/2 to pick a tool, Space or a click on a HUD tool to use it, P or Escape
// to pause, Enter or Space to start and restart, M to mute. The game also reads
// clicks on the HUD tool buttons (the renderer reports their boxes through
// window.__heistToolButtons, set every frame).

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_TOOL = 4;
export const ACTION_MUTE = 8;

const MOVE_KEYS = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let toolSelect = null;
  let useTool = false;
  let spacePressed = false;
  let mouseDown = false;

  function onKeyDown(event) {
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Enter' || event.code === 'Space') {
      actions |= ACTION_CONFIRM;
      if (event.code === 'Space') spacePressed = true;
      event.preventDefault();
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      actions |= ACTION_PAUSE;
    } else if (event.code === 'Digit1') {
      toolSelect = 'smoke';
    } else if (event.code === 'Digit2') {
      toolSelect = 'emp';
    } else if (event.code === 'KeyM') {
      actions |= ACTION_MUTE;
    }
    if (MOVE_KEYS[event.code]) event.preventDefault();
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  function onBlur() {
    keys.clear();
  }

  function toolAt(x, y) {
    const buttons = window.__heistToolButtons;
    if (!buttons) return null;
    for (const b of buttons) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.tool;
    }
    return null;
  }

  function onMouseDown(event) {
    mouseDown = true;
    const rect = canvas.getBoundingClientRect();
    const view = window.__heistView;
    let x;
    let y;
    if (view) {
      // Viewport logical space is 1280x784 (HUD bar + field), letterboxed in the window.
      x = (event.clientX - rect.left - view.ox) / view.scale;
      y = (event.clientY - rect.top - view.oy) / view.scale;
    } else {
      x = ((event.clientX - rect.left) / rect.width) * 1280;
      y = ((event.clientY - rect.top) / rect.height) * 784;
    }
    const tool = toolAt(x, y);
    if (tool) {
      toolSelect = tool;
      useTool = true;
    } else {
      actions |= ACTION_CONFIRM;
    }
  }

  function onMouseUp() {
    mouseDown = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  return {
    /** Movement vector for this frame, normalised, plus sneak/crack flags. */
    read() {
      let dx = 0;
      let dy = 0;
      for (const code of keys) {
        const move = MOVE_KEYS[code];
        if (move) {
          dx += move[0];
          dy += move[1];
        }
      }
      return {
        dx,
        dy,
        sneak: keys.has('ShiftLeft') || keys.has('ShiftRight'),
        crack: keys.has('KeyE'),
      };
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    takeTool() {
      const out = { select: toolSelect, use: useTool || spacePressed };
      toolSelect = null;
      useTool = false;
      spacePressed = false;
      return out;
    },
    get mouseDown() {
      return mouseDown;
    },
  };
}
