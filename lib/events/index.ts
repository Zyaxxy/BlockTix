import { getSupabaseBrowserClient } from "@/utils/supabase/client";
import { getAuthToken } from "@dynamic-labs/sdk-react-core";
import {
  EVENT_SELECT,
  EVENTS_TABLE,
  TICKET_SALES_TABLE,
  normalizeEvent,
  type OrganizerEvent,
} from "./normalize-event";
import { createTableGuard } from "../supabase/table-guard";

const MISSING_EVENTS_TABLE_ERROR =
  "Supabase table public.events is missing. Run the event ticketing migration and retry.";

const eventTableGuard = createTableGuard(EVENTS_TABLE);

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

export const fetchOrganizerEvents = async (organizerUid: string): Promise<OrganizerEvent[]> => {
  if (eventTableGuard.isTableMissing()) {
    return [];
  }

  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from(EVENTS_TABLE)
    .select(EVENT_SELECT)
    .eq("organizer_uid", organizerUid)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    if (eventTableGuard.isMissingTableError(error.message)) {
      eventTableGuard.markTableMissing();
    }
    return [];
  }

  return (data ?? []).map(normalizeEvent);
};

export const createDraftEvent = async (
  input: CreateDraftEventInput
): Promise<{ data: OrganizerEvent | null; error: string | null }> => {
  if (eventTableGuard.isTableMissing()) {
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
  if (eventTableGuard.isTableMissing()) {
    return [];
  }

  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from(EVENTS_TABLE)
    .select(EVENT_SELECT)
    .in("status", ["live", "pre_sale"])
    .order("event_date", { ascending: true, nullsFirst: false });

  if (error) {
    if (eventTableGuard.isMissingTableError(error.message)) {
      eventTableGuard.markTableMissing();
    }
    return [];
  }

  return (data ?? []).map(normalizeEvent);
};

export const fetchEventById = async (
  eventId: string
): Promise<OrganizerEvent | null> => {
  if (!eventId || eventTableGuard.isTableMissing()) {
    return null;
  }

  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from(EVENTS_TABLE)
    .select(EVENT_SELECT)
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    if (eventTableGuard.isMissingTableError(error.message)) {
      eventTableGuard.markTableMissing();
    }
    return null;
  }

  if (!data) {
    return null;
  }

  return normalizeEvent(data);
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
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return [];
  }

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

export { EVENT_SELECT, EVENTS_TABLE, TICKET_SALES_TABLE, normalizeEvent } from "./normalize-event";
export type { EventStatus, OrganizerEvent } from "./normalize-event";
