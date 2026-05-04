"use client";

import { UploadCloud } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  type ChangeEvent,
  type DragEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { useDynamicContext, getAuthToken } from "@dynamic-labs/sdk-react-core";
import { cn } from "@/lib/utils";

// Client-side validation constants
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_EVENT_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
  bucket: "avatars" | "events";
  maxSizeMB?: number;
  aspectRatio?: number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  theme?: "light" | "dark";
  compact?: boolean;
}

type FileStatus = "idle" | "dragging" | "uploading" | "error";

interface FileError {
  message: string;
  code: string;
}

const FILE_SIZES = [
  "Bytes",
  "KB",
  "MB",
  "GB",
  "TB",
  "PB",
  "EB",
  "ZB",
  "YB",
] as const;

const formatBytes = (bytes: number, decimals = 2): string => {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const unit = FILE_SIZES[i] || FILE_SIZES[FILE_SIZES.length - 1];
  return `${Number.parseFloat((bytes / k ** i).toFixed(dm))} ${unit}`;
};

const UploadIllustration = ({
  dark = false,
  compact = false,
}: {
  dark?: boolean;
  compact?: boolean;
}) => (
  <div className={cn("relative", compact ? "h-12 w-12" : "h-16 w-16")}>
    <svg
      aria-label="Upload illustration"
      className="h-full w-full"
      fill="none"
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Upload File Illustration</title>
      <circle
        className={cn(dark ? "stroke-gray-700" : "stroke-gray-200")}
        cx="50"
        cy="50"
        r="45"
        strokeDasharray="4 4"
        strokeWidth="2"
      >
        <animateTransform
          attributeName="transform"
          dur="60s"
          from="0 50 50"
          repeatCount="indefinite"
          to="360 50 50"
          type="rotate"
        />
      </circle>

      <path
        className={cn(
          dark
            ? "fill-blue-900/30 stroke-blue-400"
            : "fill-blue-100 stroke-blue-500"
        )}
        d="M30 35H70C75 35 75 40 75 40V65C75 70 70 70 70 70H30C25 70 25 65 25 65V40C25 35 30 35 30 35Z"
        strokeWidth="2"
      >
        <animate
          attributeName="d"
          dur="2s"
          repeatCount="indefinite"
          values="
            M30 35H70C75 35 75 40 75 40V65C75 70 70 70 70 70H30C25 70 25 65 25 65V40C25 35 30 35 30 35Z;
            M30 38H70C75 38 75 43 75 43V68C75 73 70 73 70 73H30C25 73 25 68 25 68V43C25 38 30 38 30 38Z;
            M30 35H70C75 35 75 40 75 40V65C75 70 70 70 70 70H30C25 70 25 65 25 65V40C25 35 30 35 30 35Z"
        />
      </path>

      <path
        className={cn(dark ? "stroke-blue-400" : "stroke-blue-500")}
        d="M30 35C30 35 35 35 40 35C45 35 45 30 50 30C55 30 55 35 60 35C65 35 70 35 70 35"
        fill="none"
        strokeWidth="2"
      />

      <g className="translate-y-2 transform">
        <line
          className={cn(dark ? "stroke-blue-400" : "stroke-blue-500")}
          strokeLinecap="round"
          strokeWidth="2"
          x1="50"
          x2="50"
          y1="45"
          y2="60"
        >
          <animate
            attributeName="y2"
            dur="2s"
            repeatCount="indefinite"
            values="60;55;60"
          />
        </line>
        <polyline
          className={cn(dark ? "stroke-blue-400" : "stroke-blue-500")}
          fill="none"
          points="42,52 50,45 58,52"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        >
          <animate
            attributeName="points"
            dur="2s"
            repeatCount="indefinite"
            values="42,52 50,45 58,52;42,47 50,40 58,47;42,52 50,45 58,52"
          />
        </polyline>
      </g>
    </svg>
  </div>
);

