import { getSesion } from "@/lib/sesion";
import { FormPassword } from "./FormPassword";

const ROLES: Record<string, string> = { admin_tge: "Administradora · Responsable TGE", direccion: "Dirección · Supervisión Groove", comunicacion: "Comunicación · Contenido" };

export default async function Perfil({ searchParams }: { searchParams: Promise<{ nueva?: string }> }) {
  const s = await getSesion();
  const { nueva } = await searchParams;
  return (
    <div className="max-w-xl space-y-6">
      <header className="aparecer">
        <p className="antetitulo">Mi perfil</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-1">{s.nombre}</h1>
        <p className="text-sm text-espresso/60 mt-1">{s.email} · {s.rol ? ROLES[s.rol] ?? s.rol : "Sin rol"}{s.superadmin ? " · Superadmin" : ""}</p>
      </header>
      <section className="tarjeta aparecer p-6">
        <h2 className="font-serif text-lg mb-1">Contraseña</h2>
        {nueva && <p className="mb-3 text-sm text-bronze">Escribe tu nueva contraseña para terminar la recuperación.</p>}
        <FormPassword />
      </section>
    </div>
  );
}
