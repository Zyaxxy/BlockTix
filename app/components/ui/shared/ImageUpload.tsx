"use client";

import { useCallback, useRef, useState } from "react";
import { useDynamicContext, getAuthToken } from "@dynamic-labs/sdk-react-core";

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
}

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
}: ImageUploadProps) {
  const { user } = useDynamicContext();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxSize = maxSizeMB
    ? maxSizeMB * 1024 * 1024
    : bucket === "avatars"
      ? MAX_AVATAR_SIZE
      : MAX_EVENT_IMAGE_SIZE;

  const uploadFile = useCallback(
    async (file: File) => {
      if (disabled) return;

      // Validate file type
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setError("Invalid file type. Only JPEG, PNG, WebP, and GIF allowed.");
        return;
      }

      // Validate file size
      if (file.size > maxSize) {
        const maxSizeDisplay = Math.round(maxSize / (1024 * 1024));
        setError(`File too large. Maximum size is ${maxSizeDisplay}MB.`);
        return;
      }

      setError(null);
      setIsUploading(true);
      setUploadProgress(0);
      onUploadingChange?.(true);

      try {
        const authToken = getAuthToken();
        if (!authToken) {
          setError("Please connect your wallet to upload.");
          setIsUploading(false);
          onUploadingChange?.(false);
          return;
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("dynamicUserId", user?.userId || "");

        // Simulate progress for better UX (fetch doesn't support progress)
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => Math.min(prev + 10, 90));
        }, 100);

        const apiPath = bucket === "avatars" ? "/api/uploads/avatar" : "/api/uploads/event-image";

        const response = await fetch(apiPath, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          body: formData,
        });

        clearInterval(progressInterval);
        setUploadProgress(100);

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Upload failed.");
          setIsUploading(false);
          onUploadingChange?.(false);
          return;
        }

        onChange(data.url);

        // Reset progress after a brief delay
        setTimeout(() => {
          setUploadProgress(0);
          setIsUploading(false);
          onUploadingChange?.(false);
        }, 300);
      } catch (err) {
        console.error("Upload error:", err);
        setError("Upload failed. Please try again.");
        setIsUploading(false);
        onUploadingChange?.(false);
      }
    },
    [bucket, disabled, maxSize, onChange, onUploadingChange, user]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setIsDragOver(true);
    }
  }, [disabled, isUploading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      if (disabled || isUploading) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        uploadFile(files[0]);
      }
    },
    [disabled, isUploading, uploadFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        uploadFile(files[0]);
      }
      // Reset input so same file can be selected again
      e.target.value = "";
    },
    [uploadFile]
  );

  const handleClick = useCallback(() => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  }, [disabled, isUploading]);

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsRemoving(true);
      setTimeout(() => {
        onChange("");
        setError(null);
        setIsRemoving(false);
      }, 150);
    },
    [onChange]
  );

  const containerStyle = aspectRatio
    ? { aspectRatio: `${aspectRatio}` }
    : {};

  return (
    <div className={`relative ${className}`}>
      {/* Drop zone */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={containerStyle}
        className={`
          relative cursor-pointer overflow-hidden rounded-2xl border border-white/20 bg-white/5
          transition-all duration-200
          ${isDragOver ? "border-cyan-400 bg-cyan-400/10" : ""}
          ${disabled ? "cursor-not-allowed opacity-50" : ""}
          ${isRemoving ? "opacity-0 scale-95" : "opacity-100 scale-100"}
          ${value ? "" : "p-8"}
        `}
      >
        {/* Preview image */}
        {value && (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${value})` }}
            />
            <div className="absolute inset-0 bg-black/20" />

            {/* Remove button */}
            {!isUploading && (
              <button
                onClick={handleRemove}
                className="absolute top-2 right-2 rounded-full bg-black/60 p-2 text-white/80 hover:bg-black/80 hover:text-white transition-colors"
                type="button"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            )}
          </>
        )}

        {/* Placeholder / Upload prompt */}
        {!value && (
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white/40"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17,8 12,3 7,8" />
              <line x1="12" x2="12" y1="3" y2="15" />
            </svg>
            <p className="text-sm text-white/50">{placeholder}</p>
            <p className="text-xs text-white/30">
              JPEG, PNG, WebP, GIF up to {Math.round(maxSize / (1024 * 1024))}MB
            </p>
          </div>
        )}

        {/* Progress overlay */}
        {isUploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
            <div className="w-3/4">
              <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
            <p className="text-sm text-white/80">Uploading... {uploadProgress}%</p>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(",")}
        onChange={handleFileInput}
        disabled={disabled || isUploading}
        className="hidden"
      />

      {/* Error message */}
      {error && (
        <p className="mt-2 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}