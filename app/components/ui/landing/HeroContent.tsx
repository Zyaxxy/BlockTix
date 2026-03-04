"use client";

import { motion } from "motion/react";
import BreathingTicket from "./BreathingTicket";

export default function HeroContent() {
    return (
        <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center px-8">
            {/* Left — Text Column */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="flex flex-col gap-8 text-left"
            >
                <div className="flex flex-col gap-4">
                    <div
                        className="inline-flex items-center self-start px-3 py-1 rounded-full bg-white/5 backdrop-blur-sm relative"
                        style={{ filter: "url(#glass-effect)" }}
                    >
                        <div className="absolute top-0 left-1 right-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full" />
                        <span className="text-white/90 text-xs font-light relative z-10">
                            Tickets That Breathe
                        </span>
                    </div>

                    <h1 className="text-6xl md:text-8xl leading-[0.9] tracking-tighter font-light text-white">
                        <span className="font-medium italic instrument">
                            Immersive. Interactive. Irreplaceable.
                        </span>
                        <br />
                        <span className="font-light tracking-tight text-white">
                            Experiences
                        </span>
                    </h1>
                </div>

                <p className="text-lg font-light text-white/40 leading-relaxed max-w-md">
                    The future of access — experience the next evolution of ownership
                    through a lens of pure light.
                </p>

                {/* CTA Buttons */}
                <div className="flex items-center gap-5 flex-wrap pt-4">
                    <button className="px-10 py-4 rounded-full bg-transparent border border-white/30 text-white font-medium text-sm transition-all duration-200 hover:bg-white/10 hover:border-white/50 cursor-pointer">
                        Know More
                    </button>
                    <button className="px-10 py-4 rounded-full bg-white text-black font-medium text-sm transition-all duration-200 hover:bg-white/90 cursor-pointer">
                        Get Started
                    </button>
                </div>
            </motion.div>

            {/* Right — Breathing Ticket */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                className="flex justify-center items-center relative"
            >
                <div className="absolute w-full h-full bg-indigo-500/10 blur-[100px] rounded-full" />
                <BreathingTicket />
            </motion.div>
        </main>
    );
}