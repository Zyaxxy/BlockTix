import { createRemoteJWKSet, jwtVerify } from "jose";

const DYNAMIC_API_BASE = "https://app.dynamicauth.com/api/v0";

if (typeof window !== "undefined") {
  throw new Error("lib/dynamic-server-auth.ts can only be imported on the server.");
}

const getDynamicEnvironmentId = () => {
  return (
    process.env.DYNAMIC_ENVIRONMENT_ID ??
    process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID
  );
};

const getBearerToken = (request: Request): string | null => {
  const authorization = request.headers.get("authorization");
  if (!authorization) return null;

  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
};

export const verifyDynamicToken = async (
  request: Request,
  expectedDynamicUserId?: string
): Promise<{ dynamicUserId: string | null; error: string | null }> => {
  const token = getBearerToken(request);
  if (!token) {
    return { dynamicUserId: null, error: "Missing Dynamic bearer token." };
  }

  const environmentId = getDynamicEnvironmentId();
  if (!environmentId) {
    return {
      dynamicUserId: null,
      error: "Missing Dynamic environment id configuration.",
    };
  }

  const jwks = createRemoteJWKSet(
    new URL(`${DYNAMIC_API_BASE}/sdk/${environmentId}/.well-known/jwks`)
  );

  try {
    const { payload } = await jwtVerify(token, jwks, {
      clockTolerance: 5,
    });

    const sub = typeof payload.sub === "string" ? payload.sub : null;

    if (!sub) {
      return { dynamicUserId: null, error: "Dynamic token is missing a subject claim." };
    }

    if (expectedDynamicUserId && expectedDynamicUserId !== sub) {
      return { dynamicUserId: null, error: "Dynamic token subject mismatch." };
    }

    return { dynamicUserId: sub, error: null };
  } catch {
    return { dynamicUserId: null, error: "Invalid or expired Dynamic token." };
  }
};
