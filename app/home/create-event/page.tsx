"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

export default function CreateEventPage() {
  const router = useRouter();
  const { user } = useDynamicContext();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = async () => {
    if (!user) return;

    const res = await fetch("/api/create-event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uid: user.userId,
        title,
        description,
      }),
    });

    if (res.ok) {
      router.push("/home");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white px-8 py-12 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create Event</h1>

      <div className="space-y-4">
        <input
          type="text"
          placeholder="Event Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-3 rounded-lg bg-zinc-800 border border-zinc-700"
        />

        <textarea
          placeholder="Event Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-3 rounded-lg bg-zinc-800 border border-zinc-700"
        />

        <button
          onClick={handleCreate}
          className="w-full py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-emerald-500"
        >
          Create
        </button>
      </div>
    </div>
  );
}