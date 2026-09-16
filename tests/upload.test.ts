import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES } from "@/lib/images";
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
