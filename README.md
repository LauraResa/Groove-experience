# THE GROOVE EXPERIENCE · App interna

Centro de gestión comercial, operativa y estratégica de THE GROOVE EXPERIENCE.

**Estado:** Fase 1, arquitectura pendiente de aprobación. Todavía no hay código de aplicación.

## Stack previsto

| Capa | Tecnología |
|---|---|
| Frontend + API | Next.js 15 (App Router, Server Actions) + TypeScript |
| UI | Tailwind CSS + shadcn/ui (tokens de la paleta Groove) |
| Base de datos | Supabase Postgres con RLS |
| Auth | Supabase Auth (email + magic link) |
| Ficheros | Supabase Storage |
| Hosting | Vercel |
| Entrada futura de solicitudes | Webhook (Vercel Route / Supabase Edge Function) |

## Documentación

- [`docs/01-arquitectura.md`](docs/01-arquitectura.md): arquitectura, módulos, permisos, navegación, flujo, MVP y decisiones abiertas.
- [`docs/02-modelo-datos.sql`](docs/02-modelo-datos.sql): borrador del esquema Postgres/Supabase (tablas, relaciones, RLS). Todavía no se ha aplicado.
