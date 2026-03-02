"use client";

import Link from "next/link";

export default function LoginSelection() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-10">
      <h1 className="text-4xl font-bold">Login as</h1>

      <div className="flex gap-8">
        <Link href="/login/user">
          <button className="px-8 py-4 bg-green-600 rounded-xl text-lg">
            User
          </button>
        </Link>

        <Link href="/login/organizer">
          <button className="px-8 py-4 bg-purple-600 rounded-xl text-lg">
            Organizer
          </button>
        </Link>
      </div>
    </div>
  );
}