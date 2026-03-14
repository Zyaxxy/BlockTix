"use client";

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
  createNoopSigner,
} from "@metaplex-foundation/umi";
import { toWeb3JsLegacyTransaction } from "@metaplex-foundation/umi-web3js-adapters";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";

import { supabase } from "@/lib/supabase/client";

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
      /* ---------------- STEP 1: Upload Image & Metadata (VIA API) ---------------- */
      setStep("Step 1/2: Storing data on Arweave...");
      
      const formDataPayload = new FormData();
      formDataPayload.append("file", file);
      formDataPayload.append("json", JSON.stringify({
        name: formData.title,
        description: formData.description,
        location: formData.location,
        event_date: formData.date,
        ticket_price: formData.price,
        total_tickets: formData.tickets,
        organizer_wallet: primaryWallet.address,
      }));

      // Note: Do NOT manually set Content-Type header when using FormData
      const response = await fetch("/api/upload-metadata", {
        method: "POST",
        body: formDataPayload,
      });

      const { uri, error } = await response.json();
      if (error) throw new Error(error);

      /* ---------------- STEP 2: Solana Collection (Signature) ---------------- */
      setStep("Step 2/2: Creating Solana Collection...");
      
      const connection = new Connection("https://api.devnet.solana.com", "confirmed");
      const umi = createUmi(connection).use(mplCore());
      
      const userUmiPublicKey = umiPublicKey(primaryWallet.address);
      umi.use(signerIdentity(createNoopSigner(userUmiPublicKey)));

      const collectionMint = generateSigner(umi);

      const txBuilder = await createCollection(umi, {
        collection: collectionMint,
        name: formData.title || "Untitled Event",
        uri: uri, 
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

     /* ---------------- STEP 3: Save in Supabase ---------------- */
      setStep("Finalizing...");
      
      const { error: dbError } = await supabase.from("events").insert({
        organizer_wallet: primaryWallet.address,
        collection_address: collectionMint.publicKey.toString(),
        metadata_uri: uri,
        name: formData.title,
        description: formData.description,
        event_date: formData.date,
        total_tickets: Number(formData.tickets),
        ticket_price: Number(formData.price),
        location: formData.location,
        created_at: new Date().toISOString(),
      });
      
      if (dbError) throw dbError;

      alert("Event Created Successfully!");
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
    <form onSubmit={handleCreate} className="max-w-md mx-auto p-6 bg-black text-white space-y-4">
      <h1 className="text-3xl font-bold italic uppercase tracking-tighter">Create Event</h1>
      
      {step && (
        <div className="bg-indigo-900/50 border border-indigo-500 p-3 rounded-lg text-sm text-indigo-200 animate-pulse">
          {step}
        </div>
      )}

      {/* File Input */}
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