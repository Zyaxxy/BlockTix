import { NextResponse } from "next/server";
import { Uploader } from "@irys/upload";
import { Solana } from "@irys/upload-solana";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Use the Node.js version of the Irys SDK
    const irys = await Uploader(Solana)
      .withWallet(process.env.PRIVATE_KEY!) 
      .withRpc("https://api.devnet.solana.com")
      .devnet();

    // Standard Node.js Buffer handles the hashing perfectly
    const upload = await irys.upload(Buffer.from(JSON.stringify(body)), {
      tags: [{ name: "Content-Type", value: "application/json" }],
    });

    return NextResponse.json({ uri: `https://gateway.irys.xyz/${upload.id}` });
  } catch (err) {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}