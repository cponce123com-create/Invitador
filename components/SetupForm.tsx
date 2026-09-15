"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { CREDENTIALS_PROVIDER_ID, PASSWORD_MIN_LENGTH } from "@/lib/constants";
import {
  errorClass,
  helpClass,
  inputClass,
  labelClass,
  primaryButtonClass,
} from "@/lib/ui";
import { setupSchema, type SetupValues } from "@/lib/validations/auth";

export function SetupForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetupValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: { email: "", name: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);

    try {
      const response = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setServerError(payload?.error ?? "No pudimos crear la cuenta. Intenta de nuevo.");
        return;
      }

      // La cuenta ya existe: entramos directamente para no pedirla dos veces.
      const result = await signIn(CREDENTIALS_PROVIDER_ID, {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (!result || result.error) {
        setServerError(
          "La cuenta se creó, pero no pudimos iniciar sesión. Prueba desde la pantalla de acceso.",
        );
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setServerError("Revisa tu conexión e intenta de nuevo.");
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="setup-email" className={labelClass}>
          Tu email
        </label>
        <input
          id="setup-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="tu@email.com"
          className={inputClass}
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
        {errors.email ? <p className={errorClass}>{errors.email.message}</p> : null}
      </div>

      <div>
        <label htmlFor="setup-name" className={labelClass}>
          Tu nombre <span className="font-normal text-slate-400">(opcional)</span>
        </label>
        <input
          id="setup-name"
          type="text"
          autoComplete="name"
          placeholder="Cristian"
          className={inputClass}
          aria-invalid={Boolean(errors.name)}
          {...register("name")}
        />
        {errors.name ? <p className={errorClass}>{errors.name.message}</p> : null}
      </div>

      <div>
        <label htmlFor="setup-password" className={labelClass}>
          Contraseña
        </label>
        <input
          id="setup-password"
          type="password"
          autoComplete="new-password"
          className={inputClass}
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
        {errors.password ? (
          <p className={errorClass}>{errors.password.message}</p>
        ) : (
          <p className={helpClass}>Mínimo {PASSWORD_MIN_LENGTH} caracteres.</p>
        )}
      </div>

      {serverError ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {serverError}
        </p>
      ) : null}

      <button type="submit" className={`${primaryButtonClass} w-full`} disabled={isSubmitting}>
        {isSubmitting ? "Creando…" : "Crear administrador y entrar"}
      </button>
    </form>
  );
}
