"use client";

/* ---------------- BUFFER POLYFILL ---------------- */
import { Buffer } from "buffer";
if (typeof window !== "undefined") {
  window.Buffer = window.Buffer || Buffer;
}

/* ---------------- REACT ---------------- */
import { useState } from "react";
import { useRouter } from "next/navigation";

/* ---------------- DYNAMIC ---------------- */
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { isSolanaWallet } from "@dynamic-labs/solana";

/* ---------------- METAPLEX ---------------- */
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { createCollection, mplCore, ruleSet } from "@metaplex-foundation/mpl-core";
import { generateSigner, publicKey as umiPublicKey } from "@metaplex-foundation/umi";

/* ---------------- ADAPTER ---------------- */
import { toWeb3JsTransaction } from "@metaplex-foundation/umi-web3js-adapters";

/* ---------------- SOLANA ---------------- */
import { Connection } from "@solana/web3.js";
import { signerIdentity } from "@metaplex-foundation/umi";

export default function CreateEventPage() {
  const router = useRouter();
  const { primaryWallet } = useDynamicContext();

  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");

  const handleCreate = async () => {
    if (!primaryWallet || !isSolanaWallet(primaryWallet)) {
      alert("Please connect a Solana wallet.");
      return;
    }

    setLoading(true);

    try {
      /* ---------------- SOLANA CONNECTION ---------------- */
      const connection = new Connection("https://api.devnet.solana.com");

      /* ---------------- UMI ---------------- */
      const umi = createUmi(connection).use(mplCore());

      /* ---------------- COLLECTION MINT ---------------- */
      const collectionMint = generateSigner(umi);

      /* ---------------- BUILD TX ---------------- */
      const txBuilder = await createCollection(umi, {
        collection: collectionMint,
        name: title || "Untitled Event",
        uri: "https://arweave.net/placeholder",
        plugins: [
          {
            type: "Royalties",
            basisPoints: 500,
            creators: [
              {
                address: umiPublicKey(primaryWallet.address),
                percentage: 100,
              },
            ],
            ruleSet: ruleSet("None"),
          },
        ],
      }).buildWithLatestBlockhash(umi);

      /* ---------------- CONVERT TO WEB3 TX ---------------- */
      const web3Transaction = toWeb3JsTransaction(txBuilder);

      /* ---------------- GET SIGNER ---------------- */
      const signer = await primaryWallet.getSigner();
      umi.use(signerIdentity(signer as any));
      /* ---------------- SIGN ---------------- */
      const signedTx = await signer.signTransaction(web3Transaction as any);

      /* ---------------- SEND ---------------- */
      const signature = await connection.sendRawTransaction(
        signedTx.serialize()
      );

      await connection.confirmTransaction(signature);

      alert(`Event Created! Collection: ${collectionMint.publicKey}`);

      router.push("/home");
    } catch (err: any) {
      console.error("Transaction Error:", err);
      alert(err.message || "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-12 flex flex-col items-center">
      <div className="w-full max-w-md space-y-4">
        <h1 className="text-3xl font-bold italic uppercase tracking-tighter">
          Create Event
        </h1>

        <input
          placeholder="What's the event name?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl outline-none"
        />

        <button
          onClick={handleCreate}
          disabled={loading || !title}
          className="w-full bg-indigo-600 py-4 rounded-xl font-black disabled:opacity-50"
        >
          {loading ? "MINTING..." : "CREATE EVENT"}
        </button>
      </div>
    </div>
  );
}
