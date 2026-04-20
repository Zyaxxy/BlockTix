# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BlockTix is a decentralized ticketing system with Auction functionality built on Solana. It uses Anchor for smart contracts and Next.js for the frontend.

## Environment Setup

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Supabase project credentials
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side Supabase operations (optional, for admin operations)
- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` / `DYNAMIC_ENVIRONMENT_ID` - Dynamic Labs wallet authentication
- `NEXT_PUBLIC_SOLANA_RPC_URL` - Solana RPC endpoint (defaults to devnet)

## Architecture

### Frontend (Next.js App Router)
- **Framework**: Next.js 16.1.6 with React 19, TypeScript, Tailwind CSS v4
- **Route Groups**:
  - `/` - Landing page with animated shader background
  - `/(dashboard)/organizer` - Organizer dashboard
  - `/(dashboard)/user` - User dashboard
  - `/login/*` - Login flows for organizers and users
  - `/logout` - Logout handling
- **Wallet**: Dynamic Labs SDK (`@dynamic-labs/sdk-react-core` + `@dynamic-labs/solana`) for Solana wallet connection
- **UI Components**: Framer Motion for animations, shadcn/ui components
- **Client Generation**: Codama generates TypeScript clients from Anchor IDL to `app/generated/`

### Key UI Components (`app/components/ui/`)
- **auth/**: `ProfileForm.tsx`, `AuthPageShell.tsx`, `LoginPage.tsx`, `OrganizerLoginPage.tsx`
- **events/**: `MintButton.tsx` (ticket minting), `CreateEventForm.tsx` (event creation)
- **landing/**: `BackgroundShader.tsx`, `HeroContent.tsx`, `LoadingScreen.tsx`, `BlurText.tsx`
- **effects/**: `hover-border-gradient.tsx`
- **Root**: `providers.tsx` (Dynamic Labs wallet provider setup)

### Core Libraries (`lib/`)
- **solana/candy-machine.ts**: Metaplex Candy Machine integration for ticket minting
  - `deployCandyMachineForEvent()` - Creates collection NFT and candy machine for events
  - `mintTicketFromCandyMachine()` - Mints tickets with guard-aware logic
  - `getSolanaWalletAdapterFromDynamicWallet()` - Bridges Dynamic wallet to Metaplex UMI
- **events/normalize-event.ts**: Event data normalization between snake_case (DB) and camelCase (app)
- **profile/index.ts**: User profile management with Supabase + localStorage caching
- **supabase/**: Database client (`client.ts`) and admin utilities (`admin.ts`, `table-guard.ts`)
- **auth/dynamic-server-auth.ts**: Server-side Dynamic Labs authentication

### Smart Contract (Anchor)
- **Program**: Auction system at `GPfsmgJRLLxaWScL2PPEt5TAgAjzNYTaMuzmsPipnfSv` on devnet
- **Location**: `anchor/programs/auction/`
- **Core Accounts**:
  - `Auction`: Stores auction state (seed, maker, nft_mint, bid_mint, end_time, highest_bidder, highest_bid_amount, resolved)
  - `Bids`: Tracks individual bids (bidder, amount, refunded)
- **Instructions**:
  - `make_auction` - Create auction with NFT prize and bid token
  - `bid` - Place bid in auction
  - `claim_refund` - Refund losing bidders
  - `resolve_auction` - Finalize auction and transfer NFT to winner
  - `cancel_auction` - Cancel auction and return assets

### Off-Chain Data
- **Supabase**: Used for off-chain data storage (configured in `lib/supabase.ts`)

## Common Commands

### Development
```bash
# Run dev server (turbopack - preferred, faster and more reliable)
pnpm run dev

# Run dev server with webpack (alternative)
pnpm run dev:webpack
```

### Anchor Smart Contract
```bash
# Build the Anchor program
pnpm run anchor-build

# Run Anchor tests (skips deploy)
pnpm run anchor-test

# Manual anchor commands (from anchor/ directory)
cd anchor && anchor build
cd anchor && anchor deploy --provider.cluster devnet
cd anchor && anchor test --skip-deploy
```

### Client Generation
```bash
# Generate TypeScript client from IDL
pnpm run codama:js

# Full setup after contract changes
pnpm run setup  # Builds anchor + generates client
```

### Code Quality
```bash
# Lint
pnpm run lint

# Format code
pnpm run format

# Check formatting
pnpm run format:check

# CI pipeline
pnpm run ci  # Build + lint + format check
```

### Build & Deploy
```bash
# Build Next.js app
pnpm run build

# Start production server
pnpm run start
```

## Key Configuration Files

- `anchor/Anchor.toml` - Anchor config (devnet cluster, program ID)
- `codama.json` - Codama client generation config
- `next.config.ts` - Next.js config with serverExternalPackages for ws/pino
- `tsconfig.json` - TypeScript with path alias `@/*`

## Program Deployment

To deploy a new program version:
1. Generate keypair: `solana-keygen new -o target/deploy/auction-keypair.json`
2. Get program ID: `solana address -k target/deploy/auction-keypair.json`
3. Update `anchor/Anchor.toml` program ID under `[programs.devnet]`
4. Update `anchor/programs/auction/src/lib.rs` `declare_id!()`
5. Build: `anchor build`
6. Airdrop SOL: `solana airdrop 2 --url devnet`
7. Deploy: `anchor deploy --provider.cluster devnet`
8. Regenerate client: `pnpm run codama:js`