const UploadingAnimation = ({ progress }: { progress: number }) => {
  const maskId = useId();

  return (
    <div className="relative h-16 w-16">
      <svg
        aria-label={`Upload progress: ${Math.round(progress)}%`}
        className="h-full w-full"
        fill="none"
        viewBox="0 0 240 240"
        xmlns="http://www.w3.org/2000/svg"
      >
        <title>Upload Progress Indicator</title>

        <defs>
          <mask id={maskId}>
            <rect fill="black" height="240" width="240" />
            <circle
              cx="120"
              cy="120"
              fill="white"
              r="120"
              strokeDasharray={`${(progress / 100) * 754}, 754`}
              transform="rotate(-90 120 120)"
            />
          </mask>
        </defs>

        <style>
          {`
            @keyframes rotate-cw {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes rotate-ccw {
              from { transform: rotate(360deg); }
              to { transform: rotate(0deg); }
            }
            .g-spin circle {
              transform-origin: 120px 120px;
            }
            .g-spin circle:nth-child(1) { animation: rotate-cw 8s linear infinite; }
            .g-spin circle:nth-child(2) { animation: rotate-ccw 8s linear infinite; }
            .g-spin circle:nth-child(3) { animation: rotate-cw 8s linear infinite; }
            .g-spin circle:nth-child(4) { animation: rotate-ccw 8s linear infinite; }
            .g-spin circle:nth-child(5) { animation: rotate-cw 8s linear infinite; }
            .g-spin circle:nth-child(6) { animation: rotate-ccw 8s linear infinite; }
            .g-spin circle:nth-child(7) { animation: rotate-cw 8s linear infinite; }
            .g-spin circle:nth-child(8) { animation: rotate-ccw 8s linear infinite; }
            .g-spin circle:nth-child(9) { animation: rotate-cw 8s linear infinite; }
            .g-spin circle:nth-child(10) { animation: rotate-ccw 8s linear infinite; }
            .g-spin circle:nth-child(11) { animation: rotate-cw 8s linear infinite; }
            .g-spin circle:nth-child(12) { animation: rotate-ccw 8s linear infinite; }
            .g-spin circle:nth-child(13) { animation: rotate-cw 8s linear infinite; }
            .g-spin circle:nth-child(14) { animation: rotate-ccw 8s linear infinite; }

            .g-spin circle:nth-child(2n) { animation-delay: 0.2s; }
            .g-spin circle:nth-child(3n) { animation-delay: 0.3s; }
            .g-spin circle:nth-child(5n) { animation-delay: 0.5s; }
            .g-spin circle:nth-child(7n) { animation-delay: 0.7s; }
          `}
        </style>

        <g
          className="g-spin"
          mask={`url(#${maskId})`}
          strokeDasharray="18% 40%"
          strokeWidth="10"
        >
          <circle cx="120" cy="120" opacity="0.95" r="150" stroke="#FF2E7E" />
          <circle cx="120" cy="120" opacity="0.95" r="140" stroke="#FFD600" />
          <circle cx="120" cy="120" opacity="0.95" r="130" stroke="#00E5FF" />
          <circle cx="120" cy="120" opacity="0.95" r="120" stroke="#FF3D71" />
          <circle cx="120" cy="120" opacity="0.95" r="110" stroke="#4ADE80" />
          <circle cx="120" cy="120" opacity="0.95" r="100" stroke="#2196F3" />
          <circle cx="120" cy="120" opacity="0.95" r="90" stroke="#FFA726" />
          <circle cx="120" cy="120" opacity="0.95" r="80" stroke="#FF1493" />
          <circle cx="120" cy="120" opacity="0.95" r="70" stroke="#FFEB3B" />
          <circle cx="120" cy="120" opacity="0.95" r="60" stroke="#00BCD4" />
          <circle cx="120" cy="120" opacity="0.95" r="50" stroke="#FF4081" />
          <circle cx="120" cy="120" opacity="0.95" r="40" stroke="#76FF03" />
          <circle cx="120" cy="120" opacity="0.95" r="30" stroke="#448AFF" />
          <circle cx="120" cy="120" opacity="0.95" r="20" stroke="#FF3D00" />
        </g>
      </svg>
    </div>
  );
};

