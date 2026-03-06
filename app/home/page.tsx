"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { supabase } from "@/lib/supabase/client";

export default function HomePage() {
  const { user } = useDynamicContext();
  const router = useRouter();

  const [events, setEvents] = useState<any[]>([]);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // 🔹 1. Try fetching first name safely
      try {
        const { data, error } = await supabase
          .from("users")
          .select("first_name")
          .eq("uid", user.userId)
          .maybeSingle();

        if (!error && data?.first_name) {
          setFirstName(data.first_name);
        }
      } catch (err) {
        console.error("Client first name fetch failed:", err);
      }

      // 🔹 2. Fetch events (still using your API route)
      const res = await fetch("/api/get-user-events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uid: user.userId }),
      });

      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  return (
    <div className="min-h-screen bg-black text-white px-8 py-6">
      
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-xl font-semibold">
          Welcome
          {firstName
            ? `, ${firstName}`
            : user?.email
            ? `, ${user.email}`
            : ""}
        </h1>

        <button
          onClick={() => router.push("/home/create-event")}
          className="px-5 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-emerald-500 hover:opacity-90 transition"
        >
          + Create Event
        </button>
      </div>

      {/* Center Tabs */}
      <div className="flex justify-center gap-6 mb-12">
        <button className="px-6 py-2 rounded-lg bg-zinc-800">
          Events
        </button>

        <button
          onClick={() => router.push("/browse")}
          className="px-6 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 transition"
        >
          Browse
        </button>
      </div>

      {/* Events Section */}
      {loading ? (
        <p className="text-center text-zinc-400">Loading events...</p>
      ) : events.length === 0 ? (
        <div className="text-center mt-20">
          <p className="text-zinc-400 mb-6">
            You haven't created any events yet.
          </p>
          <button
            onClick={() => router.push("/home/create-event")}
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-emerald-500"
          >
            Create Your First Event
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {events.map((event, index) => (
            <div
              key={index}
              className="bg-zinc-900 p-6 rounded-xl border border-zinc-800"
            >
              <h2 className="text-lg font-semibold mb-2">
                {event.title}
              </h2>
              <p className="text-zinc-400 text-sm">
                {event.description}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}