import { getSesion, puede } from "@/lib/sesion";
import { DISPONIBILIDAD, ESTADOS, confirmadas, esPendiente, fotoUrl, fotos, utilizables } from "@/lib/inventario";
import { crearXlsx } from "@/lib/xlsx";
import { cargarInventario } from "../datos";

/** Excel del inventario completo o de una categoría (?cat=slug) */
export async function GET(req: Request) {
  const s = await getSesion();
  if (!puede(s, "inventario")) return new Response("Sin permiso", { status: 403 });
  const slug = new URL(req.url).searchParams.get("cat");
  const { categorias, items, porId } = await cargarInventario();
  const cat = categorias.find((c) => c.slug === slug);
  const orden = new Map(categorias.map((c) => [c.id, c.orden]));
  const lista = items
    .filter((i) => !cat || i.categoria_id === cat.id)
    .sort((a, b) => (orden.get(a.categoria_id ?? "") ?? 99) - (orden.get(b.categoria_id ?? "") ?? 99) || a.nombre.localeCompare(b.nombre, "es"));

  const inventario = {
    nombre: cat ? cat.nombre : "Inventario",
    columnas: [
      { t: "Código", ancho: 10 }, { t: "Categoría", ancho: 20 }, { t: "Artículo", ancho: 34 },
      { t: "Cantidad confirmada", ancho: 12 }, { t: "Estimación", ancho: 12 }, { t: "Unidad", ancho: 10 },
      { t: "Ancho (cm)", ancho: 10 }, { t: "Alto (cm)", ancho: 10 }, { t: "Fondo (cm)", ancho: 10 }, { t: "Nota medidas", ancho: 30 },
      { t: "Material", ancho: 14 }, { t: "Color", ancho: 12 }, { t: "Estado", ancho: 16 }, { t: "Uds. deterioradas", ancho: 11 },
      { t: "Ubicación", ancho: 18 }, { t: "Disponibilidad", ancho: 18 }, { t: "Pendiente de confirmar", ancho: 22 },
      { t: "Descripción", ancho: 36 }, { t: "Observaciones", ancho: 40 }, { t: "Fotos", ancho: 40 }, { t: "Actualizado", ancho: 12 },
    ],
    filas: lista.map((i) => [
      i.codigo, porId.get(i.categoria_id ?? "")?.nombre ?? "", i.nombre,
      i.cantidad_confirmada ? i.cantidad : null,
      !i.cantidad_confirmada ? (i.cantidad_min !== null || i.cantidad_max !== null ? [i.cantidad_min, i.cantidad_max].filter((x) => x !== null).join("–") : i.cantidad ?? "") : "",
      i.unidad, i.ancho_cm, i.alto_cm, i.fondo_cm, i.medidas_nota, i.material, i.color,
      ESTADOS[i.estado] ?? i.estado, i.unidades_deterioradas || null, i.ubicacion,
      i.disponibilidad ? DISPONIBILIDAD[i.disponibilidad] : "Sin definir",
      esPendiente(i) ? i.pendiente ?? "Cantidad" : "", i.descripcion, i.observaciones,
      fotos(i).map((f) => fotoUrl(f.storage_path)).join("\n"),
      new Date(i.actualizado_en).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" }),
    ]),
  };
  const resumen = {
    nombre: "Resumen",
    columnas: [{ t: "Categoría", ancho: 26 }, { t: "Referencias", ancho: 12 }, { t: "Uds. confirmadas", ancho: 16 }, { t: "Uds. disponibles", ancho: 16 }, { t: "Por confirmar", ancho: 14 }],
    filas: [
      ...(cat ? [cat] : categorias).map((c) => {
        const l = lista.filter((i) => i.categoria_id === c.id);
        return [c.nombre, l.length, l.reduce((a, i) => a + confirmadas(i), 0), l.reduce((a, i) => a + utilizables(i), 0), l.filter(esPendiente).length];
      }),
      ["Total", lista.length, lista.reduce((a, i) => a + confirmadas(i), 0), lista.reduce((a, i) => a + utilizables(i), 0), lista.filter(esPendiente).length],
      [], ["Las cantidades estimadas o sin confirmar no suman en los totales."],
    ],
  };
  const fecha = new Date().toISOString().slice(0, 10);
  const nombre = `Inventario_Groove${cat ? `_${cat.slug}` : ""}_${fecha}.xlsx`;
  return new Response(crearXlsx([inventario, resumen]), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "Cache-Control": "no-store",
    },
  });
}