export function ImageUpload({
  value,
  onChange,
  onUploadingChange,
  bucket,
  maxSizeMB,
  aspectRatio,
  placeholder = "Drop image or click to upload",
  className = "",
  disabled = false,
  theme = "light",
  compact = false,
}: ImageUploadProps) {
  const { user } = useDynamicContext();
  const [status, setStatus] = useState<FileStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<FileError | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadProgressIntervalRef = useRef<ReturnType<
    typeof setInterval
  > | null>(null);
  const uploadAbortRef = useRef<AbortController | null>(null);

  const maxSize = maxSizeMB
    ? maxSizeMB * 1024 * 1024
    : bucket === "avatars"
      ? MAX_AVATAR_SIZE
      : MAX_EVENT_IMAGE_SIZE;

  const setUploadIdle = useCallback(() => {
    setStatus("idle");
    setUploadProgress(0);
    setFile(null);
    onUploadingChange?.(false);
  }, [onUploadingChange]);

  useEffect(
    () => () => {
      if (uploadProgressIntervalRef.current) {
        clearInterval(uploadProgressIntervalRef.current);
      }
      uploadAbortRef.current?.abort();
    },
    []
  );

  const handleError = useCallback(
    (nextError: FileError) => {
      setError(nextError);
      setStatus("error");
      onUploadingChange?.(false);

      setTimeout(() => {
        setError(null);
        setStatus("idle");
      }, 3000);
    },
    [onUploadingChange]
  );

  const uploadFile = useCallback(
    async (file: File) => {
      if (disabled || status === "uploading") return;

      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        handleError({
          code: "INVALID_FILE_TYPE",
          message: "Invalid file type. Only JPEG, PNG, WebP, and GIF allowed.",
        });
        return;
      }

      if (file.size > maxSize) {
        const maxSizeDisplay = Math.round(maxSize / (1024 * 1024));
        handleError({
          code: "FILE_TOO_LARGE",
          message: `File too large. Maximum size is ${maxSizeDisplay}MB.`,
        });
        return;
      }

      setError(null);
      setStatus("uploading");
      setUploadProgress(0);
      setFile(file);
      onUploadingChange?.(true);

      try {
        const authToken = getAuthToken();
        if (!authToken) {
          handleError({
            code: "AUTH_REQUIRED",
            message: "Please connect your wallet to upload.",
          });
          return;
        }

        if (uploadProgressIntervalRef.current) {
          clearInterval(uploadProgressIntervalRef.current);
        }

        const abortController = new AbortController();
        uploadAbortRef.current = abortController;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("dynamicUserId", user?.userId || "");

        uploadProgressIntervalRef.current = setInterval(() => {
          setUploadProgress((prev) => Math.min(prev + 10, 90));
        }, 100);

        const apiPath =
          bucket === "avatars"
            ? "/api/uploads/avatar"
            : "/api/uploads/event-image";

        const response = await fetch(apiPath, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          body: formData,
          signal: abortController.signal,
        });

        if (uploadProgressIntervalRef.current) {
          clearInterval(uploadProgressIntervalRef.current);
        }
        setUploadProgress(100);

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          handleError({
            code: "UPLOAD_FAILED",
            message:
              typeof data.error === "string" && data.error.trim()
                ? data.error
                : "Upload failed.",
          });
          return;
        }

        if (typeof data.url !== "string" || !data.url.trim()) {
          handleError({
            code: "INVALID_UPLOAD_RESPONSE",
            message: "Upload succeeded but no file URL was returned.",
          });
          return;
        }

        onChange(data.url.trim());

        setTimeout(() => {
          setUploadIdle();
        }, 300);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          setUploadIdle();
          return;
        }

        handleError({
          code: "UPLOAD_FAILED",
          message:
            err instanceof Error
              ? err.message
              : "Upload failed. Please try again.",
        });
      }
    },
    [
      bucket,
      disabled,
      handleError,
      maxSize,
      onChange,
      onUploadingChange,
      setUploadIdle,
      status,
      user,
    ]
  );

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled || status === "uploading") return;
      setStatus("dragging");
    },
    [disabled, status]
  );

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setStatus((prev) => (prev === "dragging" ? "idle" : prev));
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled || status === "uploading") return;
      setStatus("idle");

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        uploadFile(files[0]);
      }
    },
    [disabled, status, uploadFile]
  );

  const handleFileInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        uploadFile(files[0]);
      }
      e.target.value = "";
    },
    [uploadFile]
  );

  const handleClick = useCallback(() => {
    if (!disabled && status !== "uploading") {
      fileInputRef.current?.click();
    }
  }, [disabled, status]);

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (status === "uploading") return;
      setIsRemoving(true);
      setTimeout(() => {
        onChange("");
        setError(null);
        setFile(null);
        setStatus("idle");
        setIsRemoving(false);
      }, 150);
    },
    [onChange, status]
  );

  const handleCancelUpload = useCallback(() => {
    uploadAbortRef.current?.abort();
    if (uploadProgressIntervalRef.current) {
      clearInterval(uploadProgressIntervalRef.current);
    }
    setUploadIdle();
  }, [setUploadIdle]);

  const acceptedTypesText = ALLOWED_IMAGE_TYPES.map(
    (type) => type.split("/")[1]
  )
    .join(", ")
    .toUpperCase();
  const containerStyle = aspectRatio
    ? { aspectRatio: `${aspectRatio}` }
    : undefined;
  const isUploading = status === "uploading";
  const isDarkTheme = theme === "dark";

  const renderUploadPrompt = () => (
    <>
      <div className={cn(compact ? "mb-2" : "mb-4")}>
        <UploadIllustration dark={isDarkTheme} compact={compact} />
      </div>

      <div
        className={cn(
          "text-center",
          compact ? "mb-2 space-y-1" : "mb-4 space-y-1.5"
        )}
      >
        <h3
          className={cn(
            "font-semibold tracking-tight",
            compact ? "text-sm" : "text-lg",
            isDarkTheme ? "text-white" : "text-gray-900"
          )}
        >
          Drag and drop or
        </h3>
        <p
          className={cn(
            "text-xs",
            isDarkTheme ? "text-gray-400" : "text-gray-500"
          )}
        >
          {acceptedTypesText} up to {formatBytes(maxSize)}
        </p>
      </div>

      <button
        className={cn(
          "group flex w-full items-center justify-center gap-2 rounded-lg px-4 font-semibold text-sm transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 sm:w-4/5",
          compact ? "py-2" : "py-2.5",
          isDarkTheme
            ? "bg-white/10 text-white hover:bg-white/20"
            : "bg-gray-100 text-gray-900 hover:bg-gray-200"
        )}
        disabled={disabled}
        onClick={handleClick}
        type="button"
      >
        <span>{value ? "Replace File" : "Upload File"}</span>
        <UploadCloud className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
      </button>

      <p
        className={cn(
          compact ? "mt-2" : "mt-3",
          "text-xs",
          isDarkTheme ? "text-gray-400" : "text-gray-500"
        )}
      >
        or drag and drop your file here
      </p>
    </>
  );

  const renderPreview = () => (
    <>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${value})` }}
      />
      <div className="absolute inset-0 bg-black/40" />

      <div
        className={cn(
          "absolute inset-0 flex flex-col items-center justify-center",
          compact ? "p-3" : "p-6"
        )}
      >
        {renderUploadPrompt()}
      </div>

      <button
        className="absolute top-2 right-2 rounded-full bg-black/60 p-2 text-white/80 transition-colors hover:bg-black/80 hover:text-white"
        onClick={handleRemove}
        type="button"
      >
        <svg
          fill="none"
          height="16"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="16"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </>
  );

  return (
    <div
      className={cn(
        "relative w-full transition-all duration-150",
        isRemoving ? "scale-95 opacity-0" : "scale-100 opacity-100",
        className
      )}
      style={containerStyle}
    >
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={disabled ? -1 : 0}
        className={cn(
          "group relative h-full w-full overflow-hidden rounded-xl bg-white p-0.5 ring-1 ring-gray-200 transition-all duration-200 dark:bg-black dark:ring-white/10",
          isDarkTheme && "bg-[#090d13] ring-white/10",
          !disabled && status === "dragging" && "ring-blue-500/60",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <div className="absolute inset-x-0 -top-px h-px w-full bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />

        <div
          className={cn(
            "relative h-full w-full rounded-[10px] p-1.5",
            isDarkTheme ? "bg-white/[0.02]" : "bg-gray-50/50"
          )}
        >
          <div
            className={cn(
              "relative h-full w-full overflow-hidden rounded-lg border",
              isDarkTheme
                ? "border-white/[0.08] bg-black/50"
                : "border-gray-100 bg-white",
              status === "error" && "border-red-500/50"
            )}
          >
            <div
              className={cn(
                "absolute inset-0 transition-opacity duration-300",
                status === "dragging" ? "opacity-100" : "opacity-0"
              )}
            >
              <div className="absolute inset-x-0 top-0 h-[20%] bg-gradient-to-b from-blue-500/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-[20%] bg-gradient-to-t from-blue-500/10 to-transparent" />
              <div className="absolute inset-y-0 left-0 w-[20%] bg-gradient-to-r from-blue-500/10 to-transparent" />
              <div className="absolute inset-y-0 right-0 w-[20%] bg-gradient-to-l from-blue-500/10 to-transparent" />
              <div className="absolute inset-[20%] animate-pulse rounded-lg bg-blue-500/5 transition-all duration-300" />
            </div>

            <div className="absolute -top-4 -right-4 h-8 w-8 bg-gradient-to-br from-blue-500/20 to-transparent opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-100" />

            <div className="relative h-full">
              <AnimatePresence mode="wait">
                {!isUploading ? (
                  <motion.div
                    animate={{
                      opacity: status === "dragging" ? 0.85 : 1,
                      y: 0,
                      scale: status === "dragging" ? 0.98 : 1,
                    }}
                    className={cn(
                      "absolute inset-0 flex flex-col items-center justify-center",
                      compact ? "p-4" : "p-6"
                    )}
                    exit={{ opacity: 0, y: -10 }}
                    initial={{ opacity: 0, y: 10 }}
                    key="dropzone"
                    transition={{ duration: 0.2 }}
                  >
                    {value ? renderPreview() : renderUploadPrompt()}
                    {!value && <p className="sr-only">{placeholder}</p>}
                  </motion.div>
                ) : (
                  <motion.div
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                      "absolute inset-0 flex flex-col items-center justify-center",
                      compact ? "p-4" : "p-6"
                    )}
                    exit={{ opacity: 0, scale: 0.95 }}
                    initial={{ opacity: 0, scale: 0.95 }}
                    key="uploading"
                  >
                    <div className="mb-4">
                      <UploadingAnimation progress={uploadProgress} />
                    </div>

                    <div className="mb-4 space-y-1.5 text-center">
                      <h3
                        className={cn(
                          "truncate font-semibold text-sm",
                          isDarkTheme ? "text-white" : "text-gray-900"
                        )}
                      >
                        {file?.name}
                      </h3>
                      <div className="flex items-center justify-center gap-2 text-xs">
                        <span
                          className={cn(
                            isDarkTheme ? "text-gray-400" : "text-gray-500"
                          )}
                        >
                          {formatBytes(file?.size || 0)}
                        </span>
                        <span className="font-medium text-blue-500">
                          {Math.round(uploadProgress)}%
                        </span>
                      </div>
                    </div>

                    <button
                      className={cn(
                        "flex w-full items-center justify-center gap-2 rounded-lg px-4 font-semibold text-sm transition-all duration-200 sm:w-4/5",
                        compact ? "py-2" : "py-2.5",
                        isDarkTheme
                          ? "bg-white/10 text-white hover:bg-white/20"
                          : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                      )}
                      onClick={handleCancelUpload}
                      type="button"
                    >
                      Cancel
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 transform rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2"
                  exit={{ opacity: 0, y: -10 }}
                  initial={{ opacity: 0, y: 10 }}
                >
                  <p className="text-red-500 text-sm dark:text-red-400">
                    {error.message}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(",")}
        onChange={handleFileInput}
        disabled={disabled || isUploading}
        className="sr-only"
      />
    </div>
  );
}
