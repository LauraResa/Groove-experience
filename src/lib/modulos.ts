export const MODULOS = [
  { slug: "", modulo: "inicio", area: "Mi día", nombre: "Inicio" },
  { slug: "leads", modulo: "leads", area: "Comercial", nombre: "Leads" },
  { slug: "propuestas", modulo: "propuestas", area: "Comercial", nombre: "Propuestas" },
  { slug: "eventos", modulo: "eventos", area: "Producción", nombre: "Eventos" },
  { slug: "contenidos", modulo: "contenidos", area: "Producción", nombre: "Contenidos" },
  { slug: "clientes", modulo: "clientes", area: "Comercial", nombre: "Clientes" },
  { slug: "proveedores", modulo: "proveedores", area: "Producción", nombre: "Proveedores" },
  { slug: "formatos", modulo: "formatos", area: "Desarrollo", nombre: "Formatos propios" },
  { slug: "calendario", modulo: "calendario", area: "Producción", nombre: "Calendario" },
  { slug: "roadmap", modulo: "roadmap", area: "Desarrollo", nombre: "Roadmap" },
  { slug: "tareas", modulo: "tareas", area: "Mi día", nombre: "Tareas" },
  { slug: "documentos", modulo: "documentos", area: "Recursos", nombre: "Documentos" },
  { slug: "finanzas", modulo: "finanzas", area: "Control", nombre: "Finanzas" },
  { slug: "reporting", modulo: "reporting", area: "Control", nombre: "Reporting" },
  { slug: "configuracion", modulo: "configuracion", area: "Recursos", nombre: "Configuración" },
  { slug: "usuarios", modulo: "usuarios", area: "Recursos", nombre: "Usuarios" },
] as const;

/** Agrupación funcional (la misma que el antetítulo de cada pantalla) */
export const AREAS = ["Mi día", "Comercial", "Producción", "Desarrollo", "Control", "Recursos"] as const;

export const ACCIONES = [
  { clave: "ver", nombre: "Ver" },
  { clave: "crear", nombre: "Crear" },
  { clave: "editar", nombre: "Editar" },
  { clave: "borrar", nombre: "Borrar" },
  { clave: "ver_importes", nombre: "Importes" },
  { clave: "aprobar", nombre: "Aprobar" },
] as const;
