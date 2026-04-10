import { createClient } from "@/utils/supabase/client";
import { getAuthToken } from "@dynamic-labs/sdk-react-core";

const supabase = createClient();

const EVENTS_TABLE = "events";
const TICKET_SALES_TABLE = "ticket_sales";

const MISSING_EVENTS_TABLE_ERROR =
  "Supabase table public.events is missing. Run the event ticketing migration and retry.";

let missingEventsTableDetected = false;

export type EventStatus = "draft" | "live" | "pre_sale" | "sold_out" | "ended" | "cancelled";

export type OrganizerEvent = {
  id: string;
  candyMachineId: string | null;
  organizerUid: string;
  name: string;
  venue: string | null;
  description: string | null;
  eventDate: string | null;
  endDate: string | null;
  imageUrl: string | null;
  metadataUri: string | null;
  category: string | null;
  tags: string[];
  status: EventStatus;
  totalSupply: number;
  priceLamports: number;
  mintedCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateDraftEventInput = {
  dynamicUserId: string;
  organizerUid: string;
  name: string;
  totalSupply: number;
  priceLamports: number;
  venue?: string;
  description?: string;
  eventDate?: string;
  endDate?: string;
  imageUrl?: string;
  category?: string;
  tags?: string[];
};

export type EventSalesSnapshot = {
  eventId: string;
  sold: number;
  supply: number;
  revenueLamports: number;
};

export type UserTicketSale = {
  id: string;
  eventId: string;
  eventName: string | null;
  candyMachineId: string | null;
  ticketMint: string;
  priceLamports: number;
  mintedAt: string;
};

const callApi = async <T>(
  path: string,
  options: RequestInit,
  dynamicUserId: string
): Promise<{ data: T | null; error: string | null }> => {
  if (!dynamicUserId) {
    return { data: null, error: "Missing Dynamic user id." };
  }

  const authToken = getAuthToken();

  if (!authToken) {
    return { data: null, error: "Dynamic session expired. Please log in again." };
  }

  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
      ...(options.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => null) as {
    data?: T;
    error?: string;
  } | null;

  if (!response.ok) {
    return {
      data: null,
      error: payload?.error ?? "Request failed.",
    };
  }

  if (!payload?.data) {
    return { data: null, error: "Unexpected empty response payload." };
  }

  return { data: payload.data, error: null };
};

const isMissingEventsTableError = (errorMessage: string | undefined) => {
  if (!errorMessage) return false;

  const message = errorMessage.toLowerCase();
  return (
    message.includes("public.events") ||
    message.includes("could not find the table") ||
    (message.includes("relation") && message.includes("events") && message.includes("does not exist"))
  );
};

const normalizeEvent = (row: {
  id: string;
  candy_machine_id: string | null;
  organizer_uid: string;
  name: string;
  venue: string | null;
  description: string | null;
  event_date: string | null;
  end_date: string | null;
  image_url: string | null;
  metadata_uri: string | null;
  category: string | null;
  tags: string[] | null;
  status: EventStatus;
  total_supply: number;
  price_lamports: number;
  minted_count: number;
  created_at: string;
  updated_at: string;
}): OrganizerEvent => ({
  id: row.id,
  candyMachineId: row.candy_machine_id,
  organizerUid: row.organizer_uid,
  name: row.name,
  venue: row.venue,
  description: row.description,
  eventDate: row.event_date,
  endDate: row.end_date,
  imageUrl: row.image_url,
  metadataUri: row.metadata_uri,
  category: row.category,
  tags: row.tags ?? [],
  status: row.status,
  totalSupply: row.total_supply,
  priceLamports: row.price_lamports,
  mintedCount: row.minted_count,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const fetchOrganizerEvents = async (organizerUid: string): Promise<OrganizerEvent[]> => {
  if (missingEventsTableDetected) {
    return [];
  }

  const { data, error } = await supabase
    .from(EVENTS_TABLE)
    .select(
      "id, candy_machine_id, organizer_uid, name, venue, description, event_date, end_date, image_url, metadata_uri, category, tags, status, total_supply, price_lamports, minted_count, created_at, updated_at"
    )
    .eq("organizer_uid", organizerUid)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingEventsTableError(error.message)) {
      missingEventsTableDetected = true;
    }
    return [];
  }

  return (data ?? []).map(normalizeEvent);
};

export const createDraftEvent = async (
  input: CreateDraftEventInput
): Promise<{ data: OrganizerEvent | null; error: string | null }> => {
  if (missingEventsTableDetected) {
    return { data: null, error: MISSING_EVENTS_TABLE_ERROR };
  }

  return callApi<OrganizerEvent>(
    "/api/events",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    input.dynamicUserId
  );
};

export const fetchLiveEvents = async (): Promise<OrganizerEvent[]> => {
  if (missingEventsTableDetected) {
    return [];
  }

  const { data, error } = await supabase
    .from(EVENTS_TABLE)
    .select(
      "id, candy_machine_id, organizer_uid, name, venue, description, event_date, end_date, image_url, metadata_uri, category, tags, status, total_supply, price_lamports, minted_count, created_at, updated_at"
    )
    .in("status", ["live", "pre_sale"])
    .order("event_date", { ascending: true, nullsFirst: false });

  if (error) {
    if (isMissingEventsTableError(error.message)) {
      missingEventsTableDetected = true;
    }
    return [];
  }

  return (data ?? []).map(normalizeEvent);
};

export const markEventAsLive = async ({
  dynamicUserId,
  eventId,
  candyMachineId,
  metadataUri,
}: {
  dynamicUserId: string;
  eventId: string;
  candyMachineId: string;
  metadataUri?: string;
}): Promise<{ error: string | null }> => {
  const result = await callApi<{ ok: true }>(
    `/api/events/${eventId}/publish`,
    {
      method: "PATCH",
      body: JSON.stringify({
        dynamicUserId,
        candyMachineId,
        metadataUri,
      }),
    },
    dynamicUserId
  );

  return { error: result.error };
};

export const recordTicketSale = async ({
  dynamicUserId,
  eventId,
  candyMachineId,
  buyerWallet,
  ticketMint,
  priceLamports,
}: {
  dynamicUserId: string;
  eventId: string;
  candyMachineId: string;
  buyerWallet: string;
  ticketMint: string;
  priceLamports: number;
}): Promise<{ error: string | null }> => {
  const result = await callApi<{ ok: true }>(
    `/api/events/${eventId}/sales`,
    {
      method: "POST",
      body: JSON.stringify({
        dynamicUserId,
        candyMachineId,
        buyerWallet,
        ticketMint,
        priceLamports,
      }),
    },
    dynamicUserId
  );

  return { error: result.error };
};

export const fetchUserTicketSales = async (
  buyerWallet: string
): Promise<UserTicketSale[]> => {
  const { data, error } = await supabase
    .from(TICKET_SALES_TABLE)
    .select("id, event_id, candy_machine_id, ticket_mint, price_lamports, minted_at, events(name)")
    .eq("buyer_wallet", buyerWallet)
    .order("minted_at", { ascending: false });

  if (error) {
    return [];
  }

  return (data ?? []).map(
    (row: {
      id: string;
      event_id: string;
      candy_machine_id: string | null;
      ticket_mint: string;
      price_lamports: number;
      minted_at: string;
      events: { name: string | null } | { name: string | null }[] | null;
    }) => ({
      id: row.id,
      eventId: row.event_id,
      eventName: Array.isArray(row.events)
        ? (row.events[0]?.name ?? null)
        : (row.events?.name ?? null),
      candyMachineId: row.candy_machine_id,
      ticketMint: row.ticket_mint,
      priceLamports: row.price_lamports,
      mintedAt: row.minted_at,
    })
  );
};

export const summarizeSales = (events: OrganizerEvent[]): EventSalesSnapshot[] => {
  return events.map((event) => ({
    eventId: event.id,
    sold: event.mintedCount,
    supply: event.totalSupply,
    revenueLamports: event.mintedCount * event.priceLamports,
  }));
};
