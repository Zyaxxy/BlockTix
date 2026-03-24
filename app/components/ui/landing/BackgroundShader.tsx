"use client";

import { motion } from "framer-motion";

export const BackgroundShader = () => {
    return (
        <div className="absolute inset-0 z-0 overflow-hidden bg-[#05070d]">
            <motion.div
                className="absolute inset-0"
                animate={{ opacity: [1, 0.96, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
                <motion.video
                    className="absolute inset-0 h-full w-full object-cover object-center"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                >
                    <source src="/seamless_loop.mp4" type="video/mp4" />
                </motion.video>
            </motion.div>

            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/70 pointer-events-none" />
            <div className="absolute inset-0 backdrop-blur-[10px] mask-gradient pointer-events-none" />
            <div
                className="absolute inset-0 opacity-5 mix-blend-overlay pointer-events-none"
                style={{ backgroundImage: "url('/noise.svg')" }}
            />
            <motion.div
                className="absolute -left-[40%] top-0 h-full w-[180%] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            />

            <div className="absolute inset-0 bg-black/8 pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(255,255,255,0.08),transparent_48%)]" />

            <div className="cinematic-scanlines absolute inset-0" />
            <div className="cinematic-vignette absolute inset-0" />
        </div>
    );
};

export default BackgroundShader;
