export const initAudio = () => {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  
  // Singleton pattern for AudioContext
  if (!(window as any).__audioCtx) {
    (window as any).__audioCtx = new AudioContextClass();
  }
  const ctx = (window as any).__audioCtx as AudioContext;
  
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  return ctx;
};

// Shakers / Maraca sound for swapping tiles
export const playSwapSound = () => {
  const ctx = initAudio();
  if (!ctx) return;
  
  const bufferSize = ctx.sampleRate * 0.1; // 100ms
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 6000;
  filter.Q.value = 1;
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
  
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  
  noise.start(ctx.currentTime);
};

// Acoustic Guitar strum / Trumpet burst for matches
export const playMatchSound = (combo: number = 1) => {
  const ctx = initAudio();
  if (!ctx) return;
  
  // Base frequencies for a festive, mariachi-inspired C Major pentatonic scale / chords
  // We'll jump the root note based on the combo
  const scale = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; // C5, E5, G5, C6, E6, G6
  const index = Math.min(combo - 1, scale.length - 2);
  const baseFreq = scale[index];
  
  // Play a quick "trumpet-like" brassy interval
  const playBrass = (freq: number, delay: number, dur: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // Sawtooth gives a brassy timbre, especially when filtered
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    // Slight vibrato/bend
    osc.frequency.linearRampToValueAtTime(freq * 1.01, ctx.currentTime + delay + dur / 2);
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 3, ctx.currentTime + delay);
    filter.frequency.exponentialRampToValueAtTime(freq, ctx.currentTime + delay + dur);

    gain.gain.setValueAtTime(0, ctx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + delay + 0.02); // quick attack
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + dur);
  };

  if (combo === 1) {
    // Simple, bright match
    playBrass(baseFreq, 0, 0.2);
    playBrass(baseFreq * 1.25, 0.05, 0.2); // Major 3rd
  } else {
    // Enthusiastic ascending phrase for combos
    playBrass(baseFreq, 0, 0.15);
    playBrass(baseFreq * 1.25, 0.08, 0.15); 
    playBrass(baseFreq * 1.5, 0.16, 0.3); 
    
    if (combo >= 3) {
      // Add a celebratory high note!
      playBrass(baseFreq * 2, 0.3, 0.4); 
    }
  }
};

// Dull thud for invalid swaps
export const playErrorSound = () => {
    const ctx = initAudio();
    if (!ctx) return;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.15);
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
};
