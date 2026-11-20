import { notFound } from "next/navigation";
import { getSesion, puede } from "@/lib/sesion";
import { PanelInventario } from "@/components/inventario/Panel";
import { cargarInventario } from "./datos";

export default async function Inventario() {
  const s = await getSesion();
  if (!puede(s, "inventario")) notFound();
  const { categorias, items } = await cargarInventario();
  return <PanelInventario categorias={categorias} items={items} crear={puede(s, "inventario", "crear")} />;
}
