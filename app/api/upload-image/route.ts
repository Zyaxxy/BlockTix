import { NextResponse } from "next/server";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import { createGenericFile } from "@metaplex-foundation/umi";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Initialize Umi with Irys uploader
    const umi = createUmi("https://api.devnet.solana.com").use(irysUploader());
    
    const umiFile = createGenericFile(buffer, file.name, {
      tags: [{ name: "Content-Type", value: file.type }],
    });

    // Upload to Arweave
    const [uri] = await umi.uploader.upload([umiFile]);
    return NextResponse.json({ uri });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}