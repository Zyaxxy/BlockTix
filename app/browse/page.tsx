"use client";

import { useRouter } from "next/navigation";

export default function BrowsePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-black text-white px-8 py-6">

      <div className="flex justify-between items-center mb-10">
        <h1 className="text-xl font-semibold">Browse Events</h1>

        <button
          onClick={() => router.push("/home")}
          className="px-5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition"
        >
          Back to Events
        </button>
      </div>

      <p className="text-zinc-400">
        Public events will appear here.
      </p>
    </div>
  );
}