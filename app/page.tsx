"use client";

import Link from "next/link";
import Ballpit from "./components/Ballpit";

export default function Home() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black text-white">
      
      <Ballpit
        count={130}
        gravity={0.5}
        friction={0.965}
        wallBounce={0.5}
        followCursor={false}
        colors={["#3c0fa3", "#00eb85"]}
      />

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          Block-Tix
        </h1>

        <p className="text-zinc-400 mb-8 max-w-md">
          Secure NFT-based ticketing on Solana.
        </p>

        <Link href="/login">
          <button className="px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-500 hover:opacity-90 transition text-lg">
            Get Started
          </button>
        </Link>
      </div>
    </div>
  );
}