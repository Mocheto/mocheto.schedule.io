import { writeFileSync } from "node:fs";

// Melodía original de 16 compases en re menor, sintetizada sin muestras externas.
const sampleRate = 22050;
const beat = 60 / 144;
const beats = 64;
const samples = Math.round(sampleRate * beat * beats);
const output = new Int16Array(samples);
const melody = [
  "D5", "A4", "F4", "A4", "C5", "A4", "F4", "E4",
  "D5", "A4", "F4", "A4", "E5", "D5", "C5", "A4",
  "Bb4", "F4", "D4", "F4", "C5", "A4", "F4", "E4",
  "A4", "E4", "C4", "E4", "G4", "E4", "C4", "A3",
];
const bass = ["D3", "D3", "Bb2", "A2", "D3", "D3", "Bb2", "A2"];
const frequencies = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A3: 220, A4: 440, Bb4: 466.16, C5: 523.25, D5: 587.33, E5: 659.25, D3: 146.83, Bb2: 116.54, A2: 110 };
const pulse = (phase, width = 0.5) => (phase % 1 < width ? 1 : -1);
for (let index = 0; index < samples; index += 1) {
  const time = index / sampleRate;
  const beatPosition = time / beat;
  const step = Math.floor(beatPosition * 2);
  const local = beatPosition * 2 - step;
  const measure = Math.floor(beatPosition / 8);
  const lead = frequencies[melody[step % melody.length]];
  const low = frequencies[bass[measure % bass.length]];
  const leadEnvelope = Math.min(1, local * 18) * Math.max(0, 1 - local * 0.88);
  const arpeggio = [low * 2, low * 2.4, low * 3, low * 2.4][Math.floor(beatPosition * 4) % 4];
  const tick = beatPosition % 1;
  const percussion = tick < 0.075 ? (Math.sin(time * 121) * (1 - tick / 0.075)) * 0.06 : 0;
  const value = pulse(time * lead, 0.42) * leadEnvelope * 0.18
    + Math.sin(time * arpeggio * Math.PI * 2) * 0.07
    + pulse(time * low, 0.5) * 0.07
    + percussion;
  output[index] = Math.max(-32768, Math.min(32767, Math.round(value * 32767)));
}
const wav = Buffer.alloc(44 + output.byteLength);
wav.write("RIFF", 0);
wav.writeUInt32LE(wav.length - 8, 4);
wav.write("WAVEfmt ", 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(sampleRate, 24);
wav.writeUInt32LE(sampleRate * 2, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write("data", 36);
wav.writeUInt32LE(output.byteLength, 40);
Buffer.from(output.buffer).copy(wav, 44);
writeFileSync(new URL("../public/assets/music/castillo.wav", import.meta.url), wav);
