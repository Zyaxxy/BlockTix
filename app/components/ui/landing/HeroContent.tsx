"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import BlurText from "./BlurText";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";


function ArrowUpRightIcon({ className = "h-4 w-4" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
            <path
                d="M7 17L17 7M9 7h8v8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function PlayIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
            <path d="M8 6.5c0-0.8 0.9-1.2 1.5-0.8l8.5 5.3c0.6 0.4 0.6 1.2 0 1.6l-8.5 5.3c-0.6 0.4-1.5 0-1.5-0.8V6.5z" />
        </svg>
    );
}

function MenuToggle({ open, onClick }: { open: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={open ? "Close menu" : "Open menu"}
            className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition"
        >
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
                <motion.line x1="4" y1="7" x2="20" y2="7"
                    animate={open ? { x1: 5, y1: 5, x2: 19, y2: 19 } : {}}
                />
                <motion.line x1="4" y1="12" x2="20" y2="12"
                    animate={open ? { opacity: 0 } : {}}
                />
                <motion.line x1="4" y1="17" x2="20" y2="17"
                    animate={open ? { x1: 5, y1: 19, x2: 19, y2: 5 } : {}}
                />
            </svg>
        </button>
    );
}

const NAV_LINKS = ["Overview", "Tickets", "Collectors", "Security", "Launchpad"];
const PARTNERS = ["Solana", "Backpack", "Phantom", "Helius", "Jupiter"] as const;

type Partner = typeof PARTNERS[number];

const partnerColors: Record<Partner, string> = {
  Solana: "text-purple-400",
  Backpack: "text-red-400",
  Phantom: "text-fuchsia-300",
  Helius: "text-orange-400",
  Jupiter: "text-lime-400",
};

