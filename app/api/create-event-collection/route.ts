import { NextResponse } from "next/server";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { createCollection, mplCore, ruleSet } from "@metaplex-foundation/mpl-core";
import { generateSigner, publicKey as umiPublicKey, keypairIdentity } from "@metaplex-foundation/umi";
import { fromWeb3JsKeypair } from "@metaplex-foundation/umi-web3js-adapters";
import { toWeb3JsLegacyTransaction } from "@metaplex-foundation/umi-web3js-adapters";
import { Connection, Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { supabase } from "@/lib/supabase/server";

const RPC =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      uri,
      organizer_wallet,
      name,
      description,
      event_date,
      total_tickets,
      ticket_price,
      location,
    } = body;

    if (!uri || !organizer_wallet || !name) {
      return NextResponse.json(
        { error: "Missing required fields: uri, organizer_wallet, name" },
        { status: 400 }
      );
    }

    const secretKeyBase58 =
      process.env.TICKET_AUTHORITY_SECRET_KEY || process.env.PRIVATE_KEY || "";
    if (!secretKeyBase58) {
      return NextResponse.json(
        { error: "TICKET_AUTHORITY_SECRET_KEY (or PRIVATE_KEY) not set" },
        { status: 500 }
      );
    }

    const web3Keypair = Keypair.fromSecretKey(bs58.decode(secretKeyBase58));
    const umiKeypair = fromWeb3JsKeypair(web3Keypair);

    const umi = createUmi(RPC).use(mplCore()).use(keypairIdentity(umiKeypair));

    const collectionMint = generateSigner(umi);
    const organizerUmi = umiPublicKey(organizer_wallet);

    const txBuilder = await createCollection(umi, {
      collection: collectionMint,
      name: name || "Untitled Event",
      uri,
      plugins: [
        {
          type: "Royalties",
          basisPoints: 500,
          creators: [{ address: organizerUmi, percentage: 100 }],
          ruleSet: ruleSet("None"),
        },
      ],
    }).buildWithLatestBlockhash(umi);

    const web3Tx = toWeb3JsLegacyTransaction(txBuilder);
    web3Tx.feePayer = web3Keypair.publicKey;
    const collectionWeb3Keypair = Keypair.fromSecretKey(collectionMint.secretKey);
    web3Tx.partialSign(collectionWeb3Keypair);
    web3Tx.partialSign(web3Keypair);

    const connection = new Connection(RPC);
    const signature = await connection.sendRawTransaction(web3Tx.serialize());
    await connection.confirmTransaction(signature, "confirmed");

    const collection_address = collectionWeb3Keypair.publicKey.toBase58();

    const { error: dbError } = await supabase.from("events").insert({
      organizer_wallet,
      collection_address,
      metadata_uri: uri,
      name: name ?? "",
      description: description ?? "",
      event_date: event_date ?? null,
      total_tickets: Number(total_tickets) || 0,
      ticket_price: Number(ticket_price) ?? 0,
      location: location ?? "",
      created_at: new Date().toISOString(),
    });

    if (dbError) {
      console.error("Supabase insert error:", dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ collection_address, signature });
  } catch (err: any) {
    console.error("create-event-collection error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to create event collection" },
      { status: 500 }
    );
  }
}
