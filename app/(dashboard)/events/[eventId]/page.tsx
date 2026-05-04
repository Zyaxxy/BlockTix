"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  useDynamicContext,
  useIsLoggedIn,
  useUserWallets,
} from "@dynamic-labs/sdk-react-core";
import { Calendar, ChevronLeft, ExternalLink, MapPin, Ticket } from "lucide-react";
import { MintButton } from "@/app/components/ui/events/MintButton";
import { fetchEventById, type OrganizerEvent } from "@/lib/events";
import { fetchUserProfile } from "@/lib/profile";
import { formatSol } from "@/lib/shared/format";

const FALLBACK_EVENT_IMAGE =
  "https://dummyimage.com/1200x630/0b0f14/ffffff&text=BlockTix";

const statusLabel: Record<OrganizerEvent["status"], string> = {
  draft: "Draft",
  live: "Live",
  pre_sale: "Pre-sale",
  sold_out: "Sold Out",
  ended: "Ended",
  cancelled: "Cancelled",
};

const canMintStatus = new Set<OrganizerEvent["status"]>(["live", "pre_sale"]);

const formatDate = (value: string | null) => {
  if (!value) return "Date TBA";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date TBA";

  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseMetadataAttributes = (metadata: Record<string, unknown>) => {
  if (!Array.isArray(metadata.attributes)) return [];

  return metadata.attributes
    .filter(isRecord)
    .map((attribute) => ({
      label:
        typeof attribute.trait_type === "string" && attribute.trait_type.trim().length > 0
          ? attribute.trait_type
          : "Attribute",
      value:
        typeof attribute.value === "string" || typeof attribute.value === "number"
          ? String(attribute.value)
          : "—",
    }));
};

export default function EventDetailsPage() {
  const params = useParams<{ eventId: string }>();
  const router = useRouter();
  const isLoggedIn = useIsLoggedIn();
  const { user, primaryWallet } = useDynamicContext();
  const userWallets = useUserWallets();

  const [ready, setReady] = useState(false);
  const [event, setEvent] = useState<OrganizerEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewerRole, setViewerRole] = useState<"organizer" | "user" | null>(null);
  const [metadata, setMetadata] = useState<Record<string, unknown> | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  const eventId = typeof params.eventId === "string" ? params.eventId : "";

  const wallets = useMemo(
    () => [primaryWallet, ...userWallets].filter(Boolean),
    [primaryWallet, userWallets]
  );

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }

    const uid = user?.userId;
    if (!uid || !eventId) return;

    let active = true;

    const load = async () => {
      try {
        const [profile, eventData] = await Promise.all([
          fetchUserProfile(uid),
          fetchEventById(eventId),
        ]);

        if (!active) return;

        if (!profile) {
          router.replace("/login");
          return;
        }

        setViewerRole(profile.role === "organizer" ? "organizer" : "user");

        if (!eventData) {
          setError("Event not found.");
          setReady(true);
          return;
        }

        setEvent(eventData);
        setReady(true);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load event.");
        setReady(true);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [eventId, isLoggedIn, router, user?.userId]);

  useEffect(() => {
    if (!event) return;

    let active = true;

    const loadMetadata = async () => {
      setMetadataLoading(true);
      setMetadataError(null);
      setMetadata(null);

      const metadataEndpoints = [event.metadataUri?.trim(), `/api/events/${event.id}/metadata`].filter(
        (value): value is string => Boolean(value)
      );

      for (const endpoint of metadataEndpoints) {
        try {
          const response = await fetch(endpoint, { cache: "no-store" });
          if (!response.ok) {
            continue;
          }

          const payload = (await response.json()) as unknown;
          if (!isRecord(payload)) {
            continue;
          }

          if (!active) return;

          setMetadata(payload);
          setMetadataLoading(false);
          return;
        } catch {
          continue;
        }
      }

      if (!active) return;

      setMetadataError("Metadata is unavailable right now.");
      setMetadataLoading(false);
    };

    loadMetadata();

    return () => {
      active = false;
    };
  }, [event]);

  const backHref = viewerRole === "organizer" ? "/organizer" : "/user";

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#07090d] text-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          <span className="text-sm text-white/60">Loading event details...</span>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-[#07090d] text-white">
        <main className="mx-auto w-full max-w-5xl px-4 py-10 md:px-8">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Link>
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center">
            <h1 className="text-2xl font-semibold">Event unavailable</h1>
            <p className="mt-2 text-sm text-white/70">{error ?? "This event could not be loaded."}</p>
          </div>
        </main>
      </div>
    );
  }

  const bannerImage = event.imageUrl || FALLBACK_EVENT_IMAGE;
  const soldPercent =
    event.totalSupply > 0 ? Math.round((event.mintedCount / event.totalSupply) * 100) : 0;
  const metadataAttributes = metadata ? parseMetadataAttributes(metadata) : [];
  const metadataName =
    metadata && typeof metadata.name === "string" && metadata.name.trim().length > 0
      ? metadata.name
      : `${event.name} Ticket`;
  const metadataDescription =
    metadata && typeof metadata.description === "string" && metadata.description.trim().length > 0
      ? metadata.description
      : event.description || "Event details will be announced soon.";
  const metadataImage =
    metadata && typeof metadata.image === "string" && metadata.image.trim().length > 0
      ? metadata.image
      : bannerImage;
  const metadataExternalUrl =
    metadata && typeof metadata.external_url === "string" && metadata.external_url.trim().length > 0
      ? metadata.external_url
      : null;

  return (
    <div className="min-h-screen bg-[#07090d] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(16,185,129,0.24),transparent_32%),radial-gradient(circle_at_88%_10%,rgba(249,115,22,0.2),transparent_34%)]" />

      <main className="relative mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/20 px-4 py-2 text-sm text-white/85 hover:bg-white/10"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to {viewerRole === "organizer" ? "Organizer" : "User"} Dashboard
        </Link>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="mt-4 overflow-hidden rounded-[2rem] border border-white/15 bg-black/35"
        >
          <div className="relative h-72 w-full md:h-80">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${bannerImage})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#07090d] via-[#07090d]/75 to-black/25" />
            <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-end">
              <div className="inline-flex w-fit items-center rounded-full border border-white/20 bg-black/35 px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/80">
                {statusLabel[event.status]}
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">{event.name}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-white/85">
                <span className="inline-flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(event.eventDate)}
                </span>
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {event.venue || "Venue TBA"}
                </span>
              </div>
            </div>
          </div>
        </motion.section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <motion.article
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06, duration: 0.35 }}
            className="rounded-3xl border border-white/10 bg-white/[0.03] p-6"
          >
            <p className="text-xs uppercase tracking-[0.18em] text-white/55">About Event</p>
            <p className="mt-3 text-sm leading-7 text-white/80">
              {metadataDescription}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-white/55">Ticket Price</p>
                <p className="mt-2 text-xl font-semibold">{formatSol(event.priceLamports)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-white/55">Minted</p>
                <p className="mt-2 text-xl font-semibold">
                  {event.mintedCount.toLocaleString()} / {event.totalSupply.toLocaleString()}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-white/55">Sell-through</p>
                <p className="mt-2 text-xl font-semibold">{soldPercent}%</p>
              </div>
            </div>

            <div className="mt-6">
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-amber-300"
                  style={{ width: `${Math.min(100, soldPercent)}%` }}
                />
              </div>
            </div>
          </motion.article>

          <motion.aside
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.35 }}
            className="rounded-3xl border border-white/10 bg-white/[0.03] p-6"
          >
            <p className="text-xs uppercase tracking-[0.18em] text-white/55">Actions</p>

            {canMintStatus.has(event.status) && event.candyMachineId ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white/75">
                  This drop is live. Mint directly from this page using your connected wallet.
                </div>
                <div className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div>
                    <p className="text-sm font-medium">Buy Ticket</p>
                    <p className="mt-1 text-xs text-white/60">Candy Machine powered mint</p>
                  </div>
                  <MintButton
                    event={event}
                    dynamicUserId={user?.userId ?? ""}
                    wallets={wallets}
                    onMinted={() => {
                      fetchEventById(event.id).then((latest) => {
                        if (latest) {
                          setEvent(latest);
                        }
                      });
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white/75">
                Minting is not available for this event right now.
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-white/55">Metadata</p>
              {metadataLoading && <p className="mt-2 text-sm text-white/70">Loading metadata...</p>}
              {!metadataLoading && metadataError && (
                <p className="mt-2 text-sm text-amber-200">{metadataError}</p>
              )}

              {!metadataLoading && !metadataError && metadata && (
                <div className="mt-3 space-y-3">
                  <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
                    <div
                      aria-hidden="true"
                      className="h-24 w-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${metadataImage})` }}
                    />
                    <div className="p-3">
                      <p className="text-sm font-semibold text-white">{metadataName}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-white/70">{metadataDescription}</p>
                    </div>
                  </div>

                  {metadataAttributes.length > 0 && (
                    <div className="grid gap-2">
                      {metadataAttributes.map((attribute) => (
                        <div
                          key={`${attribute.label}-${attribute.value}`}
                          className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs"
                        >
                          <span className="uppercase tracking-[0.12em] text-white/55">{attribute.label}</span>
                          <span className="max-w-[58%] truncate text-right text-white/85">{attribute.value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <a
                    href={event.metadataUri || `/api/events/${event.id}/metadata`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-emerald-200 hover:text-emerald-100"
                  >
                    View source JSON
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  {metadataExternalUrl && (
                    <a
                      href={metadataExternalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-xs text-white/70 hover:text-white/90"
                    >
                      External URL
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-white/55">Supply</p>
              <p className="mt-2 inline-flex items-center gap-2 text-sm text-white/85">
                <Ticket className="h-4 w-4" />
                {event.totalSupply.toLocaleString()} total tickets
              </p>
            </div>
          </motion.aside>
        </section>
      </main>
    </div>
  );
}
