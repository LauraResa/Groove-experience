/** Se muestra al instante al cambiar de pestaña, mientras llegan los datos */
export default function Cargando() {
  return (
    <div className="max-w-7xl space-y-6 animate-pulse" aria-busy="true" aria-label="Cargando">
      <div className="space-y-2">
        <div className="h-3 w-24 rounded bg-stone/50" />
        <div className="h-9 w-64 rounded-lg bg-stone/40" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="tarjeta h-28" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="tarjeta h-72 lg:col-span-2" />
        <div className="tarjeta h-72" />
      </div>
    </div>
  );
}
