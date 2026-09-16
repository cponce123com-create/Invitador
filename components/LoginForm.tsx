"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { CREDENTIALS_PROVIDER_ID } from "@/lib/constants";
import {
  errorClass,
  inputClass,
  labelClass,
  primaryButtonClass,
} from "@/lib/ui";
import { loginSchema, type LoginValues } from "@/lib/validations/auth";

export function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);

    try {
      const result = await signIn(CREDENTIALS_PROVIDER_ID, {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      // No se distingue entre email inexistente y contraseña incorrecta: es la
      // misma respuesta para no dar pistas a quien intenta adivinar cuentas.
      if (!result || result.error) {
        setServerError("Email o contraseña incorrectos.");
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
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          placeholder="tu@email.com"
          className={inputClass}
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
        {errors.email ? <p role="alert" className={errorClass}>{errors.email.message}</p> : null}
      </div>

      <div>
        <label htmlFor="password" className={labelClass}>
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className={inputClass}
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
        {errors.password ? <p role="alert" className={errorClass}>{errors.password.message}</p> : null}
      </div>

      {serverError ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {serverError}
        </p>
      ) : null}

      <button type="submit" className={`${primaryButtonClass} w-full`} disabled={isSubmitting}>
        {isSubmitting ? "Entrando…" : "Entrar"}
      </button>

      <p className="text-center text-xs text-slate-500">
        ¿No tienes cuenta? Pídesela al administrador.
      </p>
    </form>
  );
}
