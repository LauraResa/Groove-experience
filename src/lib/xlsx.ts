/**
 * Generador mínimo de .xlsx sin dependencias (ZIP sin compresión + SpreadsheetML).
 * Suficiente para exportar tablas: texto, números, cabecera en negrita y anchos de columna.
 */
type Celda = string | number | null | undefined;
export type Hoja = { nombre: string; columnas: { t: string; ancho?: number }[]; filas: Celda[][] };

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
const crc32 = (b: Uint8Array) => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

function zip(archivos: { nombre: string; datos: Uint8Array }[]) {
  const enc = new TextEncoder();
  const partes: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let off = 0;
  for (const a of archivos) {
    const n = enc.encode(a.nombre);
    const crc = crc32(a.datos);
    const loc = new DataView(new ArrayBuffer(30));
    loc.setUint32(0, 0x04034b50, true); loc.setUint16(4, 20, true); loc.setUint16(6, 0x0800, true);
    loc.setUint32(14, crc, true); loc.setUint32(18, a.datos.length, true); loc.setUint32(22, a.datos.length, true); loc.setUint16(26, n.length, true);
    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0800, true);
    cen.setUint32(16, crc, true); cen.setUint32(20, a.datos.length, true); cen.setUint32(24, a.datos.length, true); cen.setUint16(28, n.length, true); cen.setUint32(42, off, true);
    partes.push(new Uint8Array(loc.buffer), n, a.datos);
    central.push(new Uint8Array(cen.buffer), n);
    off += 30 + n.length + a.datos.length;
  }
  const tamCentral = central.reduce((s, x) => s + x.length, 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, archivos.length, true); fin.setUint16(10, archivos.length, true);
  fin.setUint32(12, tamCentral, true); fin.setUint32(16, off, true);
  const todo = [...partes, ...central, new Uint8Array(fin.buffer)];
  const out = new Uint8Array(todo.reduce((s, x) => s + x.length, 0));
  let p = 0; for (const x of todo) { out.set(x, p); p += x.length; }
  return out;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
const col = (i: number) => { let s = ""; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };

function hojaXml(h: Hoja) {
  const fila = (r: number, celdas: Celda[], estilo = 0) =>
    `<row r="${r}">${celdas.map((v, c) => {
      const ref = `${col(c)}${r}`;
      if (v === null || v === undefined || v === "") return estilo ? `<c r="${ref}" s="${estilo}"/>` : "";
      if (typeof v === "number") return `<c r="${ref}"${estilo ? ` s="${estilo}"` : ""}><v>${v}</v></c>`;
      return `<c r="${ref}" t="inlineStr" s="${estilo || 2}"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
    }).join("")}</row>`;
  const cols = h.columnas.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.ancho ?? 16}" customWidth="1"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<cols>${cols}</cols><sheetData>${fila(1, h.columnas.map((c) => c.t), 1)}${h.filas.map((f, i) => fila(i + 2, f)).join("")}</sheetData>
${h.filas.length ? `<autoFilter ref="A1:${col(h.columnas.length - 1)}${h.filas.length + 1}"/>` : ""}</worksheet>`;
}

export function crearXlsx(hojas: Hoja[]) {
  const enc = new TextEncoder();
  const f = (nombre: string, s: string) => ({ nombre, datos: enc.encode(s) });
  const nombreHoja = (s: string) => esc(s.replace(/[\\/?*[\]:]/g, " ").slice(0, 31));
  return zip([
    f("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${hojas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`),
    f("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    f("xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${hojas.map((h, i) => `<sheet name="${nombreHoja(h.nombre)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets>${hojas.map((h, i) => h.filas.length ? `<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${nombreHoja(h.nombre)}'!$A$1:$${col(h.columnas.length - 1)}$${h.filas.length + 1}</definedName></definedNames>` : "").join("").replace(/<\/definedNames><definedNames>/g, "")}</workbook>`),
    f("xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${hojas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${hojas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    f("xl/styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="10"/><color rgb="FFEDE4D8"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF555A43"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`),
    ...hojas.map((h, i) => f(`xl/worksheets/sheet${i + 1}.xml`, hojaXml(h))),
  ]);
}
