"use client";
import Ballpit from "./components/Ballpit";

export default function Home() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <Ballpit
        count={130}
        gravity={0.5}
        friction={0.965}
        wallBounce={0.5}
        followCursor={false}
        colors={["#3c0fa3", "#00eb85"]}
      />
    </div>
  );
}
