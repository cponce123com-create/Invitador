import { describe, expect, it } from "vitest";
import {
  CLOUDINARY_FOLDER_ROOT,
  giftAssetFolder,
  hostAssetFolder,
  isGiftAssetId,
  isHostAssetId,
} from "@/lib/images";

describe("hostAssetFolder", () => {
  it("cuelga de la carpeta raíz de la cuenta", () => {
    expect(hostAssetFolder("host-1")).toBe(`${CLOUDINARY_FOLDER_ROOT}/host-1`);
  });
});

describe("isHostAssetId", () => {
  it("acepta un asset de la carpeta del anfitrión", () => {
    expect(isHostAssetId("host-1", "invitador/host-1/foto.jpg")).toBe(true);
    expect(isHostAssetId("host-1", "invitador/host-1/galeria/otra.webp")).toBe(
      true,
    );
  });

  it("rechaza el asset de otro anfitrión", () => {
    expect(isHostAssetId("host-1", "invitador/host-2/foto.jpg")).toBe(false);
  });

  it("no se deja engañar por un id que solo comparte el prefijo", () => {
    expect(isHostAssetId("host-1", "invitador/host-12/foto.jpg")).toBe(false);
  });

  it("rechaza la carpeta vacía, la raíz y otros orígenes", () => {
    expect(isHostAssetId("host-1", "invitador/host-1")).toBe(false);
    expect(isHostAssetId("host-1", "invitador/host-1/")).toBe(false);
    expect(isHostAssetId("host-1", "otra-cuenta/host-1/foto.jpg")).toBe(false);
    expect(isHostAssetId("host-1", "")).toBe(false);
  });
});

describe("giftAssetFolder", () => {
  it("separa los comprobantes por evento", () => {
    expect(giftAssetFolder("ev1")).toBe(
      `${CLOUDINARY_FOLDER_ROOT}/regalos/ev1`,
    );
  });
});

describe("isGiftAssetId", () => {
  it("acepta un comprobante de la carpeta del evento", () => {
    expect(isGiftAssetId("ev1", "invitador/regalos/ev1/recibo.jpg")).toBe(true);
  });

  it("rechaza el comprobante de otro evento", () => {
    expect(isGiftAssetId("ev1", "invitador/regalos/ev2/recibo.jpg")).toBe(false);
    expect(isGiftAssetId("ev1", "invitador/regalos/ev12/recibo.jpg")).toBe(
      false,
    );
  });

  it("rechaza una foto del anfitrión aunque sea de la misma cuenta", () => {
    expect(isGiftAssetId("ev1", "invitador/host-1/foto.jpg")).toBe(false);
  });
});
