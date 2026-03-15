"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { isSolanaWallet } from "@dynamic-labs/solana";

export default function CreateEventPage() {
  const router = useRouter();
  const { primaryWallet } = useDynamicContext();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    tickets: "",
    price: "",
    location: "",
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!primaryWallet || !isSolanaWallet(primaryWallet)) {
      alert("Please connect a Solana wallet.");
      return;
    }
    if (!file) {
      alert("Please select an image file.");
      return;
    }

    setLoading(true);

    try {
      setStep("Step 1/2: Storing data on Arweave...");

      const formDataPayload = new FormData();
      formDataPayload.append("file", file);
      formDataPayload.append(
        "json",
        JSON.stringify({
          name: formData.title,
          description: formData.description,
          location: formData.location,
          event_date: formData.date,
          ticket_price: formData.price,
          total_tickets: formData.tickets,
          organizer_wallet: primaryWallet.address,
        })
      );

      const uploadRes = await fetch("/api/upload-metadata", {
        method: "POST",
        body: formDataPayload,
      });

      const { uri, error: uploadError } = await uploadRes.json();
      if (uploadError) throw new Error(uploadError);
      if (!uri) throw new Error("No metadata URI returned");

      setStep("Step 2/2: Creating Solana collection...");

      const collectionRes = await fetch("/api/create-event-collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uri,
          organizer_wallet: primaryWallet.address,
          name: formData.title,
          description: formData.description,
          event_date: formData.date,
          total_tickets: formData.tickets,
          ticket_price: formData.price,
          location: formData.location,
        }),
      });

      const collectionData = await collectionRes.json();
      if (!collectionRes.ok) throw new Error(collectionData.error ?? "Failed to create collection");

      alert("Event created successfully!");
      router.push("/home");
    } catch (err: any) {
      console.error("FLOW ERROR:", err);
      alert(err.message || "Transaction failed");
    } finally {
      setLoading(false);
      setStep("");
    }
  };

  return (
    <form
      onSubmit={handleCreate}
      className="max-w-md mx-auto p-6 bg-black text-white space-y-4"
    >
      <h1 className="text-3xl font-bold italic uppercase tracking-tighter">
        Create Event
      </h1>

      {step && (
        <div className="bg-indigo-900/50 border border-indigo-500 p-3 rounded-lg text-sm text-indigo-200 animate-pulse">
          {step}
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="w-full bg-zinc-900 p-4 rounded-xl"
      />

      <input
        placeholder="Event Title"
        required
        className="w-full bg-zinc-900 p-4 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
      />

      <textarea
        placeholder="Description"
        className="w-full bg-zinc-900 p-4 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
      />

      <div className="grid grid-cols-2 gap-4">
        <input
          type="datetime-local"
          className="bg-zinc-900 p-4 rounded-xl outline-none text-white [color-scheme:dark]"
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
        />
        <input
          type="number"
          placeholder="Tickets"
          className="bg-zinc-900 p-4 rounded-xl outline-none"
          onChange={(e) => setFormData({ ...formData, tickets: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <input
          type="number"
          placeholder="Price (SOL)"
          step="0.01"
          className="bg-zinc-900 p-4 rounded-xl outline-none"
          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
        />
        <input
          placeholder="Location"
          className="bg-zinc-900 p-4 rounded-xl outline-none"
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 py-4 rounded-xl font-bold transition-colors"
      >
        {loading ? "PROCESSING..." : "CREATE EVENT"}
      </button>
    </form>
  );
}
