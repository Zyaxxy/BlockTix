"use client";

import { useState } from "react";
import {
  createCandyMachineClient,
  deployCandyMachineForEvent,
  getSolanaWalletAdapterFromDynamicWallet,
  solToLamports,
  uploadTicketMetadataJson,
} from "@/lib/candy-machine";
import {
  createDraftEvent,
  markEventAsLive,
  type OrganizerEvent,
} from "@/lib/events";

type CreateEventFormProps = {
  open: boolean;
  dynamicUserId: string;
  organizerUid: string;
  wallets: unknown[];
  onClose: () => void;
  onCreated: (event: OrganizerEvent) => void;
};

type Step = 1 | 2 | 3;
type DeployStage =
  | "idle"
  | "creating_draft"
  | "uploading_metadata"
  | "deploying_candy_machine"
  | "syncing_event";

export function CreateEventForm({
  open,
  dynamicUserId,
  organizerUid,
  wallets,
  onClose,
  onCreated,
}: CreateEventFormProps) {
  const [step, setStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deployStage, setDeployStage] = useState<DeployStage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [deployAttemptId, setDeployAttemptId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [venue, setVenue] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [symbol, setSymbol] = useState("BTIX");

  const [priceSol, setPriceSol] = useState("0.1");
  const [totalSupply, setTotalSupply] = useState("250");
  const [mintLimit, setMintLimit] = useState("2");
  const [botTaxSol, setBotTaxSol] = useState("0.01");
  const [deployNow, setDeployNow] = useState(true);

  if (!open) return null;

  const closeAndReset = () => {
    setStep(1);
    setError(null);
    setWarning(null);
    setIsSubmitting(false);
    setDeployStage("idle");
    setDeployAttemptId(null);
    onClose();
  };

  const createDeployAttemptId = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    return `deploy-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  };

  const submit = async () => {
    setError(null);
    setWarning(null);
    setDeployStage("creating_draft");
    const attemptId = createDeployAttemptId();
    setDeployAttemptId(attemptId);

    const parsedSupply = Number(totalSupply);
    const parsedPriceSol = Number(priceSol);

    if (!name.trim()) {
      setError("Event name is required.");
      return;
    }

    if (!Number.isFinite(parsedSupply) || parsedSupply <= 0) {
      setError("Total supply must be greater than 0.");
      return;
    }

    if (!Number.isFinite(parsedPriceSol) || parsedPriceSol < 0) {
      setError("Price in SOL must be a non-negative number.");
      return;
    }

    setIsSubmitting(true);

    const priceLamports = solToLamports(parsedPriceSol);
    const createResult = await createDraftEvent({
      dynamicUserId,
      organizerUid,
      name,
      venue,
      description,
      imageUrl,
      eventDate: eventDate || undefined,
      endDate: endDate || undefined,
      totalSupply: parsedSupply,
      priceLamports,
    });

    if (!createResult.data) {
      setError(createResult.error ?? "Unable to create draft event.");
      setIsSubmitting(false);
      setDeployStage("idle");
      return;
    }

    let createdEvent = createResult.data;

    if (deployNow) {
      let walletAdapter = null;
      for (const wallet of wallets) {
        walletAdapter = await getSolanaWalletAdapterFromDynamicWallet(
          wallet as Parameters<typeof getSolanaWalletAdapterFromDynamicWallet>[0]
        );

        if (walletAdapter) {
          break;
        }
      }

      if (!walletAdapter) {
        setError("Connect a Solana wallet with signing support to deploy on-chain.");
        setIsSubmitting(false);
        setDeployStage("idle");
        return;
      }

      try {
        const umi = createCandyMachineClient(walletAdapter);
        setDeployStage("uploading_metadata");
        const metadataUri = await uploadTicketMetadataJson(umi, {
          name,
          symbol,
          description: description || `${name} entry ticket`,
          imageUri: imageUrl || "https://dummyimage.com/1200x630/0b0f14/ffffff&text=BlockTix",
          attributes: [
            { trait_type: "Event", value: name },
            { trait_type: "Venue", value: venue || "TBA" },
            { trait_type: "Category", value: "Ticket" },
          ],
        });

        setDeployStage("deploying_candy_machine");
        const deployment = await deployCandyMachineForEvent({
          walletAdapter,
          eventName: name,
          symbol,
          metadataUri,
          deployAttemptId: attemptId,
          eventId: createResult.data.id,
          totalSupply: parsedSupply,
          priceLamports,
          mintLimitPerWallet: Number(mintLimit) > 0 ? Number(mintLimit) : undefined,
          saleStartsAt: eventDate || undefined,
          saleEndsAt: endDate || undefined,
          botTaxLamports:
            Number(botTaxSol) > 0 ? solToLamports(Number(botTaxSol)) : undefined,
        });

        createdEvent = {
          ...createdEvent,
          status: "live",
          candyMachineId: deployment.candyMachineAddress,
          metadataUri,
        };

        setDeployStage("syncing_event");
        const markLive = await markEventAsLive({
          dynamicUserId,
          eventId: createResult.data.id,
          candyMachineId: deployment.candyMachineAddress,
          metadataUri,
        });

        if (markLive.error) {
          setWarning(
            `On-chain deploy succeeded, but event sync failed: ${markLive.error}. Attempt: ${attemptId}. Candy Machine: ${deployment.candyMachineAddress}. Collection tx: ${deployment.collectionCreateSignature}. Init tx: ${deployment.candyMachineCreateSignature}`
          );
        }
      } catch (deploymentError) {
        setError(
          deploymentError instanceof Error
            ? `${deploymentError.message} (Attempt: ${attemptId})`
            : "On-chain deployment failed."
        );
        setIsSubmitting(false);
        setDeployStage("idle");
        return;
      }
    }

    onCreated(createdEvent);
    setIsSubmitting(false);
    setDeployStage("idle");
    closeAndReset();
  };

  const deployStageMessage: Record<DeployStage, string> = {
    idle: "",
    creating_draft: "Creating draft event...",
    uploading_metadata: "Uploading ticket metadata...",
    deploying_candy_machine: "Deploying collection and Candy Machine...",
    syncing_event: "Syncing live event state...",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-white/15 bg-[#090d13] p-6 text-white shadow-[0_30px_100px_rgba(0,0,0,0.65)]">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Create Event</p>
            <h3 className="mt-1 text-2xl font-semibold">Step {step} of 3</h3>
          </div>
          <button
            onClick={closeAndReset}
            className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            Close
          </button>
        </div>

        {step === 1 && (
          <div className="grid gap-3">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Event name"
              className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm"
            />
            <input
              value={venue}
              onChange={(event) => setVenue(event.target.value)}
              placeholder="Venue"
              className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm"
            />
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Description"
              className="min-h-24 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm"
            />
            <input
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="Banner image URL"
              className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm"
            />
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={symbol}
              onChange={(event) => setSymbol(event.target.value.toUpperCase())}
              placeholder="Symbol"
              className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm"
              maxLength={10}
            />
            <input
              value={priceSol}
              onChange={(event) => setPriceSol(event.target.value)}
              placeholder="Price (SOL)"
              className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm"
            />
            <input
              value={totalSupply}
              onChange={(event) => setTotalSupply(event.target.value)}
              placeholder="Total supply"
              className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm"
            />
            <input
              value={mintLimit}
              onChange={(event) => setMintLimit(event.target.value)}
              placeholder="Mint limit per wallet"
              className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm"
            />
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-3">
            <label className="text-sm text-white/80">Sale start (optional)</label>
            <input
              type="datetime-local"
              value={eventDate}
              onChange={(event) => setEventDate(event.target.value)}
              className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm"
            />
            <label className="text-sm text-white/80">Sale end (optional)</label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm"
            />
            <input
              value={botTaxSol}
              onChange={(event) => setBotTaxSol(event.target.value)}
              placeholder="Bot tax (SOL)"
              className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm"
            />
            <label className="inline-flex items-center gap-2 text-sm text-white/80">
              <input
                type="checkbox"
                checked={deployNow}
                onChange={(event) => setDeployNow(event.target.checked)}
              />
              Deploy on-chain now (Candy Machine + collection)
            </label>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
        {warning && <p className="mt-2 text-sm text-amber-300">{warning}</p>}
        {isSubmitting && deployStage !== "idle" && (
          <p className="mt-2 text-sm text-cyan-200">{deployStageMessage[deployStage]}</p>
        )}
        {deployAttemptId && (
          <p className="mt-1 text-xs text-white/40">Deploy Attempt ID: {deployAttemptId}</p>
        )}

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setStep((current) => (current > 1 ? ((current - 1) as Step) : current))}
            disabled={step === 1 || isSubmitting}
            className="rounded-full border border-white/20 px-5 py-2 text-sm disabled:opacity-50"
          >
            Back
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep((current) => (current < 3 ? ((current + 1) as Step) : current))}
              className="rounded-full bg-white px-6 py-2 text-sm font-semibold text-black"
            >
              Next
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={isSubmitting}
              className="rounded-full bg-emerald-300 px-6 py-2 text-sm font-semibold text-black disabled:opacity-70"
            >
              {isSubmitting ? "Creating..." : "Create Event"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
