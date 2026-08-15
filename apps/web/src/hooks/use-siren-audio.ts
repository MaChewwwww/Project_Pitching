"use client";

import * as React from "react";

/** Local-only Web Audio simulation. Remote siren state must never autoplay. */
export function useSirenAudio() {
  const contextRef = React.useRef<AudioContext | null>(null);
  const oscillatorRef = React.useRef<OscillatorNode | null>(null);
  const gainRef = React.useRef<GainNode | null>(null);

  const stop = React.useCallback(() => {
    oscillatorRef.current?.stop();
    oscillatorRef.current?.disconnect();
    gainRef.current?.disconnect();
    oscillatorRef.current = null;
    gainRef.current = null;
  }, []);

  const start = React.useCallback(() => {
    stop();
    const Context =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Context) return;
    const context = contextRef.current ?? new Context();
    contextRef.current = context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(600, context.currentTime);
    oscillator.frequency.linearRampToValueAtTime(1200, context.currentTime + 1);
    oscillator.frequency.linearRampToValueAtTime(600, context.currentTime + 2);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.08);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillatorRef.current = oscillator;
    gainRef.current = gain;
  }, [stop]);

  React.useEffect(() => stop, [stop]);
  return { start, stop };
}
