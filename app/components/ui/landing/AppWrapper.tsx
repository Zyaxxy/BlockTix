"use client";

import { AnimatePresence } from "framer-motion";
import { useState } from "react";
import LoadingScreen from "./LoadingScreen";

type AppWrapperProps = {
  children: React.ReactNode;
};

export default function AppWrapper({ children }: AppWrapperProps) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <>
      <AnimatePresence mode="wait">
        {isLoading ? <LoadingScreen onComplete={() => setIsLoading(false)} /> : null}
      </AnimatePresence>

      <div
        style={{
          opacity: isLoading ? 0 : 1,
          transition: "opacity 0.45s ease-out",
        }}
      >
        {children}
      </div>
    </>
  );
}
