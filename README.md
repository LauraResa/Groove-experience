# THE GROOVE EXPERIENCE · App interna

Centro de gestión comercial, operativa y estratégica de THE GROOVE EXPERIENCE.

**Estado:** MVP en desarrollo. Base de datos desplegada en Supabase; app con login, inicio y leads (kanban).

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
- [`supabase/migrations/`](supabase/migrations): esquema aplicado en Supabase (tablas, RLS, triggers, semillas).

## Desarrollo local

```bash
npm install
npm run dev   # http://localhost:3000
```

Variables opcionales (por defecto apunta al proyecto Supabase Groove-experience): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Alta de usuarios

1. Supabase → Authentication → Users → Add user (email + contraseña, Auto Confirm).
2. Asignar rol: `insert into usuarios_previstos (email, nombre, rol_clave) values ('…', 'Laura', 'admin_tge');`
   Roles: `admin_tge`, `direccion`, `comunicacion`.
