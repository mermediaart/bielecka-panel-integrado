// supabase/functions/_shared/normalizacion.ts
// Lógica de auditoría y normalización, traducida del Apps Script original.
// La importan trello-webhook y check-overdue para no duplicar código.

// ----------------------------------------------------------------------------
// Detección de formatos — a diferencia de una detección "el primero que
// matchea", esta devuelve TODOS los formatos mencionados en un mismo título
// de tarjeta (ej. "REEL + CARRUSEL Semana 3" -> ["Reel", "Carrusel"]).
// ----------------------------------------------------------------------------
const PATRONES_FORMATO = [
  { formato: 'Estrategia', patrones: [/ESTRATEGIA/i] },
  { formato: 'Reel', patrones: [/REELS?\b/i] },
  { formato: 'Story', patrones: [/STORY|STORIES|HISTORIAS?/i] },
  { formato: 'Carrusel', patrones: [/CARRUSELE?S?/i] },
  { formato: 'Single Post', patrones: [/SINGLE\s*POST/i, /\bPOST\b/i] },
  { formato: 'Pieza Gráfica', patrones: [/PIEZA\s*GR[AÁ]FICA/i, /\bDISE[ÑN]O\b/i, /\bGR[AÁ]FICA\b/i] },
];

export function detectarTiposFormatosMultiples(titulo) {
  const t = titulo || '';
  const encontrados = [];
  for (const { formato, patrones } of PATRONES_FORMATO) {
    if (patrones.some(re => re.test(t))) encontrados.push(formato);
  }
  return encontrados.length ? encontrados : ['Otro'];
}

// Versión "un solo formato" para los lugares que necesitan un valor único
// (ej. guardar `content_cards.tipo`) — toma el primero detectado, priorizando
// Estrategia sobre el resto si aparecen mezclados.
export function detectarTipoPrincipal(titulo) {
  const todos = detectarTiposFormatosMultiples(titulo);
  return todos.includes('Estrategia') ? 'Estrategia' : todos[0];
}

// ----------------------------------------------------------------------------
// Normalización de nombres — saca acentos, mayúsculas, espacios extra y
// símbolos, para poder comparar "Bulonera Meet" con "BULONERA MEET - Trello"
// o "Joaquín Gil" con "joaquin gil" sin falsos negativos.
// ----------------------------------------------------------------------------
function limpiarTexto(s) {
  return (s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // saca acentos
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizarNombreMarca(nombre) {
  return limpiarTexto(nombre);
}

export function normalizarNombreMiembro(nombre) {
  return limpiarTexto(nombre);
}

// Compara dos nombres ya normalizados con una tolerancia simple: coinciden si
// uno contiene al otro (cubre "Carol" vs "Carol Bielecki") o si el primer
// nombre coincide exactamente (cubre variantes con apellido distinto/typo).
export function nombresCoinciden(a, b) {
  const na = normalizarNombreMarca(a);
  const nb = normalizarNombreMarca(b);
  if (!na || !nb) return false;
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;
  return na.split(' ')[0] === nb.split(' ')[0];
}

// Matchea un formato detectado contra el "tipo" cargado en clients.asignaciones,
// que puede estar escrito distinto (ej. "Reels" en vez de "Reel").
export function matchFormatoAsignacion(formatoDetectado, tipoAsignacion) {
  const a = normalizarNombreMarca(tipoAsignacion);
  switch (formatoDetectado) {
    case 'Reel': return a.includes('reel');
    case 'Story': return a.includes('stor') || a.includes('historia');
    case 'Carrusel': return a.includes('carrusel');
    case 'Single Post': return a.includes('single') || a.includes('post');
    case 'Pieza Gráfica': return a.includes('diseno') || a.includes('pieza') || a.includes('grafic');
    case 'Estrategia': return a.includes('estrategia');
    default: return false;
  }
}

// ----------------------------------------------------------------------------
// Filtro de incorporación — ignora tarjetas creadas antes de que la persona
// entrara al equipo (profiles."fechaInicio" / team_members.start_date).
// ----------------------------------------------------------------------------
export function tarjetaEsAnteriorAIncorporacion(fechaCreacionTarjetaISO, fechaInicioMiembroYYYYMMDD) {
  if (!fechaInicioMiembroYYYYMMDD || !fechaCreacionTarjetaISO) return false;
  return fechaCreacionTarjetaISO.slice(0, 10) < fechaInicioMiembroYYYYMMDD;
}

// El id de una tarjeta de Trello (ObjectId de Mongo) trae la fecha de creación
// codificada en sus primeros 8 caracteres hexadecimales.
export function fechaCreacionDesdeIdTrello(trelloCardId) {
  if (!trelloCardId || trelloCardId.length < 8) return null;
  const segundosUnix = parseInt(trelloCardId.substring(0, 8), 16);
  if (Number.isNaN(segundosUnix)) return null;
  return new Date(segundosUnix * 1000).toISOString();
}
