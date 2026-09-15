"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { PASSWORD_MIN_LENGTH } from "@/lib/constants";
import {
  errorClass,
  helpClass,
  inputClass,
  labelClass,
  primaryButtonClass,
} from "@/lib/ui";
import { createUserSchema, type CreateUserValues } from "@/lib/validations/auth";

const EMPTY_VALUES: CreateUserValues = {
  email: "",
  name: "",
  password: "",
  isSuperAdmin: false,
};

export function CreateUserForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: EMPTY_VALUES,
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setCreatedEmail(null);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setServerError(payload?.error ?? "No pudimos crear el usuario.");
        return;
      }

      setCreatedEmail(values.email);
      reset(EMPTY_VALUES);
      router.refresh();
    } catch {
      setServerError("Revisa tu conexión e intenta de nuevo.");
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="user-email" className={labelClass}>
          Email
        </label>
        <input
          id="user-email"
          type="email"
          autoComplete="off"
          inputMode="email"
          placeholder="invitado@email.com"
          className={inputClass}
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
        {errors.email ? <p className={errorClass}>{errors.email.message}</p> : null}
      </div>

      <div>
        <label htmlFor="user-name" className={labelClass}>
          Nombre <span className="font-normal text-slate-400">(opcional)</span>
        </label>
        <input
          id="user-name"
          type="text"
          autoComplete="off"
          placeholder="Nombre del usuario"
          className={inputClass}
          aria-invalid={Boolean(errors.name)}
          {...register("name")}
        />
        {errors.name ? <p className={errorClass}>{errors.name.message}</p> : null}
      </div>

      <div>
        <label htmlFor="user-password" className={labelClass}>
          Contraseña
        </label>
        <input
          id="user-password"
          type="text"
          autoComplete="off"
          className={inputClass}
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
        {errors.password ? (
          <p className={errorClass}>{errors.password.message}</p>
        ) : (
          <p className={helpClass}>
            Mínimo {PASSWORD_MIN_LENGTH} caracteres. Compártela con el usuario.
          </p>
        )}
      </div>

      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          {...register("isSuperAdmin")}
        />
        <span>
          Es administrador
          <span className="block text-xs text-slate-500">
            Podrá crear usuarios y ver todos los eventos.
          </span>
        </span>
      </label>

      {createdEmail ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Cuenta creada para <strong>{createdEmail}</strong>.
        </p>
      ) : null}

      {serverError ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {serverError}
        </p>
      ) : null}

      <button type="submit" className={`${primaryButtonClass} w-full`} disabled={isSubmitting}>
        {isSubmitting ? "Creando…" : "Crear usuario"}
      </button>
    </form>
  );
}
