"use client";

import React from "react";
import {
    motion,
    useMotionValue,
    useSpring,
    useTransform,
} from "motion/react";
import { Ticket } from "lucide-react";

export const BreathingTicket = () => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseX = useSpring(x, { stiffness: 150, damping: 20 });
    const mouseY = useSpring(y, { stiffness: 150, damping: 20 });

    function onMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
        const { left, top } = currentTarget.getBoundingClientRect();
        x.set(clientX - left);
        y.set(clientY - top);
    }

    return (
        <motion.div
            onMouseMove={onMouseMove}
            className="relative group w-full max-w-md h-64 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl overflow-hidden cursor-none shadow-[0_0_50px_-12px_rgba(255,255,255,0.1)]"
            animate={{
                scale: [1, 1.02, 1],
            }}
            transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
            }}
        >
            {/* Specular Light Follower */}
            <motion.div
                className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                    background: useTransform(
                        [mouseX, mouseY],
                        ([px, py]: number[]) =>
                            `radial-gradient(circle at ${px}px ${py}px, rgba(255,255,255,0.15) 0%, transparent 40%)`
                    ),
                }}
            />

            {/* Content */}
            <div className="relative z-10 p-8 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                        <span className="text-[10px] tracking-[0.4em] uppercase text-white/30 font-light mb-1">
                            SOLTix Genesis
                        </span>
                        <div className="h-[1px] w-12 bg-white/20" />
                    </div>
                    <Ticket className="text-white/20 w-6 h-6" />
                </div>

                <div>
                    <h2 className="text-4xl font-light italic instrument text-white/90 mb-2">
                        VIP ACCESS
                    </h2>
                    <div className="flex items-center gap-4 text-[10px] tracking-[0.2em] text-white/40 uppercase">
                        <span>Row A</span>
                        <span className="w-1 h-1 rounded-full bg-white/20" />
                        <span>Seat 42</span>
                        <span className="w-1 h-1 rounded-full bg-white/20" />
                        <span>{new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
                    </div>
                </div>

                <div className="flex justify-between items-end border-t border-white/5 pt-4">
                    <div className="flex flex-col">
                        <span className="text-[8px] text-white/20 uppercase tracking-widest">
                            Verification Hash
                        </span>
                        <span className="text-[10px] font-mono text-white/40">
                            4a71C...3F2E
                        </span>
                    </div>
                    <div className="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center border border-white/10">
                        <div className="w-8 h-8 border-2 border-white/10 border-dashed rounded-sm" />
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default BreathingTicket;
