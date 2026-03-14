import { NextResponse } from "next/server";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import { createGenericFile, keypairIdentity } from "@metaplex-foundation/umi";
import bs58 from "bs58";

// 1. Initialize Umi for Server-Side
const secretKey = bs58.decode(process.env.PRIVATE_KEY || "");
const umi = createUmi("https://api.devnet.solana.com")
  .use(irysUploader())
  .use(keypairIdentity({
    publicKey: { bytes: new Uint8Array(32) }, // Simplified keypair object
    secretKey: secretKey,
    // Add your public key bytes if needed by specific versions
  } as any));

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const jsonString = formData.get("json") as string;
    const metadata = JSON.parse(jsonString);

    // 1. Upload Image
    const buffer = Buffer.from(await file.arrayBuffer());
    const umiFile = createGenericFile(buffer, file.name, {
      tags: [{ name: "Content-Type", value: file.type }],
    });
    const [imageUri] = await umi.uploader.upload([umiFile]);

    // 2. Attach Image URI to metadata and upload JSON
    metadata.image = imageUri;
    const metadataUri = await umi.uploader.uploadJson(metadata);

    return NextResponse.json({ uri: metadataUri });
  } catch (err: any) {
    console.error("UPLOAD ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}