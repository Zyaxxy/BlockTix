// import { getIrysUploader } from "./irys";

// export const uploadMetadata = async (metadata: any, primaryWallet: any) => {
//   const irys = await getIrysUploader(primaryWallet);

//   const data = new TextEncoder().encode(JSON.stringify(metadata));

//   const upload = await irys.upload(data as any, {
//     tags: [{ name: "Content-Type", value: "application/json" }],
//   });

//   return `https://gateway.irys.xyz/${upload.id}`;
// };
import { getIrysUploader } from "./irys";

export const uploadMetadata = async (metadata: any, primaryWallet: any) => {
  const irys = await getIrysUploader(primaryWallet);

  const json = JSON.stringify(metadata);
  const data = new TextEncoder().encode(json);

  const upload = await irys.upload(data as any, {
    tags: [{ name: "Content-Type", value: "application/json" }],
  });

  return `https://gateway.irys.xyz/${upload.id}`;
};