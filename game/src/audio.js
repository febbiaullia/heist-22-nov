// Synthesised sound only — no audio files. A tiny WebAudio helper: short oscillator
// blips for pickups and tools, a rising alarm tick whose rate follows the alarm
// meter, a low sting for getting caught, and a little arpeggio for the getaway.
// Audio starts on the first user gesture; M or the mute button silences it.

export function createAudio() {
  let ctx = null;
  let muted = false;
  let tickT = 0;

  function ensure() {
    if (!ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) ctx = new AC();
      } catch {
        ctx = null;
      }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function blip(freq, seconds, type, gainValue, when = 0) {
    const c = ensure();
    if (!c || muted) return;
    const t0 = c.currentTime + when;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(gainValue, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.02);
  }

  return {
    unlock() {
      ensure();
    },
    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    pickup() {
      blip(880, 0.12, 'sine', 0.12);
      blip(1318, 0.16, 'sine', 0.1, 0.07);
    },
    crack() {
      blip(520, 0.07, 'square', 0.06);
    },
    tool() {
      blip(340, 0.18, 'triangle', 0.12);
      blip(220, 0.22, 'triangle', 0.1, 0.08);
    },
    spotted() {
      blip(196, 0.25, 'sawtooth', 0.1);
      blip(147, 0.3, 'sawtooth', 0.1, 0.12);
    },
    caught() {
      blip(110, 0.5, 'sawtooth', 0.16);
      blip(82, 0.7, 'sawtooth', 0.16, 0.15);
    },
    win() {
      [523, 659, 784, 1046].forEach((f, i) => blip(f, 0.22, 'sine', 0.12, i * 0.11));
    },
    /** Called every frame with the alarm level; ticks faster as the alarm rises. */
    alarmTick(dt, alarm) {
      if (!ctx || muted || alarm < 25) return;
      tickT -= dt;
      if (tickT > 0) return;
      tickT = alarm > 70 ? 0.35 : 0.7;
      blip(alarm > 70 ? 980 : 740, 0.06, 'square', 0.05);
    },
  };
}
