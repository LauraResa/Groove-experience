"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icono } from "./Icono";

type Item = { slug: string; nombre: string; modulo: string };

function Marca() {
  return (
    <div className="text-center md:text-left">
      <p className="font-serif text-lg leading-tight">The Groove <em className="text-sand">Experience</em></p>
      <p className="mt-1 text-[10px] tracking-[0.3em] text-cream/55">GESTIÓN</p>
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
            className={`group relative flex items-center rounded-lg px-3 py-2.5 text-sm transition-all duration-300 ${
              activo ? "bg-cream/10 text-cream font-medium" : "text-cream/70 hover:bg-cream/5 hover:text-cream"
            }`}>
            <span className={`absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-bronze transition-opacity ${activo ? "opacity-100" : "opacity-0"}`} />
            <Icono n={m.modulo} className={`h-[18px] w-[18px] mr-3 shrink-0 ${activo ? "text-sand" : "text-cream/55 group-hover:text-cream"}`} />
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
          <Icono n="menu" className="h-6 w-6" />
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
      <aside className="hidden md:flex md:w-60 md:h-screen md:sticky md:top-0 sidebar-fondo text-cream flex-col p-4 gap-5">
        <div className="px-3 pt-3 pb-5 border-b border-cream/10"><Marca /></div>
        <Nav items={items} />
        {pie}
      </aside>
    </>
  );
}
