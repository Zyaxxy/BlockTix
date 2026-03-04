"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

export default function OnboardingPage() {
  const { user } = useDynamicContext();
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [interests, setInterests] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;

    if (!firstName || !lastName) {
      alert("Please fill your name");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/onboard-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uid: user.userId,
        email: user.email,
        firstName,
        lastName,
        interests,
        location,
        bio,
      }),
    });

    setLoading(false);

    if (res.ok) {
      router.push("/home");
    } else {
      alert("Something went wrong.");
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 text-white">
      <div className="w-full max-w-md bg-zinc-900 p-8 rounded-2xl shadow-xl">
        <h1 className="text-3xl font-bold mb-2">Complete Your Profile</h1>
        <p className="text-zinc-400 mb-6 text-sm">
          Tell us a bit about yourself to personalize your experience.
        </p>

        <div className="space-y-4">

          <div>
            <label className="block text-sm mb-1 text-zinc-300">
              First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full p-3 rounded-lg bg-zinc-800 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 text-zinc-300">
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full p-3 rounded-lg bg-zinc-800 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 text-zinc-300">
              Interests
            </label>
            <input
              type="text"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              className="w-full p-3 rounded-lg bg-zinc-800 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 text-zinc-300">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full p-3 rounded-lg bg-zinc-800 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 text-zinc-300">
              Short Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full p-3 rounded-lg bg-zinc-800 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-emerald-500 hover:opacity-90 transition font-semibold"
          >
            {loading ? "Saving..." : "Finish Setup"}
          </button>
        </div>
      </div>
    </div>
  );
}