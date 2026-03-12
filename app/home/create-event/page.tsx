// "use client";

// /* ---------------- BUFFER POLYFILL ---------------- */
// import { Buffer } from "buffer";
// if (typeof window !== "undefined") {
//   window.Buffer = window.Buffer || Buffer;
// }

// /* ---------------- REACT ---------------- */
// import { useState } from "react";
// import { useRouter } from "next/navigation";

// /* ---------------- DYNAMIC ---------------- */
// import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
// import { isSolanaWallet } from "@dynamic-labs/solana";

// /* ---------------- METAPLEX ---------------- */
// import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
// import { createCollection, mplCore, ruleSet } from "@metaplex-foundation/mpl-core";
// import { generateSigner, publicKey as umiPublicKey } from "@metaplex-foundation/umi";

// /* ---------------- ADAPTER ---------------- */
// import { toWeb3JsTransaction } from "@metaplex-foundation/umi-web3js-adapters";

// /* ---------------- SOLANA ---------------- */
// import { Connection } from "@solana/web3.js";
// import { signerIdentity } from "@metaplex-foundation/umi";

// export default function CreateEventPage() {
//   const router = useRouter();
//   const { primaryWallet } = useDynamicContext();

//   const [loading, setLoading] = useState(false);
//   const [title, setTitle] = useState("");

//   const handleCreate = async () => {
//     if (!primaryWallet || !isSolanaWallet(primaryWallet)) {
//       alert("Please connect a Solana wallet.");
//       return;
//     }

//     setLoading(true);

//     try {
//       /* ---------------- SOLANA CONNECTION ---------------- */
//       const connection = new Connection("https://api.devnet.solana.com");

//       /* ---------------- UMI ---------------- */
//       const umi = createUmi(connection).use(mplCore());

//       /* ---------------- COLLECTION MINT ---------------- */
//       const collectionMint = generateSigner(umi);

//       /* ---------------- BUILD TX ---------------- */
//       const txBuilder = await createCollection(umi, {
//         collection: collectionMint,
//         name: title || "Untitled Event",
//         uri: "https://arweave.net/placeholder",
//         plugins: [
//           {
//             type: "Royalties",
//             basisPoints: 500,
//             creators: [
//               {
//                 address: umiPublicKey(primaryWallet.address),
//                 percentage: 100,
//               },
//             ],
//             ruleSet: ruleSet("None"),
//           },
//         ],
//       }).buildWithLatestBlockhash(umi);

//       /* ---------------- CONVERT TO WEB3 TX ---------------- */
//       const web3Transaction = toWeb3JsTransaction(txBuilder);

//       /* ---------------- GET SIGNER ---------------- */
//       const signer = await primaryWallet.getSigner();
//       umi.use(signerIdentity(signer as any));
//       /* ---------------- SIGN ---------------- */
//       const signedTx = await signer.signTransaction(web3Transaction as any);

//       /* ---------------- SEND ---------------- */
//       const signature = await connection.sendRawTransaction(
//         signedTx.serialize()
//       );

//       await connection.confirmTransaction(signature);

//       alert(`Event Created! Collection: ${collectionMint.publicKey}`);

//       router.push("/home");
//     } catch (err: any) {
//       console.error("Transaction Error:", err);
//       alert(err.message || "Transaction failed");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-black text-white p-12 flex flex-col items-center">
//       <div className="w-full max-w-md space-y-4">
//         <h1 className="text-3xl font-bold italic uppercase tracking-tighter">
//           Create Event
//         </h1>

//         <input
//           placeholder="What's the event name?"
//           value={title}
//           onChange={(e) => setTitle(e.target.value)}
//           className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl outline-none"
//         />

//         <button
//           onClick={handleCreate}
//           disabled={loading || !title}
//           className="w-full bg-indigo-600 py-4 rounded-xl font-black disabled:opacity-50"
//         >
//           {loading ? "MINTING..." : "CREATE EVENT"}
//         </button>
//       </div>
//     </div>
//   );
// }
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
import { 
  generateSigner, 
  publicKey as umiPublicKey, 
  signerIdentity, 
  createNoopSigner 
} from "@metaplex-foundation/umi";

/* ---------------- ADAPTERS ---------------- */
import { toWeb3JsLegacyTransaction } from "@metaplex-foundation/umi-web3js-adapters";

/* ---------------- SOLANA ---------------- */
import { Connection, PublicKey, Keypair } from "@solana/web3.js";

import { supabase } from "@/lib/supabase/client";

export default function CreateEventPage() {
  const router = useRouter();
  const { primaryWallet } = useDynamicContext();

  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = async () => {
    if (!primaryWallet || !isSolanaWallet(primaryWallet)) {
      alert("Please connect a Solana wallet.");
      return;
    }

    setLoading(true);

    try {
      const connection = new Connection("https://api.devnet.solana.com", "confirmed");
      const umi = createUmi(connection).use(mplCore());

      // 1. Setup Umi Identity
      const userUmiPublicKey = umiPublicKey(primaryWallet.address);
      umi.use(signerIdentity(createNoopSigner(userUmiPublicKey)));

      /* ---------------- COLLECTION MINT ---------------- */
      // Generate the Umi signer for the collection
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
            creators: [{ address: userUmiPublicKey, percentage: 100 }],
            ruleSet: ruleSet("None"),
          },
        ],
      }).buildWithLatestBlockhash(umi);

      /* ---------------- CONVERT TO LEGACY WEB3 TX ---------------- */
      const web3Transaction = toWeb3JsLegacyTransaction(txBuilder);

      /* ---------------- THE CRITICAL FIX: RECONSTRUCT SIGNERS ---------------- */
      
      // A. Force the Fee Payer to be a "Fresh" web3.js PublicKey
      web3Transaction.feePayer = new PublicKey(primaryWallet.address);

      // B. Manually reconstruct the Keypair from raw bytes to fix .equals()
      // This ensures the object has the correct prototype for the partialSign method
      const collectionKeypair = Keypair.fromSecretKey(collectionMint.secretKey);

      // C. Sign as the Collection (Local Signer)
      web3Transaction.partialSign(collectionKeypair);

      /* ---------------- DYNAMIC WALLET SIGNING ---------------- */
      const solanaSigner = await primaryWallet.getSigner();
      
      // Cast to any to access the signTransaction method on the Dynamic provider
      const signedTx = await (solanaSigner as any).signTransaction(web3Transaction);

      /* ---------------- SEND & CONFIRM ---------------- */
      const signature = await connection.sendRawTransaction(
        signedTx.serialize()
      );

      await connection.confirmTransaction(signature, "confirmed");

// --- DB WRITE ---
const { error: dbError } = await supabase
  .from("events")
  .insert({
    creator_address: primaryWallet.address,
    collection_address: collectionMint.publicKey.toString(),
    title: title,
    description: description,
    created_at: new Date().toISOString(),
  });

if (dbError) console.error("Database write failed:", dbError);


      alert(`Event Created! Collection: ${collectionMint.publicKey.toString()}`);
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
          placeholder="Event Name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl outline-none"
        />

        <textarea
          placeholder="Describe your event..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl outline-none h-32 resize-none"
        />

        <button
          onClick={handleCreate}
          disabled={loading || !title}
          className="w-full bg-indigo-600 py-4 rounded-xl font-black disabled:opacity-50 transition-colors hover:bg-indigo-500"
        >
          {loading ? "MINTING ON SOLANA..." : "CREATE EVENT"}
        </button>
      </div>
    </div>
  );
}