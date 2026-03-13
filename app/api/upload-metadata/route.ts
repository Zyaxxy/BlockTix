import { NextResponse } from "next/server";
import { Uploader } from "@irys/upload";
import { Solana } from "@irys/upload-solana";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const irys = await Uploader(Solana)
      .withWallet(process.env.PRIVATE_KEY!)
      .withRpc("https://api.devnet.solana.com")
      .devnet();

    const upload = await irys.upload(
      Buffer.from(JSON.stringify(body)),
      {
        tags: [{ name: "Content-Type", value: "application/json" }],
      }
    );

    const uri = `https://gateway.irys.xyz/${upload.id}`;

    return NextResponse.json({ uri });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}