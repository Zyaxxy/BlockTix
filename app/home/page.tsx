"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useDynamicContext,
  DynamicWidget
} from "@dynamic-labs/sdk-react-core";
import { supabase } from "@/lib/supabase/client";

export default function HomePage() {
  const { user, primaryWallet } = useDynamicContext();
  const router = useRouter();

  const [events, setEvents] = useState<any[]>([]);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔹 Stable Logout Redirect
  // 1. Redirect if no user
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // 2. Fetch User Data & Events using Wallet Address
  useEffect(() => {
    const fetchData = async () => {
      // Safely extract the wallet address
      const wallet_address = user?.verifiedCredentials?.[0]?.address;

      if (!wallet_address) return;

      setLoading(true);

      try {
        // Fetch First Name
        const { data: userData } = await supabase
          .from("users")
          .select("first_name")
          .eq("wallet_address", wallet_address) // Changed from 'uid'
          .maybeSingle();

        if (userData?.first_name) {
          setFirstName(userData.first_name);
        }

        // Fetch Events
        const res = await fetch("/api/get-user-events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet_address }), // Changed from 'uid'
        });

        if (res.ok) {
          const data = await res.json();
          setEvents(data.events || []);
        }
      } catch (err) {
        console.error("Fetch failed:", err);
      } finally {
        setLoading(false);
      }
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

      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/home/create-event")}
          className="px-5 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-emerald-500 hover:opacity-90 transition font-medium"
        >
          + Create Event
        </button>
        
        <div className="dynamic-widget-wrapper">
          <DynamicWidget />
        </div>
      </div>
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
        {events.map((event) => (
          <div
            key={event.id}
            className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 hover:border-indigo-500 transition-all duration-300"
          >
            <h2 className="text-xl font-bold mb-2">{event.name}</h2>
            <p className="text-zinc-400 text-sm mb-4 line-clamp-2">
              {event.description}
            </p>
            
            <div className="space-y-1 text-xs text-zinc-300 border-t border-zinc-800 pt-4">
              <p>📍 {event.location || "No location set"}</p>
              <p>📅 {event.event_date ? new Date(event.event_date).toLocaleString() : "Date TBD"}</p>
              <p>🎟️ {event.total_tickets} Tickets • {event.ticket_price} SOL</p>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);
}