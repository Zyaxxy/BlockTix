"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDynamicContext, DynamicWidget } from "@dynamic-labs/sdk-react-core";
import { isSolanaWallet } from "@dynamic-labs/solana";
import { supabase } from "@/lib/supabase/client";

import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

type Event = {
  id: string;
  name: string;
  description: string;
  location: string;
  event_date: string;
  total_tickets: number;
  ticket_price: number;
  metadata_uri: string;
  collection_address: string;
  image?: string;
  organizer_wallet: string;
};

export default function HomePage() {
  const { user, primaryWallet } = useDynamicContext();
  const router = useRouter();

  const [events, setEvents] = useState<Event[]>([]);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [buyingEvent, setBuyingEvent] = useState<string | null>(null);

  // Redirect if user not logged in
  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  // Fetch user + events
  useEffect(() => {
    const fetchData = async () => {
      const wallet_address = user?.verifiedCredentials?.[0]?.address;
      if (!wallet_address) return;

      try {
        const { data } = await supabase
          .from("users")
          .select("first_name")
          .eq("wallet_address", wallet_address)
          .maybeSingle();

        if (data?.first_name) setFirstName(data.first_name);

        const res = await fetch("/api/get-user-events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet_address }),
        });

        if (res.ok) {
          const json = await res.json();
          setEvents(json.events || []);
        }
      } catch (err) {
        console.error(err);
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  // BUY TICKET
  const handleBuyTicket = async (eventItem: Event) => {
    if (!primaryWallet || !isSolanaWallet(primaryWallet)) {
      alert("Please connect a Solana wallet.");
      return;
    }

    const confirmBuy = confirm(
      `Buy ticket for ${eventItem.name} for ${eventItem.ticket_price} SOL?`
    );

    if (!confirmBuy) return;

    setBuyingEvent(eventItem.id);

    try {
      const connection = new Connection("https://api.devnet.solana.com");

      const signer = await primaryWallet.getSigner();

      const buyer = new PublicKey(primaryWallet.address);
      const organizer = new PublicKey(eventItem.organizer_wallet);

      const lamports = eventItem.ticket_price * 1_000_000_000;

      const blockhash = await connection.getLatestBlockhash();

      const instructions = [
        SystemProgram.transfer({
          fromPubkey: buyer,
          toPubkey: organizer,
          lamports,
        }),
      ];

      const message = new TransactionMessage({
        payerKey: buyer,
        recentBlockhash: blockhash.blockhash,
        instructions,
      }).compileToV0Message();

      const tx = new VersionedTransaction(message);

      const result = await signer.signAndSendTransaction(tx);

      console.log("Transaction:", result.signature);

      await supabase.from("ticket_purchases").insert({
        buyer_wallet: primaryWallet.address,
        event_id: eventItem.id,
        tx_signature: result.signature,
        purchased_at: new Date().toISOString(),
      });

      alert("🎟 Ticket purchased successfully!");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Purchase failed");
    }

    setBuyingEvent(null);
  };

  return (
    <div className="min-h-screen bg-black text-white px-8 py-6">
      {/* Top Bar */}
      <div className="flex justify-between mb-10">
        <h1 className="text-xl">
          Welcome {firstName ? firstName : user?.email || ""}
        </h1>

        <div className="flex gap-4">
          <button
            onClick={() => router.push("/home/create-event")}
            className="px-4 py-2 bg-indigo-600 rounded"
          >
            + Create Event
          </button>

          <DynamicWidget />
        </div>
      </div>

      {/* Events */}
      {loading ? (
        <p>Loading events...</p>
      ) : events.length === 0 ? (
        <p>No events available</p>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"
            >
              <h2 className="text-xl font-bold">{event.name}</h2>

              <p className="text-zinc-400 text-sm mt-2">
                {event.description}
              </p>

              <div className="text-sm mt-4">
                <p>📍 {event.location}</p>
                <p>
                  📅 {new Date(event.event_date).toLocaleString()}
                </p>
                <p>🎟 {event.ticket_price} SOL</p>
              </div>

              <button
                onClick={() => handleBuyTicket(event)}
                disabled={buyingEvent === event.id}
                className="mt-4 w-full py-2 bg-indigo-600 rounded"
              >
                {buyingEvent === event.id
                  ? "PROCESSING..."
                  : "Buy Ticket"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}