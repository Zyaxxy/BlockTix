"use client";

/* ---------------- BUFFER POLYFILL ---------------- */
import { Buffer } from "buffer";
if (typeof window !== "undefined") {
  window.Buffer = window.Buffer || Buffer;
}

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { isSolanaWallet } from "@dynamic-labs/solana";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { createCollection, mplCore, ruleSet } from "@metaplex-foundation/mpl-core";
import { 
  generateSigner, 
  publicKey as umiPublicKey, 
  signerIdentity, 
  createNoopSigner 
} from "@metaplex-foundation/umi";
import { toWeb3JsLegacyTransaction } from "@metaplex-foundation/umi-web3js-adapters";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { supabase } from "@/lib/supabase/client";

export default function CreateEventPage() {
  const router = useRouter();
  const { primaryWallet } = useDynamicContext();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    tickets: "",
    price: "",
    location: "",
    // imageFile: null as File | null,
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent page refresh

    if (!primaryWallet || !isSolanaWallet(primaryWallet)) {
      alert("Please connect a Solana wallet.");
      return;
    }

    setLoading(true);

    try {
      // 1. Upload Image to Supabase Storage
      // let imageUrl = "";
      // if (formData.imageFile) {
      //   const { data, error } = await supabase.storage
      //     .from("event-images")
      //     .upload(${Date.now()}_${formData.imageFile.name}, formData.imageFile);
      //   if (error) throw error;
      //   imageUrl = data.path;
      // }

      // 2. Solana Transaction Logic
      const connection = new Connection("https://api.devnet.solana.com", "confirmed");
      const umi = createUmi(connection).use(mplCore());
      const userUmiPublicKey = umiPublicKey(primaryWallet.address);
      umi.use(signerIdentity(createNoopSigner(userUmiPublicKey)));

      const collectionMint = generateSigner(umi);

      const txBuilder = await createCollection(umi, {
        collection: collectionMint,
        name: formData.title || "Untitled Event",
        uri: "https://arweave.net/placeholder", 
        plugins: [
          {
            type: "Royalties",
            basisPoints: 500,
            creators: [{ address: userUmiPublicKey, percentage: 100 }],
            ruleSet: ruleSet("None"),
          },
        ],
      }).buildWithLatestBlockhash(umi);

      const web3Transaction = toWeb3JsLegacyTransaction(txBuilder);
      web3Transaction.feePayer = new PublicKey(primaryWallet.address);
      const collectionKeypair = Keypair.fromSecretKey(collectionMint.secretKey);
      web3Transaction.partialSign(collectionKeypair);

      const solanaSigner = await primaryWallet.getSigner();
      const signedTx = await (solanaSigner as any).signTransaction(web3Transaction);
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(signature, "confirmed");

      // 3. Database Write
      const { error: dbError } = await supabase.from("events").insert({
        organizer_wallet: primaryWallet.address,
        collection_address: collectionMint.publicKey.toString(),
        name: formData.title,
        description: formData.description,
        event_date: formData.date,
        total_tickets: parseInt(formData.tickets),
        ticket_price: parseFloat(formData.price),
        location: formData.location,
        // image: imageUrl,
        created_at: new Date().toISOString(),
      });

      if (dbError) throw dbError;

      alert("Event Created Successfully!");
      router.push("/home");
    } catch (err: any) {
      console.error("Error:", err);
      alert(err.message || "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleCreate} className="max-w-md mx-auto p-6 bg-black text-white space-y-6">
      <h1 className="text-3xl font-bold italic uppercase tracking-tighter">Create Event</h1>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-zinc-400">Event Title</label>
        <input required placeholder="Summer Music Festival" className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl outline-none" onChange={(e) => setFormData({...formData, title: e.target.value})} />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-zinc-400">Description</label>
        <textarea placeholder="Describe your event..." className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl outline-none" onChange={(e) => setFormData({...formData, description: e.target.value})} />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-zinc-400">Date & Time</label>
        <input required type="datetime-local" className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl outline-none" onChange={(e) => setFormData({...formData, date: e.target.value})} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-zinc-400">Total Tickets</label>
          <input type="number" placeholder="100" className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl outline-none" onChange={(e) => setFormData({...formData, tickets: e.target.value})} />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-zinc-400">Price (SOL)</label>
          <input type="number" placeholder="0.5" className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl outline-none" onChange={(e) => setFormData({...formData, price: e.target.value})} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-zinc-400">Location</label>
        <input placeholder="Venue name" className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl outline-none" onChange={(e) => setFormData({...formData, location: e.target.value})} />
      </div>

      {/* <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-zinc-400">Event Poster</label>
        <input type="file" accept="image/*" className="w-full text-sm text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-xl cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white" onChange={(e) => setFormData({...formData, imageFile: e.target.files?.[0] || null})} />
      </div> */}

      <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 py-4 rounded-xl font-black disabled:opacity-50">
        {loading ? "PROCESSING..." : "CREATE EVENT"}
      </button>
    </form>
  );
}