export default function HeroContent() {
    const [menuOpen, setMenuOpen] = useState(false);

    // ✅ THIS replaces all modal logic
    const { setShowAuthFlow } = useDynamicContext();

    return (
        <section className="relative isolate min-h-screen w-full overflow-hidden text-[hsl(var(--foreground))]">

            {/* DESKTOP NAV */}
            <header className="hidden md:block fixed top-0 left-0 z-[200] w-full px-10 py-4">
                <nav className="mx-auto flex max-w-[1260px] items-center justify-between">
                    <div className="liquid-glass rounded-pill flex items-center gap-3 px-2 py-1.5">
                        {NAV_LINKS.map((item) => (
                            <a
                                key={item}
                                href="#"
                                onClick={(e) => {
                                    if (item === "Launchpad") {
                                        e.preventDefault();
                                        setShowAuthFlow(true); // ✅ Organizer login
                                    }
                                }}
                                className="text-sm font-medium px-2.5 py-1.5 rounded-full text-white/85 text-shadow-soft transition hover:text-white rounded-pill"
                            >
                                {item}
                            </a>
                        ))}
                    </div>

                    <button
  onClick={() => setShowAuthFlow(true)}
  className="group relative overflow-hidden inline-flex items-center justify-center gap-1.5 rounded-full bg-white px-4 py-3 text-sm font-semibold text-black shadow-[0_8px_22px_rgba(0,0,0,0.22)] cursor-pointer
  before:absolute before:left-0 before:top-0 before:h-0 before:w-1/4 before:bg-gradient-to-b before:from-yellow-300 before:via-yellow-400 before:to-yellow-500 before:duration-500
  after:absolute after:bottom-0 after:right-0 after:h-0 after:w-1/4 after:bg-gradient-to-t after:from-yellow-300 after:via-yellow-400 after:to-yellow-500 after:duration-500
  hover:text-black hover:before:h-full hover:after:h-full"
>
  {/* middle strips */}
  <span className="absolute inset-0 flex items-center justify-center
    before:absolute before:bottom-0 before:left-1/4 before:z-0 before:h-0 before:w-1/4 before:bg-gradient-to-t before:from-yellow-300 before:via-yellow-400 before:to-yellow-500 before:duration-500
    after:absolute after:top-0 after:right-1/4 after:z-0 after:h-0 after:w-1/4 after:bg-gradient-to-b after:from-yellow-300 after:via-yellow-400 after:to-yellow-500 after:duration-500
    group-hover:before:h-full group-hover:after:h-full"
  />

  {/* content */}
  <span className="relative z-10 flex items-center gap-1.5">
    Claim Access
    <ArrowUpRightIcon />
  </span>
</button>
                </nav>
            </header>

            {/* MOBILE NAV */}
            <header className="md:hidden fixed top-0 left-0 z-[200] w-full px-4 pt-4">
                <div className="liquid-glass rounded-pill flex items-center justify-between px-3 py-2">
                    <span className="text-white">SOLTix</span>
                    <MenuToggle open={menuOpen} onClick={() => setMenuOpen(!menuOpen)} />
                </div>
            </header>

            <AnimatePresence>
                {menuOpen && (
                    <motion.div
                        key="mobile-menu"
                        className="md:hidden fixed inset-0 z-[199] flex flex-col justify-between px-5 pb-10 pt-28"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.35 }}
                    >
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/25" />

                        <nav className="relative z-10 flex flex-col gap-2.5 pt-2">
                            {NAV_LINKS.map((item, i) => (
                                <motion.a
                                    key={item}
                                    href="#"
                                    onClick={() => setMenuOpen(false)}
                                    className="liquid-glass-strong text-shadow-soft inline-flex items-center justify-between rounded-full px-5 py-3.5"
                                    initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
                                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                    exit={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                                    transition={{ duration: 0.3, delay: 0.04 + i * 0.055, ease: "easeOut" }}
                                >
                                    <span className="font-display italic text-xl tracking-tight text-white">
                                        {item}
                                    </span>
                                    <ArrowUpRightIcon className="h-4 w-4 text-white/55" />
                                </motion.a>
                            ))}
                        </nav>

                        <motion.div
                            className="relative z-10 flex flex-col items-center gap-3"
                            initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.35, delay: 0.36, ease: "easeOut" }}
                        >
                            <p className="text-xs text-white/45 text-shadow-soft">
                                Discover events with programmable, verifiable tickets.
                            </p>
                            <button
                                onClick={() => setShowAuthFlow(true)}
                                className="liquid-glass-strong text-shadow-soft inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold text-white"
                            >
                                Claim Access
                                <ArrowUpRightIcon />
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            

            {/* HERO CONTENT */}
            <motion.div
                className="relative z-10 flex min-h-screen flex-col items-center justify-center px-5 pb-28 text-center md:px-6 md:pb-20"
                animate={{ opacity: menuOpen ? 0 : 1, pointerEvents: menuOpen ? "none" : "auto" }}
                transition={{ duration: 0.2 }}
            >
                <motion.div
                    className="liquid-glass mt-20 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-white/90 md:mt-16 md:py-2 md:text-sm"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <span className="whitespace-nowrap rounded-full bg-red-500 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-white md:px-3 md:py-1 md:text-xs">
                        Live
                    </span>
                    <span className="whitespace-nowrap font-light text-shadow-soft">
                        On-chain ticketing for modern experiences
                    </span>
                </motion.div>

                <h1
  className="relative z-50 inline-block 
  bg-gradient-to-r from-slate-50 to-gray-500
  bg-clip-text text-transparent mt-6 max-w-xs text-balance font-display text-5xl leading-[0.85] tracking-[-3px] italic drop-shadow-[0_16px_26px_rgba(0,0,0,0.42)] sm:max-w-lg sm:text-6xl md:mt-8 md:max-w-2xl md:text-7xl md:tracking-[-4px] lg:text-[5.5rem]"
>
  Own Your Access Keep It Verifiable
</h1>

                <motion.p
                    className="mt-5 max-w-xs text-shadow-soft text-sm leading-snug font-light text-white/90 drop-shadow-[0_8px_24px_rgba(0,0,0,0.24)] sm:max-w-md md:mt-7 md:max-w-2xl md:text-base md:leading-tight"
                    initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.6, delay: 0.8, ease: "easeOut" }}
                >
                    SOLTix turns every pass into a secure digital collectible, letting organizers launch with confidence and fans hold proof of attendance forever.
                </motion.p>

                <motion.div
                    className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:gap-7 md:mt-8"
                    initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.6, delay: 1.1, ease: "easeOut" }}
                >
                    <button
  onClick={() => setShowAuthFlow(true)}
  className="relative overflow-hidden  text-shadow-soft inline-flex w-full items-center justify-center gap-2 rounded-full mb-8 px-6 py-3 text-sm font-medium text-white sm:w-auto cursor-pointer
  before:absolute before:inset-0 before:z-0 before:w-0
  before:bg-white/70 before:transition-all before:duration-500
  hover:before:w-full hover:text-black"
>
  <span className="relative z-10 flex items-center gap-2 transition-colors duration-300 hover:text-black">
    Enter SOLTix
    <ArrowUpRightIcon />
  </span>
</button>
                    <button
                        type="button"
                        className="text-shadow-soft inline-flex items-center gap-2 mb-8 text-sm font-medium text-white/90 transition hover:text-white"
                    >
                        <PlayIcon />
                        Watch Demo
                    </button>
                </motion.div>
            </motion.div>

            <motion.div
                className="absolute right-0 bottom-0 left-0 z-10 px-5 pb-5 md:px-10 md:pb-7"
                animate={{ opacity: menuOpen ? 0 : 1, pointerEvents: menuOpen ? "none" : "auto" }}
                transition={{ duration: 0.2 }}
            >
                <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 text-center">
                    <span className="liquid-glass whitespace-nowrap rounded-pill text-shadow-soft px-3 py-2 text-[10px] font-medium text-white/80 md:px-4 md:py-2.5 md:text-xs">
                        Built with trusted tools across the Solana ecosystem
                    </span>
                    <div className="h-px w-full bg-gradient-to-r from-white/0 via-white/30 to-white/0" />
                    <div className="text-shadow-soft flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-[1.5rem] leading-none tracking-tight text-white/70 md:gap-x-10 md:text-[2.5rem]">
                        {PARTNERS.map((partner: Partner) => (
  <span
    key={partner}
    className={`font-display italic ${partnerColors[partner]}`}
  >
    {partner}
  </span>
))}
                    </div>
                </div>
            </motion.div>

        </section>
    );
}