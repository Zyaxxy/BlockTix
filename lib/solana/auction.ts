import {
  getAddressEncoder,
  getBytesEncoder,
  getProgramDerivedAddress,
  type Address,
  type FetchAccountConfig,
  type MaybeAccount,
  type TransactionSigner,
} from "@solana/kit";
import {
  fetchMaybeAuction,
  type Auction,
} from "@/app/generated/auction/accounts";
import {
  getBidInstructionAsync,
  getCancelAuctionInstructionAsync,
  getClaimRefundInstructionAsync,
  getMakeAuctionInstructionAsync,
  getResolveAuctionInstructionAsync,
} from "@/app/generated/auction/instructions";
import { AUCTION_PROGRAM_ADDRESS } from "@/app/generated/auction/programs";

const U64_MAX = (1n << 64n) - 1n;

const toU64SeedBytes = (value: number | bigint): Uint8Array => {
  const seed = typeof value === "bigint" ? value : BigInt(value);

  if (seed < 0n || seed > U64_MAX) {
    throw new Error("Auction seed must fit into an unsigned 64-bit integer.");
  }

  const bytes = new Uint8Array(8);
  const view = new DataView(bytes.buffer);
  view.setBigUint64(0, seed, true);
  return bytes;
};

export const deriveAuctionAddress = async (
  makerAddress: Address,
  seed: number | bigint,
  programAddress: Address = AUCTION_PROGRAM_ADDRESS
) => {
  return getProgramDerivedAddress({
    programAddress,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([97, 117, 99, 116, 105, 111, 110])),
      getAddressEncoder().encode(makerAddress),
      getBytesEncoder().encode(toU64SeedBytes(seed)),
    ],
  });
};

export const deriveBidRecordAddress = async (
  auctionAddress: Address,
  bidderAddress: Address,
  programAddress: Address = AUCTION_PROGRAM_ADDRESS
) => {
  return getProgramDerivedAddress({
    programAddress,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([98, 105, 100, 115])),
      getAddressEncoder().encode(auctionAddress),
      getAddressEncoder().encode(bidderAddress),
    ],
  });
};

export type AuctionLifecycleState =
  | "missing"
  | "active"
  | "ended_pending_resolution"
  | "ended_no_bids"
  | "resolved";

export const getAuctionLifecycleState = (
  auction: Auction | null,
  nowEpochSeconds = Math.floor(Date.now() / 1000)
): AuctionLifecycleState => {
  if (!auction) {
    return "missing";
  }

  if (auction.resolved) {
    return "resolved";
  }

  if (nowEpochSeconds >= Number(auction.endTime)) {
    if (auction.highestBidAmount === 0n) {
      return "ended_no_bids";
    }

    return "ended_pending_resolution";
  }

  return "active";
};

export const fetchAuctionState = async (
  rpc: Parameters<typeof fetchMaybeAuction>[0],
  auctionAddress: Address,
  config?: FetchAccountConfig
): Promise<MaybeAccount<Auction>> => {
  return fetchMaybeAuction(rpc, auctionAddress, config);
};

export const buildMakeAuctionInstruction = async (
  input: Parameters<typeof getMakeAuctionInstructionAsync>[0]
) => {
  return getMakeAuctionInstructionAsync(input);
};

export const buildBidInstruction = async (
  input: Parameters<typeof getBidInstructionAsync>[0]
) => {
  return getBidInstructionAsync(input);
};

export const buildResolveAuctionInstruction = async (
  input: Parameters<typeof getResolveAuctionInstructionAsync>[0]
) => {
  return getResolveAuctionInstructionAsync(input);
};

export const buildClaimRefundInstruction = async (
  input: Parameters<typeof getClaimRefundInstructionAsync>[0]
) => {
  return getClaimRefundInstructionAsync(input);
};

export const buildCancelAuctionInstruction = async (
  input: Parameters<typeof getCancelAuctionInstructionAsync>[0]
) => {
  return getCancelAuctionInstructionAsync(input);
};

export type AuctionInstructionSigner = TransactionSigner;
