# Invitador

Plataforma **multi-tenant** de invitaciones de eventos con confirmación de
asistencia (RSVP). Un anfitrión crea un evento (cumpleaños, baby shower, boda,
bautizo, graduación u otro), sube fotos y comparte un **link público único**.
Cualquier persona con ese link puede ver la invitación y confirmar su asistencia
indicando, si quiere, hasta N acompañantes con su relación.

## Stack

| Capa          | Tecnología                                            |
| ------------- | ----------------------------------------------------- |
| Framework     | Next.js 14 (App Router, TypeScript)                   |
| ORM           | Prisma                                                |
| Base de datos | PostgreSQL en **Neon** (connection string *pooled*)   |
| Imágenes      | **Cloudinary** (subida firmada desde el navegador)    |
| Auth          | Auth.js (NextAuth) con **email + contraseña**         |
| Validación    | Zod + React Hook Form                                 |
| Estilos       | Tailwind CSS                                          |
| Deploy        | **Render** (Web Service)                              |

> **Nota**: aunque el proyecto se desarrolla en un entorno tipo Firebase Studio,
> **no usa ningún servicio de Firebase**. Firebase Studio es solo el editor; la
> infraestructura es Neon + Cloudinary + Render.

## Funcionalidades

- **Alta cerrada de cuentas**: nadie se registra por su cuenta. El primer
  **super admin** se crea en `/setup` y desde `/dashboard/usuarios` da de alta
  al resto de usuarios con email y contraseña. Un anfitrión solo ve y edita sus
  propios eventos.
- **Crear/editar evento** en `/dashboard/eventos/nuevo` y `.../[id]/editar`:
  título, tipo, detalle libre, fecha y hora, ubicación, descripción, fotos
  (con portada) y el tope de acompañantes por confirmación.
- **Página pública** en `/e/[slug]`, *mobile-first*, con portada, galería y
  meta tags Open Graph dinámicos para que el link se vea bien en WhatsApp.
- **RSVP** en `/e/[slug]` con botones Sí / No / Tal vez y una lista dinámica de
  acompañantes (nombre + relación), validada con Zod en cliente y servidor.
- **Dashboard del evento** en `/dashboard/eventos/[id]`: resumen de
  confirmaciones y total de personas, tabla de RSVPs, **export a CSV**, publicar
  o desactivar la invitación y eliminar el evento.
- **Rate limiting** en el endpoint público de RSVP y en el login (Upstash Redis
  si está configurado; limitador en memoria como respaldo).

## Requisitos

