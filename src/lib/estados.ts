export const EST_PROPUESTA: Record<string, { t: string; tono: "neutro" | "olive" | "bronze" | "fuerte" | "apagado" }> = {
  borrador: { t: "Borrador", tono: "neutro" },
  pendiente_aprobacion: { t: "Pendiente aprobación", tono: "bronze" },
  aprobada: { t: "Aprobada por Groove", tono: "olive" },
  enviada: { t: "Enviada", tono: "olive" },
  negociacion: { t: "Negociación", tono: "bronze" },
  aceptada: { t: "Aceptada", tono: "fuerte" },
  rechazada: { t: "Rechazada", tono: "apagado" },
  caducada: { t: "Sustituida / caducada", tono: "apagado" },
};

export const EST_EVENTO: Record<string, { t: string; tono: "neutro" | "olive" | "bronze" | "fuerte" | "apagado" }> = {
  preproduccion: { t: "Preproducción", tono: "neutro" },
  produccion: { t: "Producción", tono: "bronze" },
  confirmado: { t: "Confirmado", tono: "olive" },
  en_ejecucion: { t: "En ejecución", tono: "fuerte" },
  finalizado: { t: "Finalizado", tono: "apagado" },
  cancelado: { t: "Cancelado", tono: "apagado" },
};

export const EST_TAREA: Record<string, string> = { pendiente: "Pendiente", en_curso: "En curso", bloqueado: "Bloqueado", finalizado: "Finalizado" };
export const PRIORIDADES = ["baja", "media", "alta", "urgente"];

export const BLOQUES: Record<string, string> = {
  espacio: "Espacio", catering: "Catering", produccion: "Producción", decoracion: "Decoración",
  tecnica: "Técnica", personal: "Personal", alojamiento: "Alojamiento", extras: "Extras",
};

export const TIPOS_CLIENTE = ["empresa", "marca", "agencia", "particular", "partner", "comunidad"];
export const CARPETAS: Record<string, string> = {
  comercial: "Comercial", dossiers: "Dossiers", tarifas: "Tarifas", contratos: "Contratos", proveedores: "Proveedores",
  eventos: "Eventos", formatos: "Formatos propios", comunicacion: "Comunicación", legal: "Legal", plantillas: "Plantillas",
};
