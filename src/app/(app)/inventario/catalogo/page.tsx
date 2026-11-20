import { notFound } from "next/navigation";
import { getSesion, puede } from "@/lib/sesion";
import { CatalogoInventario, type ParamsCatalogo } from "@/components/inventario/Catalogo";
import { cargarInventario } from "../datos";

export default async function CatalogoPage({ searchParams }: { searchParams: Promise<ParamsCatalogo> }) {
  const s = await getSesion();
  if (!puede(s, "inventario")) notFound();
  const [p, { categorias, items }] = await Promise.all([searchParams, cargarInventario()]);
  return <CatalogoInventario categorias={categorias} items={items} p={p} crear={puede(s, "inventario", "crear")} />;
}