- Node.js >= 18.18
- Una base de datos PostgreSQL en [Neon](https://neon.tech)
- Una cuenta de [Cloudinary](https://cloudinary.com)

## Setup local

```bash
# 1. Instalar dependencias (el postinstall genera el cliente de Prisma)
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# ... y rellenar los valores (ver tabla más abajo)

# 3. Aplicar el schema a la base de datos
npm run db:push        # o: npm run db:migrate  (crea una migración)

# 4. Arrancar en desarrollo
npm run dev            # http://localhost:3000
```

### Crear la primera cuenta

La app no tiene registro público. La primera vez abre `/login`: si todavía no
existe ningún super admin te redirige a `/setup`, donde crearás tu cuenta de
administrador. Después entra a **Usuarios** en el panel para crear el resto.

## Variables de entorno

| Variable                 | Descripción                                                            |
| ------------------------ | ---------------------------------------------------------------------- |
| `DATABASE_URL`           | Connection string **pooled** de Neon (runtime de la app).              |
| `DIRECT_URL`             | Connection string **directa** de Neon (la usan las migraciones).       |
| `CLOUDINARY_CLOUD_NAME`  | Nombre de la nube de Cloudinary.                                       |
| `CLOUDINARY_API_KEY`     | API key de Cloudinary.                                                 |
| `CLOUDINARY_API_SECRET`  | API secret de Cloudinary (nunca se expone al cliente).                 |
| `NEXTAUTH_SECRET`        | Secreto de Auth.js. Genera uno con `openssl rand -base64 32`.          |
| `NEXTAUTH_URL`           | URL base de la app (ej. `https://mi-app.onrender.com`).                |
| `UPSTASH_REDIS_REST_URL` | URL de Upstash Redis para rate limiting distribuido. **Opcional**.     |
| `UPSTASH_REDIS_REST_TOKEN` | Token de Upstash Redis. **Opcional**.                                |

## Scripts

| Script               | Qué hace                                            |
| -------------------- | --------------------------------------------------- |
| `npm run dev`        | Servidor de desarrollo.                             |
| `npm run build`      | Build de producción.                                |
| `npm run start`      | Sirve el build de producción.                       |
| `npm run lint`       | ESLint (`next lint`).                               |
| `npm run typecheck`  | TypeScript (`tsc --noEmit`).                        |
| `npm test`           | Tests con Vitest.                                   |
| `npm run db:migrate` | Crea y aplica una migración en desarrollo.          |
| `npm run db:deploy`  | Aplica migraciones pendientes (producción).         |
| `npm run db:push`    | Sincroniza el schema sin migración (prototipado).   |
| `npm run db:studio`  | Prisma Studio.                                      |

## Deploy en Render

El archivo [`render.yaml`](./render.yaml) describe el servicio. Los comandos son:

- **Build command**
  `npm install && npx prisma generate && npx prisma db push --accept-data-loss && npm run build`
- **Start command**: `npm run start`
- **Health check**: `GET /api/health`

> El proyecto no incluye `prisma/migrations/`, por eso el build usa
> `prisma db push` (sincroniza el schema directamente) en lugar de
> `prisma migrate deploy`. Si más adelante quieres migraciones versionadas,
> ejecuta `npm run db:migrate -- --name init` en local, sube la carpeta
> `prisma/migrations/` y cambia el comando del build por
> `npx prisma migrate deploy`.

Configura las variables de entorno de la tabla anterior en el panel de Render.
En producción usa siempre la connection string **pooled** de Neon en
`DATABASE_URL` y la **directa** en `DIRECT_URL`.

## Estructura

```
app/
  layout.tsx                       Layout raíz (fuentes, metadata global)
  page.tsx                         Landing pública
  setup/                           Alta del primer super admin (solo una vez)
  login/                           Acceso con email + contraseña
  dashboard/                       Área privada del anfitrión
    page.tsx                       Listado de eventos
    usuarios/                      Gestión de cuentas (solo super admin)
    eventos/nuevo| [id]| [id]/editar
  e/[slug]/page.tsx                Invitación pública (OG tags dinámicos)
  api/
    auth/[...nextauth]             Auth.js
    setup                          Crea el primer super admin
    admin/users                    Alta y listado de usuarios (solo super admin)
    events, events/[id], status, rsvps/export
    rsvp                           Confirmación pública (rate limited)
    upload                         Firma de subida a Cloudinary
    health                         Health check de Render
components/                        UI reutilizable (formularios, tablas, hero…)
lib/                               Lógica de dominio, integraciones y validaciones
prisma/schema.prisma               Modelo de datos
tests/                             Tests de la lógica pura
```

## Notas de diseño

- **Fechas como "hora de pared"**: la fecha del evento se guarda codificada en
  UTC para que todos los invitados vean exactamente la hora que escribió el
  anfitrión, sin importar su zona horaria (Render corre en UTC). Ver
  `lib/format.ts`.
- **Tope de acompañantes por evento**: `Event.maxGuestsPerRsvp` es un dato, no
  una constante del frontend. Si un evento necesita permitir más invitados
  adicionales, no hay que tocar código.
- **Subida firmada**: el `api_secret` de Cloudinary nunca llega al navegador;
  el backend genera una firma válida solo para una carpeta y un timestamp.
- **Auth con contraseñas**: `Host.passwordHash` guarda el resultado de `scrypt`
  (`node:crypto`, sin dependencias externas) con el formato
  `scrypt$<sal>$<hash>`. La sesión es un JWT firmado, así que no hay tabla de
  sesiones ni adapter. El alta de cuentas está cerrada: solo un super admin
  puede crear usuarios.

## Escalabilidad futura (no implementado)

- i18n para invitaciones bilingües.
- Plantillas visuales seleccionables por el anfitrión.
- Recordatorios automáticos por WhatsApp/email antes del evento.
- Planes de pago (límite de eventos gratis, plan pago con más fotos/invitados).
