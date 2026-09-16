import { describe, expect, it } from "vitest";
import { footerRibbonItems, getEventTypeLabel } from "@/lib/constants";
import { optimizedImageUrl, socialImageUrl } from "@/lib/images";

describe("getEventTypeLabel", () => {
  it("usa la etiqueta del tipo cuando no hay etiqueta personalizada", () => {
    expect(getEventTypeLabel("BODA")).toBe("Boda");
  });

  it("prioriza la etiqueta personalizada (recortada)", () => {
    expect(getEventTypeLabel("OTRO", "  Despedida  ")).toBe("Despedida");
  });

  it("ignora una etiqueta personalizada vacía", () => {
    expect(getEventTypeLabel("BABY_SHOWER", "   ")).toBe("Baby Shower");
  });
});

describe("optimizedImageUrl", () => {
  it("inserta las transformaciones de Cloudinary", () => {
    const url = "https://res.cloudinary.com/demo/image/upload/v1/foto.jpg";
    expect(optimizedImageUrl(url, 400)).toContain(
      "/image/upload/f_auto,q_auto,dpr_auto,c_limit,w_400/",
    );
  });

  it("devuelve la URL intacta si no es de Cloudinary", () => {
    expect(optimizedImageUrl("https://example.com/foto.jpg")).toBe(
      "https://example.com/foto.jpg",
    );
  });
});

describe("socialImageUrl", () => {
  it("genera una variante 1200x630 para Open Graph", () => {
    const url = "https://res.cloudinary.com/demo/image/upload/v1/foto.jpg";
    expect(socialImageUrl(url)).toContain(
      "/image/upload/f_auto,q_auto,c_fill,g_auto,w_1200,h_630/",
    );
  });
});

describe("footerRibbonItems", () => {
  it("reúne los créditos del pie en una sola lista", () => {
    expect(footerRibbonItems(2026)).toEqual([
      "Invitación creada con Invitador",
      "Desarrollado por Pisanucas Tec",
      "Todos los derechos reservados © 2026",
    ]);
  });

  it("usa el año recibido en la reserva de derechos", () => {
    const items = footerRibbonItems(2030);
    expect(items[items.length - 1]).toBe(
      "Todos los derechos reservados © 2030",
    );
  });
});
