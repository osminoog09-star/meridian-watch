// Синтезированный звук (Web Audio): сигналы рации, итоги вызовов, сирена. Без файлов.
export function createAudio() {
  let ac = null, master = null, siren = null, volume = 0.6, muted = false;
  try { const saved = JSON.parse(localStorage.getItem('mercury-dispatch-audio') || '{}'); if (Number.isFinite(saved.volume)) volume = saved.volume; muted = !!saved.muted; } catch {}
  const persist = () => { try { localStorage.setItem('mercury-dispatch-audio', JSON.stringify({volume, muted})); } catch {} };
  function unlock() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC(); master = ac.createGain(); master.gain.value = muted ? 0 : volume; master.connect(ac.destination);
  }
  function tone(freq, at, length, type = 'sine', gain = 0.2, slide = 0) {
    if (!ac) return;
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + at;
    o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + length);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + length);
    o.connect(g).connect(master); o.start(t); o.stop(t + length + 0.05);
  }
  function static_(at, length, gain = 0.05) {
    if (!ac) return;
    const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * length), ac.sampleRate), d = buffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 2200; g.gain.value = gain; src.buffer = buffer; src.connect(f).connect(g).connect(master); src.start(ac.currentTime + at);
  }
  return {
    unlock,
    call(sev) { static_(0, 0.12); if (sev === 3) { tone(880, 0.05, 0.14, 'square', 0.1); tone(660, 0.22, 0.14, 'square', 0.1); tone(880, 0.39, 0.2, 'square', 0.1); } else { tone(740, 0.05, 0.11, 'triangle', 0.16); tone(988, 0.18, 0.16, 'triangle', 0.16); } },
    ack() { static_(0, 0.08, 0.04); tone(520, 0.02, 0.07, 'triangle', 0.1); },
    click() { tone(1200, 0, 0.03, 'sine', 0.05); },
    good() { tone(660, 0, 0.12, 'sine', 0.16); tone(880, 0.1, 0.12, 'sine', 0.16); tone(1320, 0.2, 0.25, 'sine', 0.14); },
    bad() { tone(220, 0, 0.3, 'sawtooth', 0.09, -90); },
    hint() { static_(0, 0.18, 0.025); tone(1800, 0.05, 0.05, 'triangle', 0.035, -600); tone(1500, 0.14, 0.05, 'triangle', 0.03, -500); },
    alert() { tone(980, 0, 0.1, 'square', 0.08); tone(980, 0.16, 0.1, 'square', 0.08); },
    rank() { [523, 659, 784, 1047].forEach((f, k) => tone(f, k * 0.11, 0.3, 'triangle', 0.16)); },
    siren(on) {
      if (!ac) return;
      if (on && !siren) {
        const o = ac.createOscillator(), lfo = ac.createOscillator(), depth = ac.createGain(), g = ac.createGain();
        o.type = 'sawtooth'; o.frequency.value = 760; lfo.frequency.value = 0.45; depth.gain.value = 230; g.gain.value = 0.0001;
        lfo.connect(depth).connect(o.frequency); const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1500;
        o.connect(f).connect(g).connect(master); o.start(); lfo.start(); g.gain.exponentialRampToValueAtTime(0.03, ac.currentTime + 0.4);
        siren = {o, lfo, g};
      } else if (!on && siren) { const s = siren; siren = null; s.g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.4); s.o.stop(ac.currentTime + 0.5); s.lfo.stop(ac.currentTime + 0.5); }
    },
    get volume() { return volume; }, get muted() { return muted; },
    setVolume(v) { volume = Math.max(0, Math.min(1, v)); if (master) master.gain.value = muted ? 0 : volume; persist(); },
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : volume; persist(); return muted; },
  };
}
