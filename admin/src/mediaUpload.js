import { useLayoutEffect, useMemo, useRef } from "react";

export const supportedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif", "image/svg+xml"];
export const imageUploadAccept = supportedImageTypes.join(",");

export const isImageMediaField = (field = {}) => field.mediaKind === "image" ||
  /^(?:photo|image|featuredImage|thumbnail|poster|portrait|logo|governmentLogo)$/i.test(String(field.name || "").split(".").at(-1));

export async function uploadMediaFile(file, { request, imageOnly = false }) {
  if (imageOnly && !supportedImageTypes.includes(String(file.type || "").toLowerCase())) {
    throw new Error("Choose a JPG, PNG, WebP, AVIF, GIF or SVG image for this photo field.");
  }
  const body = new FormData();
  if (imageOnly) body.append("purpose", "image");
  body.append("file", file);
  const result = await request("/api/admin/media", { method: "POST", body });
  if (!result.data?.public_url) throw new Error("The upload did not return a file address. Please try again.");
  return result.data.public_url;
}

// Async uploads must commit through the current editor callbacks: rows and
// captions may have changed while the request was in flight.
export function useMediaUpload({ request, fileRef, imageOnly = false, identity, value, onStart, onChange, onBusy, onError }) {
  const current = useRef(null);
  const mounted = useRef(false);
  const sequence = useRef(0);
  useLayoutEffect(() => {
    if (current.current && (current.current.value !== value || current.current.identity !== identity)) sequence.current += 1;
    current.current = { identity, value, onStart, onChange, onBusy, onError };
  });
  useLayoutEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  return async (file) => {
    if (!file) return;
    const operation = ++sequence.current;
    const initial = current.current;
    initial.onBusy(true);
    try {
      initial.onStart?.();
      const address = await uploadMediaFile(file, { request, imageOnly });
      if (mounted.current && operation === sequence.current && initial.identity === current.current.identity && initial.value === current.current.value) {
        current.current.onChange(address);
      }
    } catch (error) {
      if (mounted.current && operation === sequence.current) current.current.onError(error.message);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
      initial.onBusy(false);
    }
  };
}

export function createEditorId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // The office CMS uses HTTP: getRandomValues is available even when randomUUID isn't.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Persist these IDs when an upload starts, so inserting/deleting another row
// cannot move an in-flight upload to a different item.
export function useMediaItemList(rows, stringField) {
  return useMemo(() => (Array.isArray(rows) ? rows : []).map((row) => {
    if (typeof row === "string" && stringField) return { id: createEditorId(), [stringField]: row };
    if (!row || typeof row !== "object" || row.id) return row;
    return { ...row, id: createEditorId() };
  }), [rows, stringField]);
}
