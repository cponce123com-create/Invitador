"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  errorClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/lib/ui";
import {
  requestMagicLinkSchema,
  type RequestMagicLinkValues,
} from "@/lib/validations/auth";

export function LoginForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RequestMagicLinkValues>({
    resolver: zodResolver(requestMagicLinkSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const response = await fetch("/api/auth/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setServerError(payload?.error ?? "No pudimos enviar el enlace. Intenta de nuevo.");
        return;
      }

      setSentTo(values.email);
    } catch {
      setServerError("Revisa tu conexión e intenta de nuevo.");
    }
  });

  if (sentTo) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-3xl">
          📬
        </div>
        <h2 className="text-xl font-bold text-slate-900">Revisa tu correo</h2>
        <p className="text-sm text-slate-600">
          Enviamos un enlace de acceso a <strong className="text-slate-900">{sentTo}</strong>.
          Caduca en 15 minutos y solo funciona una vez.
        </p>
        <p className="text-xs text-slate-500">
          ¿No llegó? Revisa la carpeta de spam o vuelve a intentarlo.
        </p>
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() => {
            setSentTo(null);
            reset({ email: sentTo });
          }}
        >
          Usar otro email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="email" className={labelClass}>
          Tu email
        </label>
        <input
          id="email"
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

      {serverError ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{serverError}</p>
      ) : null}

      <button type="submit" className={`${primaryButtonClass} w-full`} disabled={isSubmitting}>
        {isSubmitting ? "Enviando…" : "Enviarme el enlace de acceso"}
      </button>

      <p className="text-center text-xs text-slate-500">
        Sin contraseñas. Te enviamos un enlace de un solo uso.
      </p>
    </form>
  );
}
