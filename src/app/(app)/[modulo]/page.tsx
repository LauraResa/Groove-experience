import { notFound } from "next/navigation";
import { MODULOS } from "@/lib/modulos";
import { getSesion, puede } from "@/lib/sesion";

export default async function ModuloPendiente({ params }: { params: Promise<{ modulo: string }> }) {
  const { modulo } = await params;
  const m = MODULOS.find((x) => x.slug === modulo);
  const s = await getSesion();
  if (!m || !puede(s, m.modulo)) notFound();

  return (
    <div className="max-w-xl">
      <h1 className="font-serif text-3xl mb-3">{m.nombre}</h1>
      <div className="rounded-xl bg-sand/50 border border-stone p-6 text-sm">
        Módulo en desarrollo. La base de datos ya está preparada; la pantalla llega en las próximas entregas del MVP.
      </div>
    </div>
  );
}
