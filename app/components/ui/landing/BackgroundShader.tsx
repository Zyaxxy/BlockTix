"use client";

import { motion } from "framer-motion";

export const BackgroundShader = () => {
    return (
        <div className="absolute inset-0 overflow-hidden">
            <video
                className="absolute inset-0 h-full w-full object-cover z-0"
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                poster="/images/hero_bg.jpeg"
            >
                <source src="/bg1.mp4" type="video/mp4" />
            </video>

            <div className="absolute inset-0 bg-black/3 z-0" />

            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/45 pointer-events-none z-10" />
            <div className="absolute inset-0 backdrop-blur-[4px] mask-gradient pointer-events-none z-10" />
            <div
                className="absolute inset-0 opacity-5 mix-blend-overlay pointer-events-none z-10"
                style={{ backgroundImage: "url('/noise.svg')" }}
            />
            <motion.div
                className="absolute -left-[40%] top-0 h-full w-[180%] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none z-10"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            />

            <div className="absolute inset-0 bg-black/4 pointer-events-none z-10" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(255,255,255,0.06),transparent_48%)] pointer-events-none z-10" />
            <div className="cinematic-scanlines absolute inset-0 pointer-events-none z-10" />
            <div className="cinematic-vignette absolute inset-0 pointer-events-none z-10" />
        </div>
    );
};

export default BackgroundShader;
