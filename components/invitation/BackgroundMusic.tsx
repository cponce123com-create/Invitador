"use client";

import { useEffect, useState } from "react";
import {
  getMusicTrack,
  melodyDurationSeconds,
  parseMelody,
  type MusicNote,
  type MusicTrack,
  type MusicWaveform,
} from "@/lib/music";

/**
 * Volumen del conjunto. Es música de fondo: debe acompañar la lectura, no
 * competir con ella, así que va deliberadamente baja.
 */
const MASTER_VOLUME = 0.16;

/** Volumen del acompañamiento respecto a la melodía. */
const BASS_VOLUME = 0.55;

/** Silencio entre vueltas, en segundos, para que el bucle respire. */
const LOOP_GAP_SECONDS = 1.2;

/** Duración del fundido de entrada, en segundos. */
const FADE_IN_SECONDS = 2;

/** Antelación con la que se programa la vuelta siguiente, en segundos. */
const SCHEDULE_LEAD_SECONDS = 0.4;

/** Clave donde se recuerda si el invitado silenció la música. */
const MUTED_STORAGE_KEY = "invitador:musica-silenciada";

/** Una voz de la pista: la melodía principal o su acompañamiento. */
type TrackVoice = {
  notes: readonly MusicNote[];
  waveform: MusicWaveform;
  gain: number;
};

/** Descompone la pista en voces listas para programar. */
function buildVoices(track: MusicTrack): TrackVoice[] {
  const voices: TrackVoice[] = [
    { notes: parseMelody(track.melody), waveform: track.waveform, gain: 1 },
  ];

  if (track.bass) {
    voices.push({
      notes: parseMelody(track.bass),
      waveform: "triangle",
      gain: BASS_VOLUME,
    });
  }

  return voices;
}

/**
 * Programa una vuelta completa de la pista a partir de `startTime`.
 *
 * Cada nota es su propio oscilador con una envolvente de ataque corto y caída
 * exponencial: sin envolvente, cada nota empieza y termina con un chasquido.
 */
function scheduleVoices(
  context: AudioContext,
  destination: AudioNode,
  voices: readonly TrackVoice[],
  tempo: number,
  startTime: number,
): void {
  const secondsPerBeat = 60 / tempo;

  for (const voice of voices) {
    for (const note of voice.notes) {
      if (note.frequency === null) continue;

      const start = startTime + note.startBeat * secondsPerBeat;
      const duration = note.beats * secondsPerBeat;

      const oscillator = context.createOscillator();
      const envelope = context.createGain();

      oscillator.type = voice.waveform;
      oscillator.frequency.setValueAtTime(note.frequency, start);

      // Las rampas exponenciales exigen valores positivos, de ahí el 0.0001 en
      // lugar de un cero que además nunca llegaría a sonar.
      envelope.gain.setValueAtTime(0.0001, start);
      envelope.gain.exponentialRampToValueAtTime(voice.gain, start + 0.02);
      envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      oscillator.connect(envelope);
      envelope.connect(destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.05);
    }
  }
}

export type BackgroundMusicProps = {
  /** Melodía elegida por el anfitrión. `null` o vacío = sin música. */
  track: string | null;
  /**
   * La invitación ya se abrió. El clic en «Abrir invitación» es el gesto del
   * usuario que los navegadores exigen para permitir el audio, así que la
   * música nunca arranca sola.
   */
  playing: boolean;
};

/**
 * Música de fondo de la invitación, sintetizada con la Web Audio API: no
 * descarga ningún archivo ni añade dependencias. Mientras suena muestra un botón
 * para silenciarla y recuerda la preferencia del invitado.
 */
export function BackgroundMusic({ track, playing }: BackgroundMusicProps) {
  const music = getMusicTrack(track);
  const [muted, setMuted] = useState(false);

  // La preferencia se lee al montar: `localStorage` no existe en el servidor y
  // leerlo durante el render rompería la hidratación.
  useEffect(() => {
    setMuted(window.localStorage.getItem(MUTED_STORAGE_KEY) === "1");
  }, []);

  useEffect(() => {
    if (!music || !playing || muted) return;

    const AudioContextClass = window.AudioContext;
    if (!AudioContextClass) return;

    const context = new AudioContextClass();

    // El fundido de entrada evita que la música aparezca de golpe al abrir.
    const master = context.createGain();
    master.gain.setValueAtTime(0.0001, context.currentTime);
    master.gain.linearRampToValueAtTime(
      MASTER_VOLUME,
      context.currentTime + FADE_IN_SECONDS,
    );
    master.connect(context.destination);

    const voices = buildVoices(music);
    const loopSeconds =
      melodyDurationSeconds(voices[0].notes, music.tempo) + LOOP_GAP_SECONDS;

    let timer = 0;
    let nextStart = context.currentTime + 0.15;

    const scheduleLoop = () => {
      scheduleVoices(context, master, voices, music.tempo, nextStart);
      nextStart += loopSeconds;
      // Se programa la vuelta siguiente un poco antes de que acabe la actual,
      // para que no se note el hueco del temporizador.
      timer = window.setTimeout(
        scheduleLoop,
        (loopSeconds - SCHEDULE_LEAD_SECONDS) * 1000,
      );
    };
    scheduleLoop();

    void context.resume().catch(() => {});

    // Con la pestaña oculta el navegador estrangula los temporizadores y el
    // bucle se cortaría; suspender el contexto lo congela y lo reanuda intacto.
    const onVisibilityChange = () => {
      if (document.hidden) {
        void context.suspend().catch(() => {});
      } else {
        void context.resume().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      // Cerrar el contexto detiene de golpe los osciladores ya programados.
      void context.close().catch(() => {});
    };
  }, [music, playing, muted]);

  const toggleMuted = () => {
    const next = !muted;
    setMuted(next);
    window.localStorage.setItem(MUTED_STORAGE_KEY, next ? "1" : "0");
  };

  // Sin melodía elegida, o antes de abrir la invitación, no hay nada que
  // controlar. Va después de los hooks para no alterar su orden.
  if (!music || !playing) return null;

  return (
    <button
      type="button"
      onClick={toggleMuted}
      aria-pressed={muted}
      aria-label={
        muted ? "Activar la música de fondo" : "Silenciar la música de fondo"
      }
      title={muted ? "Activar la música" : "Silenciar la música"}
      className="fixed bottom-4 right-4 z-[55] grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-white/90 text-lg shadow-lg transition hover:scale-105 hover:bg-white active:scale-95"
    >
      <span aria-hidden>{muted ? "🔇" : "🔊"}</span>
    </button>
  );
}
