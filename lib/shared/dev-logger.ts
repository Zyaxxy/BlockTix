type LogLevel = "info" | "warn" | "error";

const isDevLoggingEnabled = () => {
  return process.env.NODE_ENV !== "production";
};

const serialize = (value: unknown) => {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  return value;
};

const emit = (level: LogLevel, scope: string, message: string, data?: Record<string, unknown>) => {
  if (!isDevLoggingEnabled()) return;

  const payload = {
    ts: new Date().toISOString(),
    level,
    scope,
    message,
    ...(data ? { data: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, serialize(value)])) } : {}),
  };

  if (level === "error") {
    console.error("[blocktix:dev]", payload);
    return;
  }

  if (level === "warn") {
    console.warn("[blocktix:dev]", payload);
    return;
  }

  console.log("[blocktix:dev]", payload);
};

export const createDevRequestLogger = (scope: string) => {
  const requestId = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  const startedAt = Date.now();

  const withBase = (data?: Record<string, unknown>) => ({
    requestId,
    elapsedMs: Date.now() - startedAt,
    ...(data ?? {}),
  });

  return {
    requestId,
    info: (message: string, data?: Record<string, unknown>) => {
      emit("info", scope, message, withBase(data));
    },
    warn: (message: string, data?: Record<string, unknown>) => {
      emit("warn", scope, message, withBase(data));
    },
    error: (message: string, data?: Record<string, unknown>) => {
      emit("error", scope, message, withBase(data));
    },
  };
};
