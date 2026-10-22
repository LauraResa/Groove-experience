"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Item = { slug: string; nombre: string };

function Marca() {
  return (
    <div>
      <p className="text-[10px] tracking-[0.4em] text-bronze">THE</p>
      <p className="font-serif text-xl leading-tight">Groove <em className="text-sand">Experience</em></p>
    </div>
  );
}

function Nav({ items, onNavegar }: { items: Item[]; onNavegar?: () => void }) {
  const path = usePathname();
  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto">
      {items.map((m) => {
        const href = `/${m.slug}`;
        const activo = m.slug === "" ? path === "/" : path.startsWith(href);
        return (
          <Link key={m.slug} href={href} onClick={onNavegar}
            className={`group relative flex items-center rounded-lg px-3 py-2 text-sm transition-all duration-300 ${
              activo ? "bg-cream/10 text-cream" : "text-cream/65 hover:bg-cream/5 hover:text-cream hover:pl-4"
            }`}>
            <span className={`absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-bronze transition-opacity ${activo ? "opacity-100" : "opacity-0"}`} />
            {m.nombre}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ items, pie }: { items: Item[]; pie: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  const path = usePathname();
  useEffect(() => setAbierto(false), [path]);

  return (
    <>
      {/* Móvil: barra superior + panel */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between sidebar-fondo text-cream px-4 py-3 shadow-lg shadow-espresso/20">
        <Marca />
        <button onClick={() => setAbierto(true)} aria-label="Abrir menú"
          className="rounded-md p-2 hover:bg-olive/50">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </header>
      {abierto && (
        <div className="md:hidden fixed inset-0 z-50 bg-espresso/40 backdrop-blur-sm" onClick={() => setAbierto(false)}>
          <aside onClick={(e) => e.stopPropagation()}
            className="aparecer h-full w-72 max-w-[85%] sidebar-fondo text-cream flex flex-col p-4 gap-6 shadow-2xl">
            <div className="flex items-start justify-between px-3 pt-2">
              <Marca />
              <button onClick={() => setAbierto(false)} aria-label="Cerrar menú" className="text-2xl leading-none">×</button>
            </div>
            <Nav items={items} onNavegar={() => setAbierto(false)} />
            {pie}
          </aside>
        </div>
      )}

      {/* Escritorio */}
      <aside className="hidden md:flex md:w-60 md:h-screen md:sticky md:top-0 sidebar-fondo text-cream flex-col p-4 gap-8">
        <div className="px-3 pt-2"><Marca /></div>
        <Nav items={items} />
        {pie}
      </aside>
    </>
  );
}
