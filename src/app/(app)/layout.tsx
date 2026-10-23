import Link from "next/link";
import { getSesion, puede } from "@/lib/sesion";
import { MODULOS } from "@/lib/modulos";
import { logout } from "@/app/login/actions";
import { Sidebar } from "./Sidebar";
import { ConfirmarBorrados } from "@/components/ConfirmarBorrados";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await getSesion();
  const items = MODULOS.filter((m) => puede(s, m.modulo));

  return (
    <div className="min-h-screen md:flex">
      <Sidebar items={items} pie={
        <div className="flex items-center gap-3 border-t border-cream/10 px-2 pt-4">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sand text-espresso text-xs font-semibold">
            {s.nombre.charAt(0).toUpperCase()}
          </span>
          <Link href="/perfil" className="flex-1 truncate text-sm hover:text-sand" title="Mi perfil">{s.nombre}</Link>
          <form action={logout}>
            <button className="text-xs text-cream/60 underline hover:text-cream">Salir</button>
          </form>
        </div>
      } />
      <ConfirmarBorrados />
      <main className="flex-1 min-w-0 px-4 py-6 md:px-10 md:py-10">
        {s.rol ? children : (
          <div className="max-w-md tarjeta aparecer p-6">
            <h1 className="font-serif text-2xl mb-2">Acceso pendiente</h1>
            <p className="text-sm">Tu usuario ({s.email}) todavía no tiene rol asignado. Pide a Laura o Cristina que te den acceso.</p>
          </div>
        )}
      </main>
    </div>
  );
}
