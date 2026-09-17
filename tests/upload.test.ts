import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createUploadSignature } from "@/lib/cloudinary";
import {
  ALLOWED_UPLOAD_FORMATS,
  MAX_UPLOAD_BYTES,
  giftAssetFolder,
  isGiftAssetId,
} from "@/lib/images";
import { validateImageFile } from "@/lib/upload";

const jpeg = (size = 1024) => ({ name: "foto.jpg", type: "image/jpeg", size });

describe("validateImageFile", () => {
  it("acepta JPG, PNG y WebP dentro del tamaño", () => {
    expect(validateImageFile(jpeg())).toBeNull();
    expect(
      validateImageFile({ name: "lugar.png", type: "image/png", size: 2048 }),
    ).toBeNull();
    expect(
      validateImageFile({ name: "qr.webp", type: "image/webp", size: 512 }),
    ).toBeNull();
  });

  it("rechaza un archivo que no es imagen", () => {
    expect(
      validateImageFile({ name: "recibo.pdf", type: "application/pdf", size: 1024 }),
    ).toBe('"recibo.pdf" no es JPG, PNG o WebP.');
  });

  it("rechaza un archivo más pesado que el máximo", () => {
    expect(validateImageFile(jpeg(MAX_UPLOAD_BYTES + 1))).toBe(
      '"foto.jpg" pesa más de 5 MB.',
    );
  });

  it("acepta un archivo que pesa justo el máximo", () => {
    expect(validateImageFile(jpeg(MAX_UPLOAD_BYTES))).toBeNull();
  });

  it("respeta un tope distinto al del evento", () => {
    expect(validateImageFile(jpeg(2 * 1024 * 1024), 1024 * 1024)).toBe(
      '"foto.jpg" pesa más de 1 MB.',
    );
  });
});

describe("giftAssetFolder", () => {
  it("cuelga de la carpeta raíz de la cuenta", () => {
    expect(giftAssetFolder("ev1")).toBe("invitador/regalos/ev1");
  });
});

describe("isGiftAssetId", () => {
  it("acepta un asset de la carpeta de regalos del evento", () => {
    expect(isGiftAssetId("ev1", "invitador/regalos/ev1/abc123")).toBe(true);
  });

  it("rechaza el asset de otro evento", () => {
    expect(isGiftAssetId("ev1", "invitador/regalos/ev2/abc123")).toBe(false);
  });

  it("no confunde un evento con otro cuyo id empieza igual", () => {
    expect(isGiftAssetId("ev1", "invitador/regalos/ev10/abc123")).toBe(false);
  });

  it("rechaza un asset del anfitrión o la carpeta sin archivo", () => {
    expect(isGiftAssetId("ev1", "invitador/host1/foto")).toBe(false);
    expect(isGiftAssetId("ev1", giftAssetFolder("ev1"))).toBe(false);
  });
});

const API_SECRET = "test-api-secret";

/**
 * Reimplementa el algoritmo de firma de Cloudinary (SHA1 sobre los parámetros
 * ordenados y unidos por `&`, con el `api_secret` al final) para comprobar qué
 * campos entran en la firma sin depender del propio SDK.
 */
function expectedSignature(params: Record<string, string | number>): string {
  const toSign = Object.entries(params)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => [key, String(value)] as const)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value.replace(/&/g, "%26")}`)
    .join("&");

  return createHash("sha1").update(`${toSign}${API_SECRET}`).digest("hex");
}

describe("createUploadSignature", () => {
  beforeEach(() => {
    vi.stubEnv("CLOUDINARY_CLOUD_NAME", "demo");
    vi.stubEnv("CLOUDINARY_API_KEY", "key");
    vi.stubEnv("CLOUDINARY_API_SECRET", API_SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("firma folder, timestamp, allowed_formats y max_bytes", () => {
    const folder = "invitador/host-1";
    const timestamp = 1_700_000_000;
    const allowedFormats = ALLOWED_UPLOAD_FORMATS.join(",");

    const signature = createUploadSignature({
      folder,
      timestamp,
      allowedFormats,
      maxBytes: MAX_UPLOAD_BYTES,
    });

    expect(signature).toBe(
      expectedSignature({
        allowed_formats: allowedFormats,
        folder,
        max_bytes: MAX_UPLOAD_BYTES,
        timestamp,
      }),
    );
  });

  it("cambia si cambia la lista de formatos permitidos", () => {
    const base = {
      folder: "invitador/host-1",
      timestamp: 1_700_000_000,
      maxBytes: MAX_UPLOAD_BYTES,
    };

    expect(
      createUploadSignature({ ...base, allowedFormats: "jpg,png" }),
    ).not.toBe(createUploadSignature({ ...base, allowedFormats: "jpg" }));
  });

  it("cambia si cambia el tamaño máximo", () => {
    const base = {
      folder: "invitador/host-1",
      timestamp: 1_700_000_000,
      allowedFormats: "jpg,png",
    };

    expect(createUploadSignature({ ...base, maxBytes: 1024 })).not.toBe(
      createUploadSignature({ ...base, maxBytes: 2048 }),
    );
  });
});
