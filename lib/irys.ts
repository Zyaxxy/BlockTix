// import { WebUploader } from "@irys/web-upload";
// import Solana from "@irys/web-upload-solana";
// import { PublicKey } from "@solana/web3.js";

// export const getIrysUploader = async (primaryWallet: any) => {
//   const signer = await primaryWallet.getSigner();

//   const walletAdapter = {
//     publicKey: new PublicKey(primaryWallet.address),

//     signMessage: async (message: Uint8Array) => {
//       const signature = await signer.signMessage(message);
//       return signature;
//     },

//     signTransaction: async (tx: any) => {
//       return signer.signTransaction(tx);
//     },

//     signAllTransactions: async (txs: any[]) => {
//       return Promise.all(txs.map((tx) => signer.signTransaction(tx)));
//     },
//   };

//   const irys = await WebUploader(Solana)
//     .withProvider(walletAdapter)
//     .withRpc("https://api.devnet.solana.com")
//     .devnet();

//   return irys;
// };

import { WebUploader } from "@irys/web-upload";
import Solana from "@irys/web-upload-solana";
import { PublicKey } from "@solana/web3.js";

export const getIrysUploader = async (primaryWallet: any) => {
  const signer = await primaryWallet.getSigner();

  const walletAdapter = {
    publicKey: new PublicKey(primaryWallet.address),

    signMessage: async (message: Uint8Array) => {
      return signer.signMessage(message);
    }
  };

  const irys = await WebUploader(Solana)
    .withProvider(walletAdapter)
    .withRpc("https://api.devnet.solana.com")
    .devnet();

  return irys;
};