// Melodías sintetizadas para el fondo de la invitación pública.
//
// Módulo "puro": describe las notas y la aritmética de la partitura, pero NO
// toca el DOM ni la Web Audio API (eso vive en
// `components/invitation/BackgroundMusic.tsx`). Mismo criterio que
// `lib/particles.ts` y `lib/backgrounds.ts`: la parte que se puede probar sin
// navegador está aquí.
//
// Las melodías se generan en código, así que no pesan ni un byte y no dependen
// de Cloudinary ni de ningún archivo subido.

/** Tipos de onda de la Web Audio API que usan las melodías. */
export type MusicWaveform = "sine" | "triangle" | "square" | "sawtooth";

export const MUSIC_TRACK_IDS = [
  "CUMPLEANOS",
  "FANFARRIA",
  "CAJITA",
  "FIESTA",
] as const;

export type MusicTrackId = (typeof MUSIC_TRACK_IDS)[number];

/** Un paso de la partitura ya resuelto a frecuencia y tiempos. */
export type MusicNote = {
  /** Frecuencia en Hz, o `null` si el paso es un silencio. */
  frequency: number | null;
  /** Duración en tiempos (1 = negra). */
  beats: number;
  /** Desde cuándo suena, medido en tiempos desde el inicio de la melodía. */
  startBeat: number;
};

export type MusicTrack = {
  id: MusicTrackId;
  /** Nombre que ve el anfitrión en el panel. */
  name: string;
  /** Ayuda corta para elegir la melodía. */
  description: string;
  /** Velocidad de la negra, en pulsos por minuto. */
  tempo: number;
  /** Timbre de la melodía principal. */
  waveform: MusicWaveform;
  /** Melodía principal, en notación compacta (ver `parseMelody`). */
  melody: string;
  /** Acompañamiento de bajo opcional. Debe durar lo mismo que la melodía. */
  bass?: string;
};

/**
 * Melodías disponibles. La primera es la de cumpleaños, que es la que el
 * anfitrión espera encontrar; las demás dan alternativas para eventos donde una
 * canción de cumpleaños no encaja (una boda, un bautizo).
 *
 * «Cumpleaños feliz» es de dominio público: la melodía de «Good Morning to All»
 * nunca tuvo protección válida, así que se puede sintetizar sin licencias.
 */
export const MUSIC_TRACKS: readonly MusicTrack[] = [
  {
    id: "CUMPLEANOS",
    name: "Cumpleaños feliz",
    description: "La melodía clásica de cumpleaños, suave y reconocible.",
    tempo: 120,
    waveform: "triangle",
    // Ocho compases de 3/4 (24 tiempos): las cuatro frases de la canción.
    melody:
      "G4:0.5 G4:0.5 A4:1 G4:1 C5:1 B4:2 " +
      "G4:0.5 G4:0.5 A4:1 G4:1 D5:1 C5:2 " +
      "G4:0.5 G4:0.5 G5:1 E5:1 C5:1 B4:1 A4:1 " +
      "F5:0.5 F5:0.5 E5:1 C5:1 D5:1 C5:2",
    // Un bajo por compás, para que la melodía no suene desnuda.
    bass: "C3:3 G2:3 C3:3 G2:3 F3:3 C3:3 G2:3 C3:3",
  },
  {
    id: "FANFARRIA",
    name: "Fanfarria de fiesta",
    description: "Un arranque brillante, ideal para celebrar el momento.",
    tempo: 132,
    waveform: "square",
    melody:
      "C5:0.5 E5:0.5 G5:0.5 C6:1.5 G5:0.5 C6:1.5 " +
      "C5:0.5 E5:0.5 G5:0.5 C6:0.5 E6:1.5 C6:1.5 -:1",
    bass: "C3:5 G2:3 C3:3",
  },
  {
    id: "CAJITA",
    name: "Cajita musical",
    description: "Un arpegio dulce y tranquilo, como una caja de música.",
    tempo: 96,
    waveform: "sine",
    melody:
      "C5:1 E5:1 G5:1 E5:1 A4:1 C5:1 E5:1 C5:1 " +
      "F4:1 A4:1 C5:1 A4:1 G4:1 B4:1 D5:1 B4:1",
    bass: "C3:4 A2:4 F3:4 G2:4",
  },
  {
    id: "FIESTA",
    name: "Fiesta",
    description: "Un bucle animado y alegre para acompañar la celebración.",
    tempo: 128,
    waveform: "triangle",
    melody:
      "C5:0.5 C5:0.5 E5:0.5 G5:0.5 C6:1 A5:0.5 G5:0.5 E5:1 " +
      "F5:0.5 F5:0.5 A5:0.5 C6:0.5 F6:1 C6:1 G5:1 " +
      "G5:0.5 G5:0.5 B5:0.5 D6:0.5 G6:2 -:1",
    bass: "C3:5 F3:5 G2:5",
  },
];

