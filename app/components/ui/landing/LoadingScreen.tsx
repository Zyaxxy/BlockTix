"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

type LoadingScreenProps = {
  onComplete: () => void;
};

const WORDS = ["Immersive", "Interactive", "Irreplaceable", "Experiences"];
const COUNTER_DURATION_MS = 2600;

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [wordIndex, setWordIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const onCompleteRef = useRef(onComplete);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didScheduleRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => {
        if (prev >= WORDS.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 650);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let rafId = 0;
    const start = performance.now();

    const update = (now: number) => {
      const elapsed = now - start;
      const next = Math.min((elapsed / COUNTER_DURATION_MS) * 100, 100);
      setProgress(next);

      if (elapsed < COUNTER_DURATION_MS) {
        rafId = requestAnimationFrame(update);
      }
    };

    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    if (progress < 100 || didScheduleRef.current) {
      return;
    }

    didScheduleRef.current = true;
    timeoutRef.current = setTimeout(() => {
      onCompleteRef.current();
    }, 350);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [progress]);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] overflow-hidden bg-[#04070c]"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
    >
      <video
        className="absolute inset-0 h-full w-full scale-105 object-cover object-center blur-lg"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
      >
        <source src="/bg.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-black/55" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(178,223,255,0.22),transparent_46%),radial-gradient(circle_at_84%_76%,rgba(128,154,255,0.18),transparent_52%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(0,0,0,0.52))]" />
      <div className="cinematic-scanlines absolute inset-0" />
      <div className="cinematic-vignette absolute inset-0" />

      <motion.div
        className="absolute top-8 left-7 text-[11px] tracking-[0.28em] text-white/70 md:top-10 md:left-10"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <img src={"./icon.svg"} alt="Icon" />
      </motion.div>

      <div className="absolute inset-0 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.span
            key={wordIndex}
            className="font-display text-4xl italic tracking-tight text-white/80 md:text-6xl"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          >
            {WORDS[wordIndex]}
          </motion.span>
        </AnimatePresence>
      </div>

      <motion.div
        className="absolute right-7 bottom-9 font-display text-6xl tabular-nums italic text-white/90 md:right-10 md:bottom-11 md:text-8xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {Math.round(progress).toString().padStart(3, "0")}
      </motion.div>

      <div className="absolute right-0 bottom-0 left-0 h-[4px] bg-white/20">
        <motion.div
          className="h-full origin-left"
          style={{
            background: "linear-gradient(90deg, #c9ecff 0%, #78b6ff 100%)",
            boxShadow: "0 0 10px rgba(120, 182, 255, 0.5)",
          }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: progress / 100 }}
          transition={{ duration: 0.1, ease: "linear" }}
        />
      </div>
    </motion.div>
  );
}
