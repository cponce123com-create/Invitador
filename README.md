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
  título, tipo, detalle libre, fecha y hora, **cierre de la lista** (opcional),
  ubicación, descripción, fotos (con portada) y el tope de acompañantes por
  confirmación.
- **Código de vestimenta** (opcional): una foto de referencia que el anfitrión
  sube como casilla aparte. En la invitación se muestra como una tarjeta
  ampliable; sin foto, no se renderiza.
- **Música de fondo** (opcional): el anfitrión elige una melodía de un catálogo
  (o «Sin música») y suena al abrir la invitación, con un botón para silenciarla
  que recuerda la preferencia del invitado. Las melodías se **sintetizan en el
  navegador** con la Web Audio API: no se sube ni se descarga ningún archivo.
- **Página pública** en `/e/[slug]`, *mobile-first*: una experiencia animada
  (cortina de apertura, confeti y partículas temáticas según el tipo de evento,
  saludo escrito a máquina, Ken Burns + parallax en la portada y un muro de
  polaroids con visor a pantalla completa) más los meta tags Open Graph
  dinámicos para que el link se vea bien en WhatsApp.
- **RSVP** en `/e/[slug]` con botones Sí / No / Tal vez y una lista dinámica de
  acompañantes (nombre + relación), validada con Zod en cliente y servidor.
- **Cierre de la lista (opcional)**: si el anfitrión define una fecha de cierre,
  la invitación muestra una **cuenta regresiva** (días / horas / minutos /
  segundos) en hora de Perú. Al llegar a cero el formulario se oculta y la API
  rechaza las confirmaciones nuevas con `403`. Sin fecha, la lista no se cierra
  sola.
- **Aviso de invitado repetido**: al confirmar, el servidor compara el nombre con
  los ya registrados —sin acentos ni mayúsculas y tolerante a erratas— y, si
  encuentra uno muy parecido, pide confirmación antes de guardar para evitar
  duplicar al invitado principal.
- **Mesa de regalos** (opcional): el anfitrión sube el **QR de su mesa de
  regalos** (Yape, Plin, transferencia…) con un mensaje corto y, si quiere,
  publica hasta 30 artículos del catálogo con foto, descripción y precio
  opcional. En la invitación todo vive en una sola sección: el QR, el catálogo
  (cada artículo con «Comprar el regalo» —que abre el comprobante ya asociado— y
  la insignia «Ya lo apartó N persona(s)») y un botón «Aportar un monto» para
  quien prefiere dar sin elegir regalo. Todas las vías abren la misma ventana,
  donde el invitado adjunta su **comprobante** (nombre + captura). El panel lista
  los comprobantes —indicando a qué regalo corresponden— y los exporta a CSV.
  Sin QR ni artículos, la sección no se renderiza.
- **Dashboard del evento** en `/dashboard/eventos/[id]`: resumen de
  confirmaciones y total de personas, tabla de RSVPs, **export a CSV**, publicar
  o desactivar la invitación y eliminar el evento.
- **Fondos demo** en el formulario del evento: una galería de plantillas
  (gradientes y patrones SVG **generados en código**, sin subir imágenes) con
  preview en vivo del Hero. Si el evento tiene foto de portada, la foto manda;
  si no, se usa el fondo elegido o el degradado por defecto.
- **Rate limiting** en el endpoint público de RSVP y en el login (Upstash Redis
  si está configurado; limitador en memoria como respaldo).

## Requisitos

