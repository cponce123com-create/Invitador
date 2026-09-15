import { describe, expect, it } from "vitest";
import { PASSWORD_MIN_LENGTH } from "@/lib/constants";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  createUserSchema,
  loginSchema,
  setupSchema,
} from "@/lib/validations/auth";

describe("hashPassword / verifyPassword", () => {
  it("acepta la contraseña correcta", async () => {
    const hash = await hashPassword("secreta-123");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("secreta-123", hash)).toBe(true);
  });

  it("rechaza una contraseña distinta", async () => {
    const hash = await hashPassword("secreta-123");
    expect(await verifyPassword("secreta-124", hash)).toBe(false);
  });

  it("usa una sal distinta en cada hash", async () => {
    const [a, b] = await Promise.all([
      hashPassword("misma"),
      hashPassword("misma"),
    ]);
    expect(a).not.toBe(b);
    expect(await verifyPassword("misma", a)).toBe(true);
    expect(await verifyPassword("misma", b)).toBe(true);
  });

  it("no lanza con hashes vacíos o corruptos", async () => {
    expect(await verifyPassword("x", null)).toBe(false);
    expect(await verifyPassword("x", "")).toBe(false);
    expect(await verifyPassword("x", "otro-algoritmo$aa$bb")).toBe(false);
    expect(await verifyPassword("x", "scrypt$solo-sal")).toBe(false);
  });
});

describe("loginSchema", () => {
  it("normaliza el email a minúsculas", () => {
    const parsed = loginSchema.parse({
      email: "  USER@Mail.com ",
      password: "x",
    });
    expect(parsed.email).toBe("user@mail.com");
  });

  it("exige un email válido y una contraseña no vacía", () => {
    expect(
      loginSchema.safeParse({ email: "no-es-email", password: "x" }).success,
    ).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(
      false,
    );
  });
});

describe("setupSchema", () => {
  it("exige la longitud mínima de contraseña", () => {
    const corta = "a".repeat(PASSWORD_MIN_LENGTH - 1);
    const justa = "a".repeat(PASSWORD_MIN_LENGTH);

    expect(
      setupSchema.safeParse({ email: "a@b.com", password: corta }).success,
    ).toBe(false);
    expect(
      setupSchema.safeParse({ email: "a@b.com", password: justa }).success,
    ).toBe(true);
  });

  it("permite omitir el nombre", () => {
    expect(
      setupSchema.safeParse({ email: "a@b.com", password: "12345678" }).success,
    ).toBe(true);
  });
});

describe("createUserSchema", () => {
  it("hereda las reglas del alta y acepta isSuperAdmin", () => {
    const result = createUserSchema.safeParse({
      email: "nuevo@mail.com",
      name: "Ana",
      password: "12345678",
      isSuperAdmin: true,
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.isSuperAdmin).toBe(true);
  });

  it("rechaza una contraseña corta", () => {
    expect(
      createUserSchema.safeParse({ email: "a@b.com", password: "corta" }).success,
    ).toBe(false);
  });
});
