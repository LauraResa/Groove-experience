import { getSesion, puede } from "@/lib/sesion";
import { MODULOS } from "@/lib/modulos";
import { logout } from "@/app/login/actions";
import { Sidebar } from "./Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await getSesion();
  const items = MODULOS.filter((m) => puede(s, m.modulo));

  return (
    <div className="min-h-screen md:flex">
      <aside className="md:w-60 md:min-h-screen bg-olive-deep text-cream flex flex-col p-4 gap-6 md:sticky md:top-0">
        <div className="px-3 pt-2">
          <p className="text-[10px] tracking-[0.35em] text-sand">THE</p>
          <p className="font-serif text-xl leading-tight">Groove Experience</p>
        </div>
        <Sidebar items={items} />
        <div className="px-3 text-xs text-cream/70 space-y-2">
          <p className="truncate">{s.nombre}</p>
          <form action={logout}>
            <button className="underline hover:text-cream">Cerrar sesión</button>
          </form>
        </div>
      </aside>
      <main className="flex-1 min-w-0 p-4 md:p-8">
        {s.rol ? children : (
          <div className="max-w-md rounded-xl bg-sand/60 border border-stone p-6">
            <h1 className="font-serif text-2xl mb-2">Acceso pendiente</h1>
            <p className="text-sm">Tu usuario ({s.email}) todavía no tiene rol asignado. Pide a Laura o Cristina que te den acceso.</p>
          </div>
        )}
      </main>
    </div>
  );
}
