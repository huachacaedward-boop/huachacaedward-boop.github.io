// Realistic procedural paper page turn sound generator using Web Audio API

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtxClass) {
      audioCtx = new AudioCtxClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playPageFlipSound(speed: number = 1.0) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = 0.28 / speed;

    // 1. Noise buffer for paper sliding friction
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    // Generate pinkish/brownish textured noise (paper friction)
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 2.8; // boost
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    // Bandpass filter centered on paper rustle frequencies (1200Hz - 3800Hz)
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(1400, now);
    bandpass.frequency.exponentialRampToValueAtTime(3200, now + duration * 0.4);
    bandpass.frequency.exponentialRampToValueAtTime(800, now + duration);
    bandpass.Q.setValueAtTime(1.8, now);

    // Gain envelope for smooth swell and fade
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.18, now + duration * 0.25);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    // 2. Subtle low thump (book binding flexion)
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + duration * 0.5);

    oscGain.gain.setValueAtTime(0.001, now);
    oscGain.gain.linearRampToValueAtTime(0.08, now + 0.03);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.6);

    // Connect graph
    whiteNoise.connect(bandpass);
    bandpass.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    // Trigger
    whiteNoise.start(now);
    osc.start(now);
    whiteNoise.stop(now + duration);
    osc.stop(now + duration * 0.6);
  } catch (err) {
    console.warn('Audio flip error (muted/unsupported):', err);
  }
}
