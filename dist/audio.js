// Recorded, loopable game music with separately synthesized puzzle effects.
const STORAGE = 'pocket-workshop-audio-v1';
const MUSIC_SOURCE = new URL('./calm-piano-loop.mp3', import.meta.url).href;
const MUSIC_VOLUME = 0.35;

export function readAudioSettings(storage) {
  try {
    const value = JSON.parse(storage.getItem(STORAGE) || '{}');
    return { music: value.music !== false, sounds: value.sounds !== false };
  } catch {
    return { music: true, sounds: true };
  }
}

export function createWorkshopAudio() {
  const settings = readAudioSettings(globalThis.localStorage);
  let context;
  let effectsBus;
  let musicPlayer;
  let started = false;

  const frequency = midi => 440 * 2 ** ((midi - 69) / 12);

  function tone(midi, time, length, volume, bus, type = 'sine') {
    if (!context || !bus) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency(midi);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + .025);
    gain.gain.exponentialRampToValueAtTime(.0001, time + length);
    oscillator.connect(gain);
    gain.connect(bus);
    oscillator.start(time);
    oscillator.stop(time + length + .02);
  }

  function music() {
    if (!musicPlayer) {
      musicPlayer = new Audio(MUSIC_SOURCE);
      musicPlayer.loop = true;
      musicPlayer.preload = 'auto';
      musicPlayer.volume = MUSIC_VOLUME;
    }
    if (!settings.music || !started || document.hidden) {
      musicPlayer.pause();
      return;
    }
    musicPlayer.volume = MUSIC_VOLUME;
    const playback = musicPlayer.play();
    playback?.catch(() => {});
  }

  function volumes() {
    if (!context || !effectsBus) return;
    effectsBus.gain.cancelScheduledValues(context.currentTime);
    effectsBus.gain.setTargetAtTime(settings.sounds ? .5 : 0, context.currentTime, .02);
  }

  async function unlock() {
    if (document.hidden) return;
    started = true;
    music();
    try {
      if (!context) {
        const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!AudioContext) return;
        context = new AudioContext();
        effectsBus = context.createGain();
        effectsBus.connect(context.destination);
        volumes();
      }
      if (context.state === 'suspended') await context.resume();
    } catch {
      // Audio is optional; the puzzle remains playable when a browser blocks it.
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(settings));
    } catch {}
  }

  function set(kind, value) {
    if (!['music', 'sounds'].includes(kind)) return;
    settings[kind] = !!value;
    save();
    if (kind === 'music') {
      if (settings.music) void unlock();
      else music();
    } else {
      volumes();
      if (settings.sounds) void unlock();
    }
  }

  function slide(distance = 1) {
    if (!settings.sounds || !context || context.state !== 'running' || document.hidden) return;
    const time = context.currentTime;
    const length = Math.min(.2, .07 + distance * .025);
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * length), context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.value = 850;
    gain.gain.setValueAtTime(.15, time);
    gain.gain.exponentialRampToValueAtTime(.0001, time + length);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(effectsBus);
    source.start(time);
    source.stop(time + length);
    tone(57, time + length * .45, .1, .075, effectsBus);
  }

  function celebrate() {
    if (!settings.sounds || !context || context.state !== 'running' || document.hidden) return;
    [62, 66, 69, 74].forEach((note, index) => tone(note, context.currentTime + index * .12, .8, .09, effectsBus));
  }

  function pause() {
    musicPlayer?.pause();
    if (context?.state === 'running') void context.suspend().catch(() => {});
  }

  document.addEventListener('pointerdown', () => void unlock(), { passive: true });
  document.addEventListener('keydown', () => void unlock());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
    else if (started) void unlock();
  });
  window.addEventListener('pagehide', pause);
  window.addEventListener('pageshow', () => { if (started) void unlock(); });

  return { settings, set, slide, celebrate };
}