- Node.js >= 18.18
- Una base de datos PostgreSQL en [Neon](https://neon.tech)
- Una cuenta de [Cloudinary](https://cloudinary.com)

## Setup local

```bash
# 1. Instalar dependencias tal cual el lockfile (el postinstall genera el cliente)
npm ci

# 2. Configurar variables de entorno
cp .env.example .env
# ... y rellenar los valores (ver tabla más abajo)

# 3. Aplicar las migraciones versionadas a la base de datos
npm run db:deploy      # = npx prisma migrate deploy

# 4. Sembrar el catálogo de fondos demo (idempotente)
npm run db:seed:backgrounds

# 5. Arrancar en desarrollo
npm run dev            # http://localhost:3000
```

> `prisma/migrations/` está versionado y `0_init` es el baseline del esquema
> completo. Para cambiar el esquema, usa
> `npm run db:migrate -- --name lo-que-sea` (crea y aplica la migración en
> local); `npm run db:push` queda solo para prototipar contra una base
> desechable, porque no deja historial ni permite volver atrás.

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
| `npm run db:seed:backgrounds` | Siembra el catálogo de fondos demo (idempotente). |
| `npm run db:studio`  | Prisma Studio.                                      |

## Deploy en Render

El archivo [`render.yaml`](./render.yaml) describe el servicio. Los comandos son:

- **Build command**
  `npm ci --include=dev && npx prisma generate && npx prisma migrate deploy && npm run db:seed:backgrounds && npm run typecheck && npm run lint && npm test && npm run build`
- **Start command**: `npm run start`
- **Health check**: `GET /api/health`

> **Migraciones**: el esquema está versionado en `prisma/migrations/` y se aplica
> con `prisma migrate deploy` (contra `DIRECT_URL`), que es idempotente y no
> destructivo. `0_init` es el baseline del esquema que ya existía en la base de
> producción, así que **la primera vez hay que marcarlo como aplicado** (una sola
> vez, con la `DIRECT_URL` de producción):
>
> ```bash
> npx prisma migrate resolve --applied 0_init
> npx prisma migrate diff --from-url "$DIRECT_URL" --to-schema-datamodel prisma/schema.prisma --exit-code
> ```
>
> El primer comando solo escribe la fila de `0_init` en `_prisma_migrations` (no
> toca tablas ni datos) y el segundo comprueba que la base y el esquema coinciden:
> debe terminar con código 0.
>
> **Puerta de calidad**: antes de compilar, el build corre `typecheck`, `lint` y
> los tests; si alguno falla, el deploy no se publica. `npm ci --include=dev`
> instala exactamente lo que fija el lockfile y garantiza las herramientas del
> build (`prisma`, `tsx`, `typescript`, `vitest`) aunque el entorno llegue con
> `NODE_ENV=production`.
>
> `npm run db:seed:backgrounds` siembra las plantillas de fondos demo. Es
> idempotente (upsert por id), así que puede correr en cada deploy sin duplicar
> filas.

Configura las variables de entorno de la tabla anterior en el panel de Render.
En producción usa siempre la connection string **pooled** de Neon en
`DATABASE_URL` y la **directa** en `DIRECT_URL`. En `.env.example` cada bloque
indica si es solo de servidor, obligatorio en producción u opcional.

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
components/invitation/             Experiencia animada de la invitación pública
lib/                               Lógica de dominio, integraciones y validaciones
prisma/schema.prisma               Modelo de datos
tests/                             Tests de la lógica pura
```

## Notas de diseño

- **Dos clases de fecha**: la fecha del evento y el cierre de la lista se
  guardan como **"hora de pared"** codificada en UTC, para que todos los
  invitados vean exactamente la hora que escribió el anfitrión, sin importar su
  zona horaria (Render corre en UTC). Los **instantes reales** (`createdAt` de
  las confirmaciones, los comprobantes de regalo y las cuentas) se muestran en
  `EVENT_TIME_ZONE` (`America/Lima`), así que el "confirmado el …" coincide con
  el reloj del anfitrión. Ver `lib/format.ts`.
- **Tope de acompañantes por evento**: `Event.maxGuestsPerRsvp` es un dato, no
  una constante del frontend. Si un evento necesita permitir más invitados
  adicionales, no hay que tocar código.
- **Música sin archivos**: las melodías de `lib/music.ts` son partituras escritas
  en texto que `components/invitation/BackgroundMusic.tsx` convierte en
  osciladores de la Web Audio API. No hay ningún `.mp3` que subir, no suma peso a
  la página y no obliga a abrir `media-src` en la CSP, porque no se pide ningún
  recurso externo. El audio arranca con el clic de «Abrir invitación»: los
  navegadores exigen un gesto del usuario para reproducir sonido, así que la
  música nunca suena sola. Con la pestaña oculta el contexto se suspende, de modo
  que el bucle no se corta cuando el navegador estrangula los temporizadores.
- **Costados en pantallas grandes**: la columna de contenido mide 768 px, así que
  en un monitor ancho sobran laterales. Para no dejarlos vacíos, la invitación
  reutiliza la foto de portada del evento —desenfocada, atenuada y enmascarada
  hacia el centro— como fondo fijo a partir de 1280 px. Es CSS puro sobre una
  imagen que ya se descarga, no añade assets y sirve para cualquier tipo de
  evento. Sin foto de portada, los costados conservan el degradado del tema.
- **Subida firmada**: el `api_secret` de Cloudinary nunca llega al navegador;
  el backend genera una firma válida solo para una carpeta y un timestamp.
- **Auth con contraseñas**: `Host.passwordHash` guarda el resultado de `scrypt`
  (`node:crypto`, sin dependencias externas) con el formato
  `scrypt$<sal>$<hash>`. La sesión es un JWT firmado, así que no hay tabla de
  sesiones ni adapter. El alta de cuentas está cerrada: solo un super admin
  puede crear usuarios.
- **Fondos demo generados en código**: las plantillas de `BackgroundTemplate` no
  son imágenes. `lib/backgrounds.ts` las traduce a un `style` de CSS (degradado
  o patrón SVG en data URI), así que la galería es instantánea, liviana y no
  depende de Cloudinary. Prioridad de la portada: foto (`coverImageUrl`) →
  fondo elegido → degradado por defecto (los eventos ya existentes no cambian).
- **Invitación animada sin dependencias**: los efectos de `/e/[slug]` (cortina de
  apertura, partículas y confeti dibujados en `<canvas>`, saludo con efecto
  máquina de escribir, Ken Burns + parallax en la portada y el muro de
  polaroids) se construyen con keyframes de Tailwind, la Canvas API e
  `IntersectionObserver`, sin añadir ninguna librería de animación. El tema por
  tipo de evento vive en `lib/invitation-theme.ts` y la física de las partículas
  en `lib/particles.ts`; ambos son módulos puros con tests propios. Todo respeta
  `prefers-reduced-motion`: con esa preferencia activa no se monta ningún bucle
  de animación y las secciones aparecen directamente en su estado final. La
  vista previa del dashboard reutiliza `EventHero` sin animación, así que el
  panel del anfitrión no carga ningún efecto.

## Seguridad, límites y tests

- **Rate limiting**: `lib/rate-limit.ts` limita la confirmación pública, la
  subida de comprobantes, el login (por IP + email), la firma de subidas y el
  alta del primer super admin. Con `UPSTASH_REDIS_REST_*` configurado el límite
  es compartido entre instancias; sin esas variables cae a un limitador en
  memoria (uno por proceso).
- **Sesión revalidada**: la sesión es un JWT, pero `getCurrentHost` vuelve a
  consultar el host en cada petición, así que borrar o degradar una cuenta surte
  efecto de inmediato (no hay que esperar a que caduque el token).
- **Cabeceras y CSRF**: `next.config.mjs` aplica CSP y cabeceras de seguridad
  (nosniff, anti-framing, Referrer-Policy, Permissions-Policy, HSTS) a todas las
  respuestas, y los endpoints mutantes rechazan las peticiones que vienen de otro
  origen (`Sec-Fetch-Site`/`Origin`). Los endpoints públicos de la invitación
  quedan fuera a propósito.
- **Assets de Cloudinary**: las fotos de un evento —incluidas las del catálogo de
  regalos— solo se aceptan y solo se destruyen si viven en la carpeta
  `invitador/<hostId>/`, y los comprobantes en `invitador/regalos/<eventId>/`.
- **Tests**: `npm test` (Vitest, entorno node) cubre la lógica pura y de dominio
  —fechas, slugs, CSV, validaciones, rate limiting, imágenes, temas, partículas
  y presupuesto de render— más contratos de autorización multi-tenant, del alta
  del super admin y del rechazo por origen cruzado, con Prisma y Cloudinary
  simulados. No hay tests de componentes ni contra una base real: el flujo
  completo (login, subida de fotos, invitados) se comprueba en producción.

## Notas de mantenimiento

- **Actualización mayor de Next.js pendiente (`postcss`)**: `next@14.2.35`
  fija internamente `postcss@8.4.31`, afectado por cuatro avisos —XSS en el
  `stringify` de CSS (`GHSA-qx2v-qp2m-jg93`) y varias rutas de lectura
  arbitraria de archivos vía `sourceMappingURL` (`GHSA-6g55-p6wh-862q`,
  `GHSA-fxqj-rqcc-2cmp`, `GHSA-r28c-9q8g-f849`), dos de severidad alta y dos
  moderada— que `npm audit` reporta a través de `next`. **Ninguna versión de la
  rama 14.x ni de la 15.x lo corrige**: Next 15.5.25 sigue dependiendo de
  `postcss@8.4.31`, y el `postcss` corregido (≥ 8.5.23) solo llega con
  `next@16` (`next@16.3.5` usa `postcss@8.5.23`). Como el salto a Next 16 es
  *breaking*, queda **pendiente para decidirlo en un cambio aparte**; el único
  arreglo no-mayor hoy sería forzar `postcss` con un `overrides` de npm, que
  conviene evaluar en ese mismo cambio. El proyecto no procesa CSS de terceros:
  `postcss` solo entra en la cadena de build (Tailwind), no con datos del
  usuario.

## Fondos demo: cómo agregar uno nuevo

No hay que tocar la UI ni subir imágenes. Lo más simple es agregar un preset a
`BACKGROUND_PRESETS` (`lib/background-presets.ts`) y correr
`npm run db:seed:backgrounds`; también sirve insertar una fila directamente en
`BackgroundTemplate` (Prisma Studio, SQL, etc.).

| Campo         | Qué es                                                                  |
| ------------- | ----------------------------------------------------------------------- |
| `name`        | Nombre que ve el anfitrión en la galería.                               |
| `eventType`   | `CUMPLEANOS`…`OTRO`, o `null` para que sirva a cualquier evento.        |
| `kind`        | `GRADIENT` (degradado CSS) o `PATTERN` (patrón SVG repetido).           |
| `colors`      | `GRADIENT`: 2 o más colores hex. `PATTERN`: `[base, color del trazo]`.  |
| `patternName` | Solo `PATTERN`: `dots`, `waves`, `confetti` o `stripes`.                |
| `order`       | Posición en la galería (menor primero).                                 |
| `isPremium`   | Reservado para planes de pago; hoy todo es gratis.                      |

## Escalabilidad futura (no implementado)

- i18n para invitaciones bilingües.
- Subida de fondos personalizados por el anfitrión (hoy solo plantillas demo).
- Fondos premium / de pago (el campo `isPremium` ya está modelado).
- Editor de colores custom por el anfitrión.
- Recordatorios automáticos por WhatsApp/email antes del evento.
- Planes de pago (límite de eventos gratis, plan pago con más fotos/invitados).