/** Semitonos desde el Do, para convertir el nombre de la nota a frecuencia. */
const SEMITONE_BY_NAME: Record<string, number> = {
  C: 0,
  "C#": 1,
  D: 2,
  "D#": 3,
  E: 4,
  F: 5,
  "F#": 6,
  G: 7,
  "G#": 8,
  A: 9,
  "A#": 10,
  B: 11,
};

/** Frecuencia de referencia: el La de la cuarta octava son 440 Hz (MIDI 69). */
const CONCERT_A_FREQUENCY = 440;
const CONCERT_A_MIDI = 69;

/**
 * Frecuencia en Hz de una nota escrita como nombre + octava (`C4`, `F#5`, `A3`).
 * Devuelve `null` si el texto no es una nota válida.
 */
export function noteToFrequency(note: string): number | null {
  const match = /^([A-G]#?)(-?\d+)$/.exec(note.trim());
  if (!match) return null;

  const [, name, octave] = match;
  const midi = (Number(octave) + 1) * 12 + SEMITONE_BY_NAME[name];
  return CONCERT_A_FREQUENCY * 2 ** ((midi - CONCERT_A_MIDI) / 12);
}

/**
 * Convierte la notación compacta en pasos de partitura.
 *
 * Cada paso es `NOTA:TIEMPOS` separado por espacios, donde `NOTA` es el nombre
 * con su octava y `TIEMPOS` la duración en negras (`G4:0.5`, `C5:2`). Un guion
 * (`-:1`) es un silencio. Los pasos mal formados se ignoran en vez de lanzar:
 * una melodía rota nunca debe tumbar la invitación.
 */
export function parseMelody(notation: string): MusicNote[] {
  const notes: MusicNote[] = [];
  let startBeat = 0;

  for (const step of notation.trim().split(/\s+/)) {
    if (!step) continue;

    const separator = step.lastIndexOf(":");
    if (separator <= 0) continue;

    const name = step.slice(0, separator);
    const beats = Number(step.slice(separator + 1));
    if (!Number.isFinite(beats) || beats <= 0) continue;

    notes.push({
      frequency: name === "-" ? null : noteToFrequency(name),
      beats,
      startBeat,
    });
    startBeat += beats;
  }

  return notes;
}

/** Duración total de la melodía, en tiempos (negras). */
export function melodyBeats(notes: readonly MusicNote[]): number {
  const last = notes[notes.length - 1];
  return last ? last.startBeat + last.beats : 0;
}

/** Duración total de la melodía, en segundos, según el tempo de la pista. */
export function melodyDurationSeconds(
  notes: readonly MusicNote[],
  tempo: number,
): number {
  if (!Number.isFinite(tempo) || tempo <= 0) return 0;
  return (melodyBeats(notes) * 60) / tempo;
}

/** ¿El valor es una melodía conocida? */
export function isMusicTrackId(value: unknown): value is MusicTrackId {
  return (
    typeof value === "string" &&
    (MUSIC_TRACK_IDS as readonly string[]).includes(value)
  );
}

/**
 * Melodía por id. Acepta `string` a propósito: un id desconocido (dato viejo,
 * campo vacío) devuelve `null` en vez de lanzar.
 */
export function getMusicTrack(id: string | null | undefined): MusicTrack | null {
  if (!isMusicTrackId(id)) return null;
  return MUSIC_TRACKS.find((track) => track.id === id) ?? null;
}
