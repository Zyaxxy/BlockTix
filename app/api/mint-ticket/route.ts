import { NextResponse } from "next/server";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { create, mplCore } from "@metaplex-foundation/mpl-core";
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
    const { event_id, buyer_wallet, payment_tx_signature } = body;

    if (!event_id || !buyer_wallet) {
      return NextResponse.json(
        { error: "Missing event_id or buyer_wallet" },
        { status: 400 }
      );
    }

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, collection_address, metadata_uri, name, organizer_wallet, total_tickets")
      .eq("id", event_id)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.organizer_wallet === buyer_wallet) {
      return NextResponse.json(
        { error: "Cannot buy a ticket for your own event" },
        { status: 400 }
      );
    }

    const { count, error: countError } = await supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event_id);

    if (countError) {
      return NextResponse.json(
        { error: "Failed to count tickets. Ensure a 'tickets' table exists with event_id column." },
        { status: 500 }
      );
    }

    const sold = count ?? 0;
    if (sold >= (event.total_tickets || 0)) {
      return NextResponse.json(
        { error: "Event is sold out" },
        { status: 400 }
      );
    }

    const secretKeyBase58 =
      process.env.TICKET_AUTHORITY_SECRET_KEY || process.env.PRIVATE_KEY || "";
    if (!secretKeyBase58) {
      return NextResponse.json(
        { error: "TICKET_AUTHORITY_SECRET_KEY not set" },
        { status: 500 }
      );
    }

    const web3Keypair = Keypair.fromSecretKey(bs58.decode(secretKeyBase58));
    const umiKeypair = fromWeb3JsKeypair(web3Keypair);
    const umi = createUmi(RPC).use(mplCore()).use(keypairIdentity(umiKeypair));

    const assetSigner = generateSigner(umi);
    const collectionAddress = umiPublicKey(event.collection_address);
    const ownerAddress = umiPublicKey(buyer_wallet);

    const txBuilder = await create(umi, {
      asset: assetSigner,
      collection: { publicKey: collectionAddress },
      name: `${event.name ?? "Event"} Ticket`,
      uri: event.metadata_uri ?? "",
      owner: ownerAddress,
    }).buildWithLatestBlockhash(umi);

    const web3Tx = toWeb3JsLegacyTransaction(txBuilder);
    web3Tx.feePayer = web3Keypair.publicKey;
    const assetWeb3Keypair = Keypair.fromSecretKey(assetSigner.secretKey);
    web3Tx.partialSign(assetWeb3Keypair);
    web3Tx.partialSign(web3Keypair);

    const connection = new Connection(RPC);
    const mint_tx_signature = await connection.sendRawTransaction(web3Tx.serialize());
    await connection.confirmTransaction(mint_tx_signature, "confirmed");

    const ticket_mint = assetWeb3Keypair.publicKey.toBase58();

    await supabase.from("tickets").insert({
      event_id,
      ticket_mint,
      buyer_wallet,
      mint_tx_signature,
      payment_tx_signature: payment_tx_signature ?? null,
    });

    return NextResponse.json({
      ticket_mint,
      mint_tx_signature,
    });
  } catch (err: any) {
    console.error("mint-ticket error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to mint ticket" },
      { status: 500 }
    );
  }
}
