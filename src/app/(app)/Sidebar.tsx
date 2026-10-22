"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar({ items }: { items: { slug: string; nombre: string }[] }) {
  const path = usePathname();
  return (
    <nav className="flex-1 space-y-0.5">
      {items.map((m) => {
        const href = `/${m.slug}`;
        const activo = m.slug === "" ? path === "/" : path.startsWith(href);
        return (
          <Link key={m.slug} href={href}
            className={`block rounded-md px-3 py-2 text-sm transition ${
              activo ? "bg-olive text-cream" : "text-cream/75 hover:bg-olive/50 hover:text-cream"
            }`}>
            {m.nombre}
          </Link>
        );
      })}
    </nav>
  );
}
