import Link from "next/link";
import { notFound } from "next/navigation";
import { getSesion, puede } from "@/lib/sesion";
import { FormItem } from "@/components/inventario/FormItem";
import { cargarInventario } from "../datos";

export default async function Nuevo({ searchParams }: { searchParams: Promise<{ error?: string; cat?: string }> }) {
  const s = await getSesion();
  if (!puede(s, "inventario", "crear")) notFound();
  const [{ error, cat }, { categorias, items }] = await Promise.all([searchParams, cargarInventario()]);
  const ubicaciones = [...new Set(items.map((i) => i.ubicacion).filter(Boolean) as string[])].sort();
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="aparecer">
        <Link href="/inventario" className="text-xs text-olive hover:text-bronze">← Panel de inventario</Link>
        <p className="antetitulo mt-4">Nuevo material</p>
        <h1 className="mt-2 font-serif text-5xl leading-none">Añadir al <em className="text-olive">inventario</em></h1>
        <p className="mt-3 text-sm text-espresso/60">Solo el nombre es obligatorio. Las fotos se suben desde la ficha, una vez creada.</p>
      </header>
      {error && <p className="rounded-2xl border border-[#7a3b2e]/40 bg-[#7a3b2e]/10 px-5 py-3 text-sm text-[#7a3b2e]">{error}</p>}
      <div className="aparecer rounded-3xl border border-stone/60 bg-cream/60 p-6">
        <FormItem categorias={categorias} ubicaciones={ubicaciones} catInicial={categorias.find((c) => c.slug === cat)?.id} />
      </div>
    </div>
  );
}
