"use client";

import Link from "next/link";
import Ballpit from "./components/Ballpit";
import HeroContent from "./components/ui/HeroContent";

export default function Home() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black text-white">

      <Ballpit
        count={100}
        gravity={0.05}
        friction={0.9975}
        wallBounce={0.95}
        followCursor={false}
        colors={["#3c0fa3", "#00eb85"]}
      />

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <HeroContent />
      </div>
    </div>
  );
}