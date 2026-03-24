"use client";

import { motion } from "framer-motion";

type BlurTextProps = {
  text: string;
  className?: string;
  wordDelay?: number;
  duration?: number;
};

export default function BlurText({
  text,
  className,
  wordDelay = 0.08,
  duration = 0.4,
}: BlurTextProps) {
  const words = text.split(" ");

  return (
    <h1 className={className}>
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          className="inline-block"
          initial={{
            opacity: 0,
            y: 42,
            filter: "blur(10px)",
          }}
          animate={{
            opacity: [0, 0.55, 1],
            y: [42, -4, 0],
            filter: ["blur(10px)", "blur(4px)", "blur(0px)"],
          }}
          transition={{
            delay: index * wordDelay,
            duration,
            ease: "easeOut",
            times: [0, 0.65, 1],
          }}
        >
          {word}
          {index < words.length - 1 ? "\u00A0" : ""}
        </motion.span>
      ))}
    </h1>
  );
}
