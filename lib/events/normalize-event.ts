export const EVENTS_TABLE = "events";
export const TICKET_SALES_TABLE = "ticket_sales";

export const EVENT_SELECT =
  "id, candy_machine_id, organizer_uid, name, venue, description, event_date, end_date, image_url, metadata_uri, category, tags, status, total_supply, price_lamports, minted_count, created_at, updated_at";

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

export const normalizeEvent = (row: {
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