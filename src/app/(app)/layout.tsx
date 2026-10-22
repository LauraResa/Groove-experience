import { getSesion, puede } from "@/lib/sesion";
import { MODULOS } from "@/lib/modulos";
import { logout } from "@/app/login/actions";
import { Sidebar } from "./Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await getSesion();
  const items = MODULOS.filter((m) => puede(s, m.modulo));

  return (
    <div className="min-h-screen md:flex">
      <Sidebar items={items} pie={
        <div className="px-3 text-xs text-cream/70 space-y-2">
          <p className="truncate">{s.nombre}</p>
          <form action={logout}>
            <button className="underline hover:text-cream">Cerrar sesión</button>
          </form>
        </div>
      } />
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
