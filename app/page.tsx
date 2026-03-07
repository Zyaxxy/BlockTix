"use client";

import Link from "next/link";
import Ballpit from "./components/ui/landing/Ballpit";
import HeroContent from "./components/ui/landing/HeroContent";
import BackgroundShader from "./components/ui/landing/BackgroundShader";
import { Header } from "./components/ui/landing/Header";
import { Footer } from "./components/ui/landing/Footer";

export default function Home() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black text-white">

      <BackgroundShader />
      <Header />

      {/* <Ballpit
        count={100}
        gravity={0.05}
        friction={0.9975}
        wallBounce={0.95}
        followCursor={false}
        colors={["#3c0fa3", "#00eb85"]}
      /> */}

      <div className="absolute inset-0 z-20 flex items-center justify-center">
        <HeroContent />
      </div>

      <Footer />
    </div>
  );
}