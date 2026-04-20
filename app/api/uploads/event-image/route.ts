import { NextResponse } from "next/server";
import { verifyDynamicToken } from "@/lib/auth/dynamic-server-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { USERS_TABLE } from "@/lib/profile";
import { createDevRequestLogger } from "@/lib/shared/dev-logger";

// Server-side file validation constants
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const MAX_EVENT_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function generateImageFilename(userId: string, mimeType: string): string {
  const extension = MIME_TO_EXTENSION[mimeType] || "jpg";
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${userId}/${timestamp}_${random}.${extension}`;
}

export async function POST(request: Request) {
  const log = createDevRequestLogger("api/uploads/event-image:POST");
  log.info("request received");

  // Parse form data
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    log.warn("invalid form data");
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const dynamicUserId = formData.get("dynamicUserId") as string | null;

  if (!file) {
    log.warn("missing file");
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  if (!dynamicUserId) {
    log.warn("missing dynamicUserId");
    return NextResponse.json({ error: "Missing user ID." }, { status: 400 });
  }

  // Validate file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    log.warn("invalid file type", { type: file.type });
    return NextResponse.json(
      { error: "Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed." },
      { status: 400 }
    );
  }

  // Validate file size
  if (file.size > MAX_EVENT_IMAGE_SIZE) {
    log.warn("file too large", { size: file.size, maxSize: MAX_EVENT_IMAGE_SIZE });
    return NextResponse.json(
      { error: "File too large. Maximum size is 5MB." },
      { status: 400 }
    );
  }

  // Verify auth token
  log.info("verifying dynamic token");
  const authResult = await verifyDynamicToken(request, dynamicUserId);
  if (authResult.error || !authResult.dynamicUserId) {
    log.warn("token verification failed", { error: authResult.error });
    return NextResponse.json(
      { error: authResult.error ?? "Unauthorized." },
      { status: 401 }
    );
  }

  log.info("token verified", { dynamicUserId: authResult.dynamicUserId });

  // Verify user is an organizer
  log.info("checking user role");
  const { data: userRow, error: userError } = await supabaseAdmin
    .from(USERS_TABLE)
    .select("uid, role")
    .eq("uid", authResult.dynamicUserId)
    .maybeSingle();

  if (userError) {
    log.error("failed to load user role", { error: userError.message });
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  if (!userRow || userRow.role !== "organizer") {
    log.warn("user is not organizer", {
      userExists: Boolean(userRow),
      role: userRow?.role ?? null,
    });
    return NextResponse.json(
      { error: "Only organizers can upload event images." },
      { status: 403 }
    );
  }

  // Generate unique filename
  const filename = generateImageFilename(authResult.dynamicUserId, file.type);
  log.info("uploading event image", { filename });

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await supabaseAdmin.storage
      .from("events")
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      log.error("storage upload error", { error: error.message });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from("events").getPublicUrl(data.path);

    log.info("event image uploaded successfully", {
      url: publicUrl,
      path: data.path,
    });

    return NextResponse.json({
      url: publicUrl,
      path: data.path,
    });
  } catch (err) {
    log.error("upload exception", { error: err });
    return NextResponse.json(
      { error: "An unexpected error occurred during upload." },
      { status: 500 }
    );
  }
}