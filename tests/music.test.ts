import { describe, expect, it } from "vitest";
import {
  getMusicTrack,
  isMusicTrackId,
  melodyBeats,
  melodyDurationSeconds,
  MUSIC_TRACK_IDS,
  MUSIC_TRACKS,
  noteToFrequency,
  parseMelody,
} from "@/lib/music";

/** Pasos de la notación compacta, tal cual los escribe `lib/music.ts`. */
const notationSteps = (notation: string) =>
  notation.trim().split(/\s+/).filter(Boolean);

describe("noteToFrequency", () => {
  it("afina el La central a 440 Hz", () => {
    expect(noteToFrequency("A4")).toBe(440);
  });

  it("respeta las octavas", () => {
    expect(noteToFrequency("A3")).toBeCloseTo(220, 6);
    expect(noteToFrequency("A5")).toBeCloseTo(880, 6);
  });

  it("calcula los semitonos con temperamento igual", () => {
    expect(noteToFrequency("C4")).toBeCloseTo(261.6256, 3);
    expect(noteToFrequency("C5")).toBeCloseTo(523.2511, 3);
    expect(noteToFrequency("F#4")).toBeCloseTo(369.9944, 3);
    expect(noteToFrequency("G2")).toBeCloseTo(97.9989, 3);
    expect(noteToFrequency("D#3")).toBeCloseTo(155.5635, 3);
  });

  it("devuelve null para textos que no son notas", () => {
    // El sostenido es la única alteración aceptada; los bemoles se escriben
    // como su sostenido equivalente (Eb → D#).
    expect(noteToFrequency("H4")).toBeNull();
    expect(noteToFrequency("C")).toBeNull();
    expect(noteToFrequency("4")).toBeNull();
    expect(noteToFrequency("")).toBeNull();
    expect(noteToFrequency("C4b")).toBeNull();
    expect(noteToFrequency("Eb3")).toBeNull();
  });
});

describe("parseMelody", () => {
  it("acumula los tiempos de cada paso", () => {
    const notes = parseMelody("C4:1 D4:2");

    expect(notes).toHaveLength(2);
    expect(notes[0]?.frequency).toBeCloseTo(261.6256, 3);
    expect(notes[0]?.beats).toBe(1);
    expect(notes[0]?.startBeat).toBe(0);
    expect(notes[1]?.frequency).toBeCloseTo(293.6648, 3);
    expect(notes[1]?.beats).toBe(2);
    expect(notes[1]?.startBeat).toBe(1);
  });

  it("traduce el guion a un silencio", () => {
    const notes = parseMelody("-:1 C4:1");

    expect(notes).toHaveLength(2);
    expect(notes[0]).toEqual({ frequency: null, beats: 1, startBeat: 0 });
    expect(notes[1]?.startBeat).toBe(1);
  });

  it("ignora los pasos mal formados en vez de lanzar", () => {
    expect(parseMelody("C4 D4:x E4:0 F4:-1 G4:1")).toEqual([
      { frequency: noteToFrequency("G4"), beats: 1, startBeat: 0 },
    ]);
  });

  it("devuelve una lista vacía con una notación vacía", () => {
    expect(parseMelody("")).toEqual([]);
    expect(parseMelody("   ")).toEqual([]);
  });
});

describe("melodyBeats", () => {
  it("suma la duración de todos los pasos", () => {
    expect(melodyBeats(parseMelody("C4:0.5 D4:0.5 E4:1"))).toBe(2);
  });

  it("devuelve 0 sin pasos", () => {
    expect(melodyBeats([])).toBe(0);
  });
});

describe("melodyDurationSeconds", () => {
  it("convierte tiempos a segundos según el tempo", () => {
    // 4 negras a 120 pulsos por minuto son 2 segundos.
    expect(melodyDurationSeconds(parseMelody("C4:4"), 120)).toBeCloseTo(2, 6);
  });

  it("devuelve 0 con un tempo inválido", () => {
    expect(melodyDurationSeconds(parseMelody("C4:4"), 0)).toBe(0);
    expect(melodyDurationSeconds(parseMelody("C4:4"), Number.NaN)).toBe(0);
  });
});

describe("isMusicTrackId", () => {
  it("reconoce las melodías conocidas", () => {
    for (const id of MUSIC_TRACK_IDS) {
      expect(isMusicTrackId(id)).toBe(true);
    }
  });

  it("rechaza cualquier otro valor", () => {
    expect(isMusicTrackId("")).toBe(false);
    expect(isMusicTrackId("SILENCIO")).toBe(false);
    expect(isMusicTrackId(null)).toBe(false);
    expect(isMusicTrackId(undefined)).toBe(false);
    expect(isMusicTrackId(3)).toBe(false);
  });
});

describe("getMusicTrack", () => {
  it("devuelve la melodía pedida", () => {
    expect(getMusicTrack("CUMPLEANOS")?.name).toBe("Cumpleaños feliz");
  });

  it("devuelve null con un id desconocido o vacío", () => {
    // Es lo que llega cuando el anfitrión elige «Sin música» (cadena vacía) o
    // cuando la base guarda el id de una melodía ya retirada.
    expect(getMusicTrack("")).toBeNull();
    expect(getMusicTrack(null)).toBeNull();
    expect(getMusicTrack("NO_EXISTE")).toBeNull();
  });
});

describe("catálogo de melodías", () => {
  it("no repite identificadores", () => {
    expect(new Set(MUSIC_TRACK_IDS).size).toBe(MUSIC_TRACK_IDS.length);
    expect(MUSIC_TRACKS.map((track) => track.id)).toEqual([...MUSIC_TRACK_IDS]);
  });

  for (const track of MUSIC_TRACKS) {
    it(`la pista ${track.id} está bien formada`, () => {
      expect(track.name.trim()).not.toBe("");
      expect(track.description.trim()).not.toBe("");
      expect(track.tempo).toBeGreaterThan(0);

      const melody = parseMelody(track.melody);
      const steps = notationSteps(track.melody);

      // Ni un paso se pierde: un nombre de nota mal escrito se saltaría y la
      // melodía sonaría con un hueco.
      expect(melody).toHaveLength(steps.length);

      // Los únicos pasos sin frecuencia deben ser los silencios escritos con
      // guion; cualquier otro `null` sería una nota inválida.
      expect(melody.filter((note) => note.frequency === null)).toHaveLength(
        steps.filter((step) => step.startsWith("-")).length,
      );

      expect(melody.some((note) => note.frequency !== null)).toBe(true);
      expect(melodyDurationSeconds(melody, track.tempo)).toBeGreaterThan(0);
    });

    it(`el acompañamiento de ${track.id} dura lo mismo que la melodía`, () => {
      if (!track.bass) return;

      // Si el bajo se quedara corto, la vuelta terminaría sin armonía; si se
      // pasara, se solaparía con la vuelta siguiente.
      expect(melodyBeats(parseMelody(track.bass))).toBeCloseTo(
        melodyBeats(parseMelody(track.melody)),
        6,
      );
    });
  }
});
