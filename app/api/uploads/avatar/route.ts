import { NextResponse } from "next/server";
import { verifyDynamicToken } from "@/lib/auth/dynamic-server-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createDevRequestLogger } from "@/lib/shared/dev-logger";

// Server-side file validation constants
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB

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
  const log = createDevRequestLogger("api/uploads/avatar:POST");
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
  if (file.size > MAX_AVATAR_SIZE) {
    log.warn("file too large", { size: file.size, maxSize: MAX_AVATAR_SIZE });
    return NextResponse.json(
      { error: "File too large. Maximum size is 2MB." },
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

  // Generate unique filename
  const filename = generateImageFilename(authResult.dynamicUserId, file.type);
  log.info("uploading avatar", { filename });

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await supabaseAdmin.storage
      .from("avatars")
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
    } = supabaseAdmin.storage.from("avatars").getPublicUrl(data.path);

    log.info("avatar uploaded successfully", {
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