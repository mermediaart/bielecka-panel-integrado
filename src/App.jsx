import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, Briefcase, BarChart3, Plus, X,
  Instagram, Trash2, Pencil, ChevronRight, CircleDot, ClipboardCheck,
  Video, Lock, Activity, MessageSquare, CalendarDays, FileText, Upload, CheckCircle2
} from 'lucide-react';
import pdfToText from 'react-pdftotext';
import {
  useSyncedTable, useSyncedClients, useSyncedProfiles,
  useAuthSession, useOwnProfile, enviarLinkAcceso, cerrarSesion, crearReserva, fetchAgendaOcupados
} from './db.js';

// ---------- Design tokens ----------
// navy-950 #0B1220 bg / navy-800 #131B2E panels / violet-300 #B8ACEB accent
// lime-400 #D4FF3D signal / fog-100 #E8E6F0 text / slate-400 #8891A8 muted

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,500&family=Manrope:wght@400;500;600;700;800&display=swap');
`;

const SERVICE_OPTIONS = [
  'Gestión de Redes Sociales', 'Estrategia de Contenido', 'Creación de Contenido',
  'Reportes y Métricas', 'Publicidad Digital (Ads)', 'Asesoría de Comunicación',
  'Edición de Reels', 'Diseño de Piezas', 'Motion Graphics', 'Streaming', 'Experiencias / IA'
];

const CLIENT_STATES = ['Activo', 'Pausado', 'Perdido'];

const ACTIVIDAD_TIPOS_SOCIA = [
  'Hizo la estrategia', 'Cargó el contenido', 'Tiene que revisar el contenido',
  'Aprobó el contenido', 'Tiene que hablar con el cliente', 'Agendó una reunión',
  'Consiguió un nuevo cliente', 'Otro'
];

const ACTIVIDAD_TIPOS_FREELANCE = [
  'Estrategia lista', 'Contenido cargado en Trello y Drive', 'Hay dudas sobre un pedido', 'Otro'
];

// Manuales de pasos por perfil, mostrados en "Mis tareas" para el equipo no directivo
const TRELLO_TUTORIAL_LINK = 'https://drive.google.com/file/d/1WBUfYxRzR9mgyoYISLoaSX6CWXWWlqWc/view?usp=drivesdk';

// Manuales de pasos por perfil, mostrados en "Mis tareas" para el equipo no directivo.
// "general" se muestra siempre, antes del manual específico del perfil.
const MANUAL_GENERAL = {
  titulo: 'Información general y accesos (para todo el equipo)',
  bloques: [
    {
      subtitulo: 'Documentación y archivos de marca',
      texto: 'En el Trello de cada marca, la primera lista siempre es "Información importante". Ahí están las carpetas de Google Drive con los manuales de marca, líneas gráficas y referencias. Es obligatorio revisarla antes de empezar cualquier tarea.',
    },
    {
      subtitulo: 'Si algo está bloqueado o hay un error',
      pasos: [
        'Comentá en la tarjeta de Trello explicando la falla y etiquetá a @all.',
        'Avisá por el grupo de WhatsApp "Equipo Bielecka", especificando el nombre de la tarjeta y el cliente/marca.',
        'Para consultas generales, usá el grupo de WhatsApp etiquetando a la persona correspondiente — si no sabés a quién, preguntalo abierto, capaz alguien lo resuelve más rápido. La vía privada también está siempre disponible.',
      ],
    },
  ],
};

const MANUALES = {
  CM: {
    titulo: 'Community Managers — las 7 etapas de producción',
    pasos: [
      'Estrategia: definir el enfoque y los objetivos de las piezas.',
      'Propuesta: presentar las ideas al cliente.',
      'Solicitudes en Trello: una vez aprobadas las ideas, crear las tarjetas de pedido para editores/diseñadores con la información completa.',
      'Control de calidad: cuando el editor/diseñador termine la pieza, revisar que cumpla con el brief y la identidad de la marca.',
      'Carga en Airtable: mover la tarjeta en Trello de Revisión interna a Cliente, y registrar el contenido en Airtable.',
      'Envío a cliente: compartir el contenido a través de la interfaz/enlace de Airtable.',
      'Programación y publicación: una vez que el cliente aprueba, programar o publicar en la plataforma correspondiente.',
    ],
  },
  'Diseñador/Editor': {
    titulo: 'Diseñadores y Editores',
    pasos: [
      'Revisión de recursos: antes de diseñar o editar, consultá la lista "Información importante" del Trello de la marca para respetar el manual y las referencias visuales.',
      'Entrega de contenido: una vez listo el arte o video, subí el archivo a la carpeta correspondiente en Google Drive.',
      'Notificación en Trello: dentro de la tarjeta de la solicitud, adjuntá o pegá el link del archivo en Drive, y dejá un comentario etiquetando al CM asignado a la marca y a @merlinaapesteguia (Directora Creativa General).',
    ],
  },
};

// Catálogo de packs estándar de Bielecka (de la propuesta de servicios).
// "Personalizado" permite cargar un acuerdo hecho a medida (como Bulonera Meet o los packs Vow).
const PACKS = [
  {
    id: 'inicial', nombre: 'Pack Inicial', fee: 250000,
    resumen: 'Hasta 8 posteos/mes (3 reels, 2 carruseles, 3 posts) + 6 historias. Estrategia y gestión de hasta 2 redes.'
  },
  {
    id: 'intermedio', nombre: 'Pack Intermedio', fee: 600000,
    resumen: 'Hasta 12 posteos/mes (6 reels, 3 carruseles, 3 posts) + 8 historias. Reporte y análisis de rendimiento.'
  },
  {
    id: 'full', nombre: 'Pack Full', fee: 1250000,
    resumen: 'Hasta 16 posteos/mes (8 reels, 4 carruseles, 4 posts) + 10 historias. Filmación, ejecutivo de cuenta asignado.'
  },
  {
    id: 'uno', nombre: 'Pack Uno', fee: 250000,
    resumen: 'Hasta 4 posteos/mes (2 carruseles, 2 posts) + 4 historias. Atención activa para aprobación en colaboración.'
  },
  {
    id: 'dos', nombre: 'Pack Dos', fee: 500000,
    resumen: 'Hasta 12 posteos/mes (6 reels grabados en el lugar, 3 carruseles, 3 posts) + 8 historias.'
  },
  { id: 'personalizado', nombre: 'Personalizado', fee: 0, resumen: 'Acuerdo hecho a medida — cargar detalle manualmente.' },
];

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// Estado de producción de una pieza dentro del historial de un cliente (opcional)
const PRODUCCION_ESTADOS = ['Grabando', 'Editando', 'Publicado', 'Entregado'];
function produccionTone(estado) {
  if (estado === 'Grabando') return 'default';
  if (estado === 'Editando') return 'paused';
  if (estado === 'Publicado' || estado === 'Entregado') return 'active';
  return 'default';
}

// ---------- Control de calidad: flujo de aprobación ----------
// estado: Pendiente → pending_review → approved → Resuelto ("Enviado")
//         pending_review → adjusted (la Directora pidió cambios) → pending_review
// El servidor lo valida con un trigger (ver supabase-schema.sql, sección 10).
const ESTADOS_REVISION = {
  pending_review: { label: 'Pendiente de revisión', tone: 'paused' },
  adjusted: { label: 'Ajustado', tone: 'lost' },
  approved: { label: 'Aprobado', tone: 'active' },
};
// Mismos ids que checklist_bielecka_completo() en el SQL.
const CHECKLIST_BIELECKA = [
  { id: 'tono', texto: 'El tono y la voz respetan el espíritu de Bielecka (cercano, profesional, cuidado al detalle).' },
  { id: 'brief', texto: 'Cumple el brief, el formato y lo acordado con la marca.' },
  { id: 'revision', texto: 'Ortografía, links, identidad visual y material en Trello/Drive revisados.' },
];
const checklistCompleto = (c) => !!c && CHECKLIST_BIELECKA.every(i => c[i.id] === true);
const estaAbierto = (item) => item.estado !== 'Resuelto';

// Estado de un ítem de proceso/tarea según su fecha límite y su etapa de revisión
function procesoEstado(item) {
  if (item.estado === 'Resuelto') return { label: 'Enviado', tone: 'active' };
  if (ESTADOS_REVISION[item.estado]) return ESTADOS_REVISION[item.estado];
  if (item.fechaLimite && item.fechaLimite < new Date().toISOString().slice(0, 10)) {
    return { label: 'Atrasado', tone: 'lost' };
  }
  return { label: 'Pendiente', tone: 'default' };
}

// ---------- Mes de cliente ([Mes X]) y alerta de preparación del mes siguiente ----------
// "Mes N" = meses completos transcurridos desde clients.fechaInicio, +1 (el cliente
// cambia de mes en su aniversario mensual, no el día 1). La alerta se activa en los
// últimos DIAS_ALERTA_FIN_DE_MES días del mes en curso.
const DIAS_ALERTA_FIN_DE_MES = 7;
const ESTADOS_LISTOS_PARA_MES = ['pending_review', 'approved', 'Resuelto'];

const isoLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function sumarMesesISO(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(y, m - 1 + n, 1);
  const ultimo = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  t.setDate(Math.min(d, ultimo));
  return isoLocal(t);
}

function mesDeCliente(fechaInicio, hoy = new Date()) {
  if (!fechaInicio || !/^\d{4}-\d{2}-\d{2}$/.test(fechaInicio)) return null;
  const hoyISO = isoLocal(hoy);
  if (hoyISO < fechaInicio) return null; // todavía no ingresó
  let n = 0;
  while (sumarMesesISO(fechaInicio, n + 1) <= hoyISO) n++;
  return { mes: n + 1, siguienteInicio: sumarMesesISO(fechaInicio, n + 1), siguienteFin: sumarMesesISO(fechaInicio, n + 2) };
}

// Devuelve null (sin alerta) o { texto } si el cliente está en Mes ≥ 2, el mes en curso
// está por terminar y las tareas del mes siguiente no están en revisión/aprobadas/enviadas.
function alertaMesSiguiente(client, procesos, hoy = new Date()) {
  if (client.status !== 'Activo') return null;
  const info = mesDeCliente(client.fechaInicio, hoy);
  if (!info || info.mes < 2) return null;
  const hoyMs = new Date(isoLocal(hoy) + 'T00:00:00').getTime();
  const diasRestantes = Math.round((new Date(info.siguienteInicio + 'T00:00:00').getTime() - hoyMs) / 86400000);
  if (diasRestantes > DIAS_ALERTA_FIN_DE_MES) return null;

  const delMesSiguiente = procesos.filter(p =>
    p.clientId === client.id && p.fechaLimite && p.fechaLimite >= info.siguienteInicio && p.fechaLimite < info.siguienteFin
  );
  if (delMesSiguiente.length === 0) {
    return { texto: `El mes termina en ${diasRestantes} día${diasRestantes === 1 ? '' : 's'} y no hay tareas cargadas para el Mes ${info.mes + 1}.` };
  }
  const sinPreparar = delMesSiguiente.filter(p => !ESTADOS_LISTOS_PARA_MES.includes(p.estado));
  if (sinPreparar.length === 0) return null;
  return { texto: `El mes termina en ${diasRestantes} día${diasRestantes === 1 ? '' : 's'}: ${sinPreparar.length} de ${delMesSiguiente.length} tareas del Mes ${info.mes + 1} aún no están en revisión ni aprobadas.` };
}

// ---------- Matriz RACI por roles ----------
// R = Responsable (ejecuta) · A = Aprobador (rinde cuentas, uno solo por fila)
// C = Consultado · I = Informado.
const RACI_ROLES = [
  { id: 'directora', label: 'Directora' },
  { id: 'lider', label: 'Líder de cuenta' },
  { id: 'ejecutor', label: 'Ejecutor/a' },
];
const RACI_ACTIVIDADES = [
  { id: 'alta', texto: 'Alta de cliente y definición del pack', directora: 'A/R', lider: 'C', ejecutor: 'I' },
  { id: 'estrategia', texto: 'Estrategia mensual de contenido', directora: 'A', lider: 'R', ejecutor: 'C' },
  { id: 'carga', texto: 'Carga de contenido en Trello y Drive', directora: 'I', lider: 'A', ejecutor: 'R' },
  { id: 'produccion', texto: 'Producción de piezas (reels, diseño, carruseles)', directora: 'I', lider: 'A', ejecutor: 'R' },
  { id: 'checklist', texto: 'Checklist de calidad antes de enviar a revisión', directora: 'I', lider: 'C', ejecutor: 'A/R' },
  { id: 'revision', texto: 'Revisión interna y aprobación', directora: 'A/R', lider: 'C', ejecutor: 'I' },
  { id: 'ajustes', texto: 'Ajustes tras la revisión', directora: 'C', lider: 'A', ejecutor: 'R' },
  { id: 'envio', texto: 'Envío al cliente', directora: 'I', lider: 'A/R', ejecutor: 'I' },
  { id: 'dudas', texto: 'Avisar desvíos o dudas sobre un pedido', directora: 'I', lider: 'A', ejecutor: 'R' },
  { id: 'auditoria', texto: 'Auditoría mensual de la cuenta', directora: 'A/R', lider: 'C', ejecutor: 'I' },
];
const RACI_TONOS = {
  'A/R': { bg: 'rgba(212,255,61,0.18)', color: '#D4FF3D' },
  A: { bg: 'rgba(212,255,61,0.12)', color: '#D4FF3D' },
  R: { bg: 'rgba(184,172,235,0.18)', color: '#B8ACEB' },
  C: { bg: '#1C2740', color: '#8891A8' },
  I: { bg: 'transparent', color: '#5C6785' },
};

// Rol RACI de una persona del equipo: Directora (Socia), Líder de cuenta (CM) o Ejecutor/a
function rolRaci(profile) {
  if (profile?.tipo === 'Socia') return 'directora';
  if (profile?.perfil === 'CM') return 'lider';
  return 'ejecutor';
}

// ---------- Seed data ----------
const SEED_CLIENTS = [
  {
    id: 'dentalpro', name: 'Dental Pro', status: 'Activo',
    servicios: ['Gestión de Redes Sociales', 'Creación de Contenido'],
    pack: 'personalizado', fee: 220000, fechaInicio: '2026-07-01', contacto: '',
    trelloBoardLink: '', driveFolderLink: '', formsLink: '', pinterestLink: '',
    notas: 'Facturado $220.000 ARS en julio 2026 por edición y diseño especializado.'
  },
  {
    id: 'unakita', name: 'Unakita', status: 'Activo',
    servicios: [], pack: '', fee: '', fechaInicio: '', contacto: '',
    trelloBoardLink: '', driveFolderLink: '', formsLink: '', pinterestLink: '', notas: ''
  },
  {
    id: 'bielecka-marca', name: 'Bielecka', status: 'Activo',
    servicios: [], pack: '', fee: '', fechaInicio: '', contacto: '',
    trelloBoardLink: '', driveFolderLink: '', formsLink: '', pinterestLink: '', notas: ''
  },
  {
    id: 'buloneramet', name: 'Bulonera Meet', status: 'Activo',
    servicios: ['Gestión de Redes Sociales'], pack: 'inicial', fee: 300000, fechaInicio: '2026-06-03', contacto: '',
    trelloBoardLink: '', driveFolderLink: '', formsLink: '', pinterestLink: '',
    notas: 'Responsables de marca: Rocío y Ezequiel. Redes: Instagram, Facebook y WhatsApp Business.'
  },
  {
    id: 'florenciamartelli', name: 'Florencia Martelli', status: 'Activo',
    servicios: [], pack: '', fee: '', fechaInicio: '', contacto: '',
    trelloBoardLink: '', driveFolderLink: '', formsLink: '', pinterestLink: '', notas: ''
  },
  {
    id: 'expertosprepagas', name: 'Expertos en prepagas | Rodrigo', status: 'Activo',
    servicios: [], pack: '', fee: '', fechaInicio: '', contacto: '',
    trelloBoardLink: '', driveFolderLink: '', formsLink: '', pinterestLink: '', notas: ''
  },
  {
    id: 'descaradas', name: 'Descaradas', status: 'Activo',
    servicios: ['Streaming'], pack: '', fee: '', fechaInicio: '', contacto: '',
    trelloBoardLink: '', driveFolderLink: '', formsLink: '', pinterestLink: '', notas: ''
  },
  {
    id: 'vowstreaming', name: 'Vow Streaming', status: 'Activo',
    servicios: ['Streaming'], pack: '', fee: '', fechaInicio: '', contacto: '',
    trelloBoardLink: '', driveFolderLink: '', formsLink: '', pinterestLink: '', notas: ''
  },
];

const SEED_PROCESOS = [];
const SEED_METRICS = [];
const SEED_NOTAS = [];
const SEED_ACTIVIDAD = [];
const SEED_MENSAJES = [];
const SEED_BRIEFS = [];

// ---------- Small building blocks ----------
function SectionHeader({ eyebrow, title, action }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <span style={{
        display: 'inline-block', background: '#B8ACEB', color: '#0B1220',
        fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
        padding: '4px 10px', borderRadius: 4, marginBottom: 10
      }}>{eyebrow}</span>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <h1 style={{
          fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 32, color: '#E8E6F0', margin: 0,
          fontStyle: 'italic'
        }}>{title}</h1>
        {action}
      </div>
      <div style={{ height: 3, width: 64, background: '#D4FF3D', marginTop: 14, borderRadius: 2 }} />
    </div>
  );
}

function Pill({ children, tone = 'default' }) {
  const tones = {
    default: { bg: '#1C2740', color: '#8891A8' },
    active: { bg: 'rgba(212,255,61,0.15)', color: '#D4FF3D' },
    paused: { bg: 'rgba(184,172,235,0.15)', color: '#B8ACEB' },
    lost: { bg: 'rgba(230,90,90,0.15)', color: '#E68C8C' },
  };
  const t = tones[tone] || tones.default;
  return (
    <span style={{
      background: t.bg, color: t.color, fontSize: 12, fontWeight: 700,
      padding: '3px 10px', borderRadius: 20, letterSpacing: '0.02em'
    }}>{children}</span>
  );
}

function statusTone(status) {
  if (status === 'Activo') return 'active';
  if (status === 'Pausado') return 'paused';
  if (status === 'Perdido') return 'lost';
  return 'default';
}

function Button({ children, onClick, variant = 'primary', type = 'button', style, disabled = false }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: "'Manrope', sans-serif",
    fontWeight: 700, fontSize: 13, padding: '9px 16px', borderRadius: 8, border: 'none',
    cursor: 'pointer', transition: 'transform 0.12s ease',
  };
  const variants = {
    primary: { background: '#D4FF3D', color: '#0B1220' },
    ghost: { background: 'transparent', color: '#B8ACEB', border: '1px solid #2A3450' },
    danger: { background: 'rgba(230,90,90,0.12)', color: '#E68C8C' },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
      onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
      style={{ ...base, ...variants[variant], ...(disabled ? { opacity: 0.45, cursor: 'not-allowed' } : {}), ...style }}
    >{children}</button>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 14 }}>
      <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#8891A8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle = {
  width: '100%', background: '#0B1220', border: '1px solid #2A3450', borderRadius: 8,
  padding: '10px 12px', color: '#E8E6F0', fontFamily: "'Manrope', sans-serif", fontSize: 14,
  boxSizing: 'border-box', outline: 'none'
};

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(11,18,32,0.75)', backdropFilter: 'blur(2px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20
    }} onClick={onClose}>
      <div
        style={{
          background: '#131B2E', border: '1px solid #2A3450', borderRadius: 16, padding: 28,
          width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, color: '#E8E6F0', margin: 0, fontStyle: 'italic' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8891A8', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function timeAgo(iso) {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'recién';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

// Arma un link de Google Calendar con título, fecha/hora e invitados precargados,
// para no tener que volver a tipear todo dentro de Calendar. Duración por defecto: 1 hora.
function buildGCalUrl({ titulo, fecha, hora, emails, notas }) {
  const pad = (n) => String(n).padStart(2, '0');
  let dates = '';
  if (fecha) {
    const [y, m, d] = fecha.split('-');
    const [hh, mm] = (hora || '12:00').split(':');
    const start = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm || 0));
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const fmt = (dt) => `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
    dates = `&dates=${fmt(start)}/${fmt(end)}`;
  }
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: titulo || 'Reunión Bielecka',
    details: notas || 'Agendado desde el panel de Bielecka. Agregá Google Meet antes de guardar.',
  });
  const add = (emails && emails.length) ? `&add=${encodeURIComponent(emails.join(','))}` : '';
  return `https://calendar.google.com/calendar/render?${params.toString()}${dates}${add}`;
}

// Botón chico para mandar una tarea puntual (con fecha límite) a Google Calendar.
function AgregarCalendarBoton({ titulo, fechaLimite, notas, email, hora }) {
  if (!fechaLimite) return null;
  const url = buildGCalUrl({ titulo, fecha: fechaLimite, hora: hora || '09:00', notas, emails: email ? [email] : [] });
  return (
    <a href={url} target="_blank" rel="noreferrer">
      <Button variant="ghost"><CalendarDays size={13} /> Agregar a Calendar</Button>
    </a>
  );
}

// Simula el aviso por mail al asignar una tarea (no envía un mail real — ver nota en README
// sobre cómo conectar un envío real más adelante si hace falta).
function NotificacionSimulada({ mensaje }) {
  return (
    <div style={{
      fontSize: 12, color: '#D4FF3D', background: 'rgba(212,255,61,0.08)',
      border: '1px solid rgba(212,255,61,0.25)', borderRadius: 8, padding: '8px 12px',
      display: 'flex', alignItems: 'center', gap: 8
    }}>
      📧 {mensaje}
    </div>
  );
}

function EmptyState({ text }) {
  return <div style={{ color: '#5C6785', fontSize: 13, fontStyle: 'italic', padding: '10px 0' }}>{text}</div>;
}

// ---------- Notas (dos categorías: directivas y equipo general) ----------
function AddNotaBox({ notas, setNotas, currentUser, categoria }) {
  const [texto, setTexto] = useState('');

  const addNota = () => {
    if (!texto.trim()) return;
    setNotas([{ id: uid(), autor: currentUser.name, contenido: texto, categoria, resuelto: false, fecha: new Date().toISOString() }, ...notas]);
    setTexto('');
  };

  return (
    <div style={{ background: '#131B2E', border: '1px solid #2A3450', borderRadius: 12, padding: 16 }}>
      <textarea
        style={{ ...inputStyle, minHeight: 70, marginBottom: 10 }}
        value={texto} onChange={e => setTexto(e.target.value)}
        placeholder="Escribí una nota, idea o pendiente..."
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={addNota}><Plus size={14} /> Agregar</Button>
      </div>
    </div>
  );
}

function NotasView({ notas, setNotas, currentUser, isSocia }) {
  const [pane, setPane] = useState('equipo'); // 'equipo' | 'directivas'

  const visibles = notas.filter(n => n.categoria === pane);
  const toggleResuelto = (id) => setNotas(notas.map(n => n.id === id ? { ...n, resuelto: !n.resuelto } : n));
  const remove = (id) => setNotas(notas.filter(n => n.id !== id));

  return (
    <div>
      <SectionHeader
        eyebrow={pane === 'directivas' ? 'Solo Equipo directivo' : 'Todo el equipo'}
        title="Notas"
        action={isSocia ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant={pane === 'equipo' ? 'primary' : 'ghost'} onClick={() => setPane('equipo')}>Equipo general</Button>
            <Button variant={pane === 'directivas' ? 'primary' : 'ghost'} onClick={() => setPane('directivas')}>Equipo directivo</Button>
          </div>
        ) : null}
      />
      <div style={{ fontSize: 12, color: '#5C6785', marginBottom: 20, maxWidth: 520 }}>
        {pane === 'directivas'
          ? 'Espacio privado para Carol, Merlina y Glenda — ideas, pendientes de hablar, cosas que surgen en videollamada o WhatsApp. Los freelancers no tienen acceso acá.'
          : 'Notas visibles para todo el equipo, incluyendo freelancers — avisos, recordatorios, cosas generales del día a día.'}
      </div>

      <div style={{ marginBottom: 24 }}>
        <AddNotaBox notas={notas} setNotas={setNotas} currentUser={currentUser} categoria={pane} />
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {visibles.length === 0 && <EmptyState text="Todavía no hay notas acá." />}
        {visibles.map(n => (
          <div key={n.id} style={{
            background: '#131B2E', border: '1px solid #2A3450', borderRadius: 10, padding: 14,
            opacity: n.resuelto ? 0.5 : 1
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', flex: 1 }}>
                <input type="checkbox" checked={n.resuelto} onChange={() => toggleResuelto(n.id)} style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0, accentColor: '#D4FF3D' }} />
                <div>
                  <div style={{ fontSize: 11, color: '#5C6785', marginBottom: 4 }}>
                    {n.autor} · {new Date(n.fecha).toLocaleDateString('es-AR')}
                  </div>
                  <div style={{ fontSize: 14, color: '#E8E6F0', textDecoration: n.resuelto ? 'line-through' : 'none' }}>{n.contenido}</div>
                </div>
              </label>
              <button onClick={() => remove(n.id)} style={{ background: 'none', border: 'none', color: '#E68C8C', cursor: 'pointer' }}><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Videollamada (compartida: equipo interno o reunión con una marca) ----------
function VideollamadaForm({ team, clients, defaultClientId, onSave }) {
  const [seleccionados, setSeleccionados] = useState([]);
  const [clientId, setClientId] = useState(defaultClientId || '');
  const [titulo, setTitulo] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [meetLink, setMeetLink] = useState('');

  const toggle = (id) => setSeleccionados(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const emails = seleccionados.map(id => team.find(t => t.id === id)?.email).filter(Boolean);
  const sinEmail = seleccionados.map(id => team.find(t => t.id === id)).filter(t => t && !t.email);
  const marca = clients.find(c => c.id === clientId);

  return (
    <div>
      <Field label="Título">
        <input
          style={inputStyle} value={titulo} onChange={e => setTitulo(e.target.value)}
          placeholder={marca ? `Reunión con ${marca.name}` : 'Ej. Reunión semanal de equipo'}
        />
      </Field>
      {!defaultClientId && clients.length > 0 && (
        <Field label="¿Es una reunión con una marca? (opcional)">
          <select style={inputStyle} value={clientId} onChange={e => setClientId(e.target.value)}>
            <option value="">No, es interna del equipo</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      )}
      <Field label="Fecha"><input style={inputStyle} type="date" value={fecha} onChange={e => setFecha(e.target.value)} /></Field>
      <Field label="Hora"><input style={inputStyle} type="time" value={hora} onChange={e => setHora(e.target.value)} /></Field>
      <Field label="¿Quiénes del equipo participan?">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {team.map(t => (
            <button key={t.id} type="button" onClick={() => toggle(t.id)} style={{
              fontSize: 11, padding: '5px 9px', borderRadius: 20, cursor: 'pointer', border: '1px solid #2A3450',
              background: seleccionados.includes(t.id) ? '#D4FF3D' : 'transparent',
              color: seleccionados.includes(t.id) ? '#0B1220' : '#8891A8', fontWeight: 600
            }}>{t.name}</button>
          ))}
        </div>
      </Field>

      {seleccionados.length > 0 && sinEmail.length > 0 && (
        <div style={{ fontSize: 11, color: '#E68C8C', marginBottom: 14 }}>
          Sin mail cargado: {sinEmail.map(t => t.name).join(', ')} — cargalo en su ficha de Equipo para poder invitarlo.
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
        <a href={buildGCalUrl({ titulo: titulo || (marca ? `Reunión con ${marca.name}` : 'Reunión Bielecka'), fecha, hora, emails })} target="_blank" rel="noreferrer" style={{ flex: 1 }}>
          <Button style={{ width: '100%', justifyContent: 'center' }}>Agendar en Google Calendar ↗</Button>
        </a>
      </div>
      <div style={{ fontSize: 11, color: '#5C6785', marginBottom: 14, lineHeight: 1.5 }}>
        Se abre Calendar con título, fecha, hora e invitados ya cargados — solo falta que apretes
        "Agregar videoconferencia de Google Meet" y guardar. El aviso por mail lo manda Google solo.
      </div>
      <Field label="Link de Meet (pegalo acá una vez que lo genere Calendar)">
        <input style={inputStyle} value={meetLink} onChange={e => setMeetLink(e.target.value)} placeholder="https://meet.google.com/..." />
      </Field>

      <Button
        onClick={() => onSave({
          titulo: titulo || (marca ? `Reunión con ${marca.name}` : 'Videollamada de equipo'),
          fecha, hora, meetLink, asistentes: seleccionados, clientId: clientId || null
        })}
        style={{ width: '100%', justifyContent: 'center' }}
      >Guardar</Button>
    </div>
  );
}

// ---------- Actividad (bitácora unificada) ----------
function ActividadView({ actividad, setActividad, currentUser, isSocia, clients, team }) {
  const tiposDisponibles = isSocia ? ACTIVIDAD_TIPOS_SOCIA : ACTIVIDAD_TIPOS_FREELANCE;
  const [tipo, setTipo] = useState(tiposDisponibles[0]);
  const [clientId, setClientId] = useState('');
  const [texto, setTexto] = useState('');
  const [visibilidad, setVisibilidad] = useState('equipo');

  const clientName = (id) => clients.find(c => c.id === id)?.name;

  const visibles = actividad
    .filter(a => isSocia || a.visibilidad === 'equipo')
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const agregar = () => {
    if (!tipo) return;
    setActividad([{
      id: uid(), autor: currentUser.name, tipo, clientId: clientId || null, texto,
      visibilidad: isSocia ? visibilidad : 'equipo', fecha: new Date().toISOString()
    }, ...actividad]);
    setTexto(''); setClientId(''); setVisibilidad('equipo');
  };

  const remove = (id) => setActividad(actividad.filter(a => a.id !== id));

  return (
    <div>
      <SectionHeader eyebrow="Bitácora del equipo" title="Actividad" />
      <div style={{ fontSize: 12, color: '#5C6785', marginBottom: 20, maxWidth: 560 }}>
        Un registro rápido de qué se movió — sin duplicar el detalle de piezas que ya vive en Trello.
        Ej: "Persona 1 cargó el contenido de la marca", "Persona 2 aprobó el contenido".
      </div>

      <div style={{ background: '#131B2E', border: '1px solid #2A3450', borderRadius: 12, padding: 16, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <select style={inputStyle} value={tipo} onChange={e => setTipo(e.target.value)}>
            {tiposDisponibles.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select style={inputStyle} value={clientId} onChange={e => setClientId(e.target.value)}>
            <option value="">Sin marca específica</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <input
          style={{ ...inputStyle, marginBottom: 10 }} value={texto} onChange={e => setTexto(e.target.value)}
          placeholder="Detalle opcional, ej. martes 15hs, equipo completo"
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {isSocia ? (
            <select style={{ ...inputStyle, width: 200 }} value={visibilidad} onChange={e => setVisibilidad(e.target.value)}>
              <option value="equipo">Visible para todo el equipo</option>
              <option value="directivas">Solo para directivas</option>
            </select>
          ) : <span />}
          <Button onClick={agregar}><Plus size={14} /> Registrar</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {visibles.length === 0 && <EmptyState text="Todavía no hay actividad registrada." />}
        {visibles.map(a => (
          <div key={a.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
            background: '#131B2E', border: '1px solid #2A3450', borderRadius: 10, padding: '12px 16px', flexWrap: 'wrap'
          }}>
            <div>
              <span style={{ fontSize: 13, color: '#E8E6F0' }}>
                <strong>{a.autor}</strong> · {a.tipo}{clientName(a.clientId) ? ` — ${clientName(a.clientId)}` : ''}
              </span>
              {a.texto && <div style={{ fontSize: 12, color: '#8891A8', marginTop: 3 }}>{a.texto}</div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {a.meetLink && <a href={a.meetLink} target="_blank" rel="noreferrer"><Button variant="ghost">Entrar a la llamada ↗</Button></a>}
              {a.visibilidad === 'directivas' && <Pill tone="paused">Solo directivas</Pill>}
              <span style={{ fontSize: 11, color: '#5C6785' }}>{timeAgo(a.fecha)}</span>
              {isSocia && <button onClick={() => remove(a.id)} style={{ background: 'none', border: 'none', color: '#E68C8C', cursor: 'pointer' }}><Trash2 size={13} /></button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Clientes (con historial de procesos por marca) ----------
function ProcesoLog({ client, procesos, setProcesos, team, currentUser, comentarios, setComentarios }) {
  const [expandido, setExpandido] = useState(false);
  const [texto, setTexto] = useState('');
  const [responsable, setResponsable] = useState('');
  const [fechaLimite, setFechaLimite] = useState('');
  const [link, setLink] = useState('');
  const [estadoProduccion, setEstadoProduccion] = useState('');
  const [avisoMail, setAvisoMail] = useState('');

  const propios = procesos.filter(p => p.clientId === client.id).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  const pendientes = propios.filter(estaAbierto);
  const teamById = (id) => team.find(t => t.id === id);

  const agregar = () => {
    if (!texto.trim()) return;
    setProcesos([{
      id: uid(), clientId: client.id, texto, executor_id: responsable || null,
      fechaLimite: fechaLimite || null, link, estadoProduccion: estadoProduccion || null,
      estado: 'Pendiente', autor: currentUser.name, fecha: new Date().toISOString()
    }, ...procesos]);

    if (responsable) {
      const persona = teamById(responsable);
      if (persona) {
        setAvisoMail(`Se avisaría a ${persona.name}${persona.email ? ` (${persona.email})` : ''} por mail sobre esta tarea.`);
        setTimeout(() => setAvisoMail(''), 5000);
      }
    }
    setTexto(''); setResponsable(''); setFechaLimite(''); setLink(''); setEstadoProduccion('');
  };

  const updateProceso = (id, patch) => setProcesos(procesos.map(p => p.id === id ? { ...p, ...patch } : p));
  const setItemProduccion = (id, val) => setProcesos(procesos.map(p => p.id === id ? { ...p, estadoProduccion: val || null } : p));
  const remove = (id) => setProcesos(procesos.filter(p => p.id !== id));
  const teamName = (id) => teamById(id)?.name || '—';

  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #1C2740' }}>
      <button onClick={() => setExpandido(x => !x)} style={{
        background: 'none', border: 'none', color: '#B8ACEB', fontSize: 12, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 6, padding: 0
      }}>
        <MessageSquare size={13} />
        Historial y pendientes ({propios.length}{pendientes.length > 0 ? `, ${pendientes.length} pendiente${pendientes.length > 1 ? 's' : ''}` : ''})
        <ChevronRight size={13} style={{ transform: expandido ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {expandido && (
        <div style={{ marginTop: 12 }}>
          {avisoMail && <div style={{ marginBottom: 12 }}><NotificacionSimulada mensaje={avisoMail} /></div>}
          <div style={{ background: '#0B1220', border: '1px solid #2A3450', borderRadius: 10, padding: 12, marginBottom: 12 }}>
            <textarea
              style={{ ...inputStyle, minHeight: 50, marginBottom: 8 }} value={texto} onChange={e => setTexto(e.target.value)}
              placeholder='Ej. "La marca prometió x cosa" o "Pendiente enviar propuesta de pack"'
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <select style={inputStyle} value={responsable} onChange={e => setResponsable(e.target.value)}>
                <option value="">¿Quién lo ejecuta?</option>
                {team.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <input style={inputStyle} type="date" value={fechaLimite} onChange={e => setFechaLimite(e.target.value)} placeholder="Fecha límite" />
            </div>
            <div style={{ marginBottom: 8 }}>
              <select style={inputStyle} value={estadoProduccion} onChange={e => setEstadoProduccion(e.target.value)}>
                <option value="">Estado de producción (opcional)</option>
                {PRODUCCION_ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <input style={{ ...inputStyle, marginBottom: 8 }} value={link} onChange={e => setLink(e.target.value)} placeholder="Link opcional (propuesta, Drive, etc.)" />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={agregar}><Plus size={13} /> Registrar</Button>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            {propios.length === 0 && <EmptyState text="Sin historial todavía." />}
            {propios.map(p => (
              <div key={p.id} style={{ background: '#0B1220', border: '1px solid #1C2740', borderRadius: 8, padding: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div>
                      <div style={{ fontSize: 13, color: '#E8E6F0', textDecoration: p.estado === 'Resuelto' ? 'line-through' : 'none' }}>{p.texto}</div>
                      <div style={{ fontSize: 11, color: '#5C6785', marginTop: 3 }}>
                        {new Date(p.fecha).toLocaleDateString('es-AR')}
                        {p.executor_id ? ` · Ejecuta: ${teamName(p.executor_id)}` : ''}
                        {p.fechaLimite ? ` · Límite: ${p.fechaLimite}` : ''}
                        {p.link ? <> · <a href={p.link} target="_blank" rel="noreferrer" style={{ color: '#B8ACEB' }}>Link ↗</a></> : ''}
                      </div>
                    </div>
                    <div style={{ marginTop: 8 }}><EntregaAcciones item={p} currentUser={currentUser} update={updateProceso} /></div>
                    <ComentariosTarea item={p} comentarios={comentarios} setComentarios={setComentarios} currentUser={currentUser} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {p.estadoProduccion && <Pill tone={produccionTone(p.estadoProduccion)}>{p.estadoProduccion}</Pill>}
                    <select
                      value={p.estadoProduccion || ''} onChange={e => setItemProduccion(p.id, e.target.value)}
                      style={{ ...inputStyle, padding: '3px 6px', fontSize: 11, width: 120 }}
                    >
                      <option value="">Sin estado de producción</option>
                      {PRODUCCION_ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <Pill tone={procesoEstado(p).tone}>{procesoEstado(p).label}</Pill>
                    {p.fechaLimite && <AgregarCalendarBoton titulo={`${client.name} — ${p.texto}`} fechaLimite={p.fechaLimite} notas={p.texto} email={teamById(p.executor_id)?.email} />}
                    <button onClick={() => remove(p.id)} style={{ background: 'none', border: 'none', color: '#E68C8C', cursor: 'pointer' }}><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ClientesView({ clients, setClients, procesos, setProcesos, team, currentUser, actividad, setActividad, comentarios, setComentarios }) {
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [callFor, setCallFor] = useState(null); // client object or null

  const save = (data) => {
    if (data.id) {
      setClients(clients.map(c => c.id === data.id ? data : c));
    } else {
      const newId = uid();
      setClients([...clients, { ...data, id: newId }]);
      setActividad([{
        id: uid(), autor: currentUser?.name || 'Equipo directivo', tipo: 'Consiguió un nuevo cliente',
        clientId: newId, texto: '', visibilidad: 'directivas', fecha: new Date().toISOString()
      }, ...actividad]);
    }
    setShowForm(false); setEditing(null);
  };
  const remove = (id) => setClients(clients.filter(c => c.id !== id));

  const marcasFaltantes = SEED_CLIENTS.filter(sc => !clients.some(c => c.name.toLowerCase() === sc.name.toLowerCase()));
  const importarFaltantes = () => {
    const nuevos = marcasFaltantes.map(sc => ({ ...sc, id: uid() }));
    setClients([...clients, ...nuevos]);
  };

  const guardarReunion = (r) => {
    const invitadosTexto = r.asistentes.map(id => team.find(t => t.id === id)?.name).filter(Boolean).join(', ');
    setActividad([{
      id: uid(), autor: currentUser?.name || 'Equipo directivo', tipo: 'Agendó una reunión', clientId: r.clientId,
      texto: `${r.titulo}${r.fecha ? ` · ${r.fecha}` : ''}${r.hora ? ` ${r.hora}hs` : ''}${invitadosTexto ? ` · ${invitadosTexto}` : ''}`,
      meetLink: r.meetLink || null, visibilidad: 'equipo', fecha: new Date().toISOString()
    }, ...actividad]);
    setCallFor(null);
  };

  return (
    <div>
      <SectionHeader
        eyebrow="Marcas"
        title="Clientes"
        action={
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {marcasFaltantes.length > 0 && (
              <Button variant="ghost" onClick={importarFaltantes}>Importar marcas faltantes ({marcasFaltantes.length})</Button>
            )}
            <Button onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={15} /> Nuevo cliente</Button>
          </div>
        }
      />
      <div style={{ display: 'grid', gap: 14 }}>
        {clients.length === 0 && <EmptyState text="Todavía no cargaste ningún cliente." />}
        {clients.map(c => {
          const pack = PACKS.find(p => p.id === c.pack);
          const mesInfo = mesDeCliente(c.fechaInicio);
          const alerta = alertaMesSiguiente(c, procesos);
          return (
            <div key={c.id} style={{
              background: '#131B2E', border: alerta ? '1px solid rgba(230,90,90,0.6)' : '1px solid #2A3450',
              borderLeft: alerta ? '3px solid #E68C8C' : undefined, borderRadius: 14, padding: 20
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, color: '#E8E6F0', fontStyle: 'italic' }}>{c.name}</span>
                    {mesInfo && (
                      <span title={alerta ? alerta.texto : `Mes ${mesInfo.mes} desde el ingreso`}>
                        <Pill tone={alerta ? 'lost' : 'paused'}>{alerta ? '⚠ ' : ''}[Mes {mesInfo.mes}]</Pill>
                      </span>
                    )}
                    <Pill tone={statusTone(c.status)}>{c.status}</Pill>
                    {pack && <Pill tone="paused">{pack.nombre}</Pill>}
                  </div>
                  {alerta && <div style={{ fontSize: 12, color: '#E68C8C', marginBottom: 8 }}>{alerta.texto}</div>}
                  <div style={{ fontSize: 13, color: '#8891A8', marginBottom: 8 }}>
                    {c.servicios?.join(' · ') || 'Sin servicios asignados'}
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#5C6785', flexWrap: 'wrap' }}>
                    {c.fee ? <span>${Number(c.fee).toLocaleString('es-AR')} ARS/mes</span> : null}
                    {c.fechaInicio ? <span>Desde {c.fechaInicio}</span> : null}
                    {c.account_lead_id ? <span>Líder de cuenta: {team.find(t => t.id === c.account_lead_id)?.name || '—'}</span> : null}
                    {c.contacto ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Instagram size={13} />{c.contacto}</span> : null}
                  </div>
                  {c.notas && <div style={{ fontSize: 13, color: '#8891A8', marginTop: 10, fontStyle: 'italic' }}>{c.notas}</div>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    {c.trelloBoardLink && (
                      <a href={c.trelloBoardLink} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#B8ACEB', border: '1px solid #2A3450', borderRadius: 6, padding: '5px 10px' }}>Tablero de Trello ↗</a>
                    )}
                    {c.driveFolderLink && (
                      <a href={c.driveFolderLink} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#B8ACEB', border: '1px solid #2A3450', borderRadius: 6, padding: '5px 10px' }}>Carpeta de Drive ↗</a>
                    )}
                    {c.formsLink && (
                      <a href={c.formsLink} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#B8ACEB', border: '1px solid #2A3450', borderRadius: 6, padding: '5px 10px' }}>Forms ↗</a>
                    )}
                    {c.pinterestLink && (
                      <a href={c.pinterestLink} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#B8ACEB', border: '1px solid #2A3450', borderRadius: 6, padding: '5px 10px' }}>Pinterest ↗</a>
                    )}
                    <Button variant="ghost" onClick={() => setCallFor(c)}><Video size={13} /> Agendar reunión</Button>
                  </div>
                  <AsignacionesEquipo client={c} clients={clients} setClients={setClients} />
                  <ProcesoLog client={c} procesos={procesos} setProcesos={setProcesos} team={team} currentUser={currentUser} comentarios={comentarios} setComentarios={setComentarios} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="ghost" onClick={() => { setEditing(c); setShowForm(true); }}><Pencil size={13} /></Button>
                  <Button variant="danger" onClick={() => remove(c.id)}><Trash2 size={13} /></Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <ClientForm initial={editing} onSave={save} onClose={() => { setShowForm(false); setEditing(null); }} team={team} />
      )}

      {callFor && (
        <Modal title={`Agendar reunión con ${callFor.name}`} onClose={() => setCallFor(null)}>
          <VideollamadaForm team={team} clients={clients} defaultClientId={callFor.id} onSave={guardarReunion} />
        </Modal>
      )}
    </div>
  );
}

function AsignacionesEquipo({ client, clients, setClients }) {
  const [expandido, setExpandido] = useState(false);
  const [tipo, setTipo] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [responsable, setResponsable] = useState('');

  const asignaciones = client.asignaciones || [];

  const guardar = (nuevas) => {
    setClients(clients.map(c => c.id === client.id ? { ...c, asignaciones: nuevas } : c));
  };

  const agregar = () => {
    if (!tipo.trim() || !responsable.trim()) return;
    guardar([...asignaciones, { id: uid(), tipo, cantidad, responsable }]);
    setTipo(''); setCantidad(''); setResponsable('');
  };
  const remove = (id) => guardar(asignaciones.filter(a => a.id !== id));

  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #1C2740' }}>
      <button onClick={() => setExpandido(x => !x)} style={{
        background: 'none', border: 'none', color: '#B8ACEB', fontSize: 12, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 6, padding: 0
      }}>
        <Users size={13} />
        Equipo asignado ({asignaciones.length})
        <ChevronRight size={13} style={{ transform: expandido ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {expandido && (
        <div style={{ marginTop: 12 }}>
          {asignaciones.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {asignaciones.map(a => (
                <span key={a.id} style={{
                  fontSize: 12, background: '#0B1220', border: '1px solid #2A3450', borderRadius: 20,
                  padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 6, color: '#E8E6F0'
                }}>
                  {a.cantidad ? `${a.cantidad} ` : ''}{a.tipo} — {a.responsable}
                  <button onClick={() => remove(a.id)} style={{ background: 'none', border: 'none', color: '#5C6785', cursor: 'pointer', display: 'flex' }}><X size={12} /></button>
                </span>
              ))}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8 }}>
            <input style={inputStyle} value={tipo} onChange={e => setTipo(e.target.value)} placeholder="Ej. Reels, CM, Estrategia" />
            <input style={inputStyle} value={cantidad} onChange={e => setCantidad(e.target.value)} placeholder="Cant." />
            <input style={inputStyle} value={responsable} onChange={e => setResponsable(e.target.value)} placeholder="Responsable" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <Button onClick={agregar}><Plus size={13} /> Agregar</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ClientForm({ initial, onSave, onClose, team = [] }) {
  const [form, setForm] = useState(initial || {
    name: '', status: 'Activo', account_lead_id: '', servicios: [], pack: '', fee: '', fechaInicio: '', contacto: '',
    trelloBoardLink: '', driveFolderLink: '', formsLink: '', pinterestLink: '', notas: ''
  });
  const toggleServicio = (s) => {
    setForm(f => ({
      ...f,
      servicios: f.servicios.includes(s) ? f.servicios.filter(x => x !== s) : [...f.servicios, s]
    }));
  };
  const selectPack = (packId) => {
    const pack = PACKS.find(p => p.id === packId);
    setForm(f => ({ ...f, pack: packId, fee: pack && pack.id !== 'personalizado' ? pack.fee : f.fee }));
  };
  return (
    <Modal title={initial ? 'Editar cliente' : 'Nuevo cliente'} onClose={onClose}>
      <Field label="Nombre de la marca">
        <input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej. Dental Pro" />
      </Field>
      <Field label="Estado">
        <select style={inputStyle} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
          {CLIENT_STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="Líder de cuenta">
        <select style={inputStyle} value={form.account_lead_id || ''} onChange={e => setForm({ ...form, account_lead_id: e.target.value })}>
          <option value="">Sin líder asignado</option>
          {team.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </Field>
      <Field label="Pack contratado">
        <select style={inputStyle} value={form.pack} onChange={e => selectPack(e.target.value)}>
          <option value="">Elegir pack...</option>
          {PACKS.map(p => <option key={p.id} value={p.id}>{p.nombre}{p.fee ? ` — $${p.fee.toLocaleString('es-AR')}` : ''}</option>)}
        </select>
        {form.pack && PACKS.find(p => p.id === form.pack) && (
          <div style={{ fontSize: 11, color: '#5C6785', marginTop: 6 }}>{PACKS.find(p => p.id === form.pack).resumen}</div>
        )}
      </Field>
      <Field label="Servicios contratados">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {SERVICE_OPTIONS.map(s => (
            <button key={s} type="button" onClick={() => toggleServicio(s)} style={{
              fontSize: 11, padding: '5px 9px', borderRadius: 20, cursor: 'pointer',
              border: '1px solid #2A3450',
              background: form.servicios.includes(s) ? '#D4FF3D' : 'transparent',
              color: form.servicios.includes(s) ? '#0B1220' : '#8891A8',
              fontWeight: 600
            }}>{s}</button>
          ))}
        </div>
      </Field>
      <Field label="Fee mensual (ARS)">
        <input style={inputStyle} type="number" value={form.fee} onChange={e => setForm({ ...form, fee: e.target.value })} placeholder="Ej. 220000" />
      </Field>
      <Field label="Fecha de inicio">
        <input style={inputStyle} type="date" value={form.fechaInicio} onChange={e => setForm({ ...form, fechaInicio: e.target.value })} />
      </Field>
      <Field label="Contacto / Instagram">
        <input style={inputStyle} value={form.contacto} onChange={e => setForm({ ...form, contacto: e.target.value })} placeholder="@marca" />
      </Field>
      <Field label="Tablero de Trello">
        <input style={inputStyle} value={form.trelloBoardLink} onChange={e => setForm({ ...form, trelloBoardLink: e.target.value })} placeholder="https://trello.com/b/..." />
      </Field>
      <Field label="Carpeta de Drive">
        <input style={inputStyle} value={form.driveFolderLink} onChange={e => setForm({ ...form, driveFolderLink: e.target.value })} placeholder="https://drive.google.com/drive/folders/..." />
      </Field>
      <Field label="Formulario (Forms)">
        <input style={inputStyle} value={form.formsLink} onChange={e => setForm({ ...form, formsLink: e.target.value })} placeholder="https://forms.gle/..." />
      </Field>
      <Field label="Pinterest">
        <input style={inputStyle} value={form.pinterestLink} onChange={e => setForm({ ...form, pinterestLink: e.target.value })} placeholder="https://pinterest.com/..." />
      </Field>
      <Field label="Notas">
        <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} />
      </Field>
      <Button onClick={() => onSave({ ...form, account_lead_id: form.account_lead_id || null })} style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>Guardar</Button>
    </Modal>
  );
}

// ---------- Equipo ----------
function EquipoView({ team, setTeam, clients, procesos, currentUser, actividad, setActividad }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showCallModal, setShowCallModal] = useState(false);

  const save = (data) => {
    if (data.id) setTeam(team.map(t => t.id === data.id ? data : t));
    else setTeam([...team, { ...data, id: uid() }]);
    setShowForm(false); setEditing(null);
  };
  const remove = (id) => setTeam(team.filter(t => t.id !== id));

  const guardarReunion = (r) => {
    const invitadosTexto = r.asistentes.length === team.length
      ? 'equipo completo'
      : r.asistentes.map(id => team.find(t => t.id === id)?.name).filter(Boolean).join(', ');
    setActividad([{
      id: uid(), autor: currentUser?.name || 'Equipo directivo', tipo: 'Agendó una reunión', clientId: r.clientId,
      texto: `${r.titulo}${r.fecha ? ` · ${r.fecha}` : ''}${r.hora ? ` ${r.hora}hs` : ''} · ${invitadosTexto}`,
      meetLink: r.meetLink || null, visibilidad: 'equipo', fecha: new Date().toISOString()
    }, ...actividad]);
    setShowCallModal(false);
  };

  return (
    <div>
      <SectionHeader
        eyebrow="Freelancers & Equipo directivo"
        title="Equipo"
        action={
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button variant="ghost" onClick={() => setShowCallModal(true)}><Video size={15} /> Videollamada de equipo</Button>
            <Button onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={15} /> Agregar integrante</Button>
          </div>
        }
      />
      <div style={{ fontSize: 12, color: '#5C6785', marginBottom: 20, maxWidth: 560 }}>
        Para dar acceso a alguien nuevo, agregalo/a acá con su email. La primera vez que
        esa persona entre al sitio y ponga ese mismo mail, el sistema la va a reconocer
        automáticamente con el rol que le asignes.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        {team.length === 0 && <EmptyState text="Todavía no cargaste integrantes del equipo." />}
        {team.map(t => {
          const tareas = procesos.filter(p => p.executor_id === t.id && estaAbierto(p));
          const esDirectiva = t.tipo === 'Socia';
          return (
            <div key={t.id} style={{
              background: esDirectiva ? 'rgba(212,255,61,0.05)' : '#131B2E',
              border: esDirectiva ? '1px solid rgba(212,255,61,0.35)' : '1px solid #2A3450',
              borderLeft: esDirectiva ? '3px solid #D4FF3D' : '1px solid #2A3450',
              borderRadius: 14, padding: 20
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: "'Fraunces', serif", fontSize: 18, color: '#E8E6F0', fontStyle: 'italic' }}>{t.name}</span>
                    <Pill tone={esDirectiva ? 'active' : 'default'}>{esDirectiva ? 'Directora' : 'Freelance'}</Pill>
                  </div>
                  <div style={{ fontSize: 12, color: '#8891A8', marginTop: 2 }}>{t.rol}{t.ciudad ? ` · ${t.ciudad}` : ''}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Button variant="ghost" onClick={() => { setEditing(t); setShowForm(true); }}><Pencil size={12} /></Button>
                  <Button variant="danger" onClick={() => remove(t.id)}><Trash2 size={12} /></Button>
                </div>
              </div>

              {(t.email || t.telefono) && (
                <div style={{ fontSize: 12, color: '#5C6785', marginTop: 8 }}>
                  {t.email && <div>{t.email}</div>}
                  {t.telefono && <div>{t.telefono}</div>}
                </div>
              )}
              {t.pack && (
                <div style={{ fontSize: 12, color: '#B8ACEB', marginTop: 8, background: 'rgba(184,172,235,0.08)', borderRadius: 8, padding: '8px 10px' }}>
                  {t.pack}
                </div>
              )}

              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #1C2740' }}>
                <div style={{ fontSize: 12, color: '#5C6785', marginBottom: 6 }}>Tareas pendientes: {tareas.length}</div>
                {tareas.slice(0, 3).map(task => (
                  <div key={task.id} style={{ fontSize: 12, color: '#8891A8', display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' }}>
                    <CircleDot size={10} color="#D4FF3D" /> {task.texto}
                  </div>
                ))}
              </div>
              {(t.clientesAsignados || []).length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, color: '#5C6785', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Marcas asignadas</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(t.clientesAsignados || []).map(id => {
                      const c = clients.find(cl => cl.id === id);
                      return c ? <Pill key={id} tone="paused">{c.name}</Pill> : null;
                    })}
                  </div>
                </div>
              )}
              {t.notas && <div style={{ fontSize: 12, color: '#8891A8', marginTop: 10, fontStyle: 'italic' }}>{t.notas}</div>}
            </div>
          );
        })}
      </div>

      {showForm && (
        <Modal title={editing ? 'Editar integrante' : 'Nuevo integrante'} onClose={() => { setShowForm(false); setEditing(null); }}>
          <TeamForm initial={editing} onSave={save} clients={clients} />
        </Modal>
      )}

      {showCallModal && (
        <Modal title="Nueva videollamada de equipo" onClose={() => setShowCallModal(false)}>
          <VideollamadaForm team={team} clients={clients} onSave={guardarReunion} />
        </Modal>
      )}
    </div>
  );
}

function TeamForm({ initial, onSave, clients }) {
  const [form, setForm] = useState(initial || {
    name: '', rol: '', tipo: 'Freelance', perfil: '', email: '', telefono: '', ciudad: '', pack: '',
    clientesAsignados: [], notas: ''
  });

  const toggleCliente = (id) => {
    setForm(f => ({
      ...f,
      clientesAsignados: (f.clientesAsignados || []).includes(id)
        ? f.clientesAsignados.filter(x => x !== id)
        : [...(f.clientesAsignados || []), id]
    }));
  };

  return (
    <div>
      <Field label="Nombre"><input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
      <Field label="Rol"><input style={inputStyle} value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })} placeholder="Ej. Editor de video" /></Field>
      <Field label="Tipo de acceso">
        <select style={inputStyle} value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
          <option value="Freelance">Freelance (solo ve sus tareas)</option>
          <option value="Socia">Directora / Equipo directivo (acceso total)</option>
        </select>
      </Field>
      {form.tipo === 'Freelance' && (
        <Field label="Perfil (define qué manual de pasos ve en Mis tareas)">
          <select style={inputStyle} value={form.perfil || ''} onChange={e => setForm({ ...form, perfil: e.target.value })}>
            <option value="">Sin definir</option>
            <option value="CM">Community Manager</option>
            <option value="Diseñador/Editor">Diseñador / Editor</option>
          </select>
        </Field>
      )}
      <Field label="Email (para invitar a videollamadas)">
        <input style={inputStyle} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="nombre@gmail.com" />
      </Field>
      <Field label="Teléfono de contacto">
        <input style={inputStyle} value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="+54 9 11 ..." />
      </Field>
      <Field label="Ciudad / País">
        <input style={inputStyle} value={form.ciudad} onChange={e => setForm({ ...form, ciudad: e.target.value })} placeholder="Ej. Buenos Aires, Argentina" />
      </Field>
      <Field label="Acuerdo / pack de trabajo">
        <textarea
          style={{ ...inputStyle, minHeight: 60 }} value={form.pack} onChange={e => setForm({ ...form, pack: e.target.value })}
          placeholder="Ej. 9 videos por $160.000 ARS"
        />
      </Field>
      <Field label="Marcas asignadas">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {clients.length === 0 && <span style={{ fontSize: 12, color: '#5C6785' }}>Cargá clientes primero.</span>}
          {clients.map(c => (
            <button key={c.id} type="button" onClick={() => toggleCliente(c.id)} style={{
              fontSize: 11, padding: '5px 9px', borderRadius: 20, cursor: 'pointer',
              border: '1px solid #2A3450',
              background: (form.clientesAsignados || []).includes(c.id) ? '#D4FF3D' : 'transparent',
              color: (form.clientesAsignados || []).includes(c.id) ? '#0B1220' : '#8891A8',
              fontWeight: 600
            }}>{c.name}</button>
          ))}
        </div>
      </Field>
      <Field label="Notas (acuerdos, tarifas, etc.)"><textarea style={{ ...inputStyle, minHeight: 70 }} value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} /></Field>
      <Button onClick={() => onSave(form)} style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>Guardar</Button>
    </div>
  );
}

// ---------- Métricas ----------
function MetricasView({ metrics, setMetrics, clients }) {
  const [showForm, setShowForm] = useState(false);
  const [filterClient, setFilterClient] = useState('');

  const save = (data) => { setMetrics([...metrics, { ...data, id: uid() }]); setShowForm(false); };
  const remove = (id) => setMetrics(metrics.filter(m => m.id !== id));
  const clientName = (id) => clients.find(c => c.id === id)?.name || '—';
  const filtered = filterClient ? metrics.filter(m => m.clientId === filterClient) : metrics;

  return (
    <div>
      <SectionHeader
        eyebrow="Cargado por la CM"
        title="Métricas"
        action={<Button onClick={() => setShowForm(true)}><Plus size={15} /> Cargar métrica</Button>}
      />
      <div style={{ marginBottom: 20 }}>
        <select style={{ ...inputStyle, width: '100%', maxWidth: 260 }} value={filterClient} onChange={e => setFilterClient(e.target.value)}>
          <option value="">Todos los clientes</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {filtered.length === 0 && <EmptyState text="Todavía no se cargaron métricas." />}
        {filtered.map(m => (
          <div key={m.id} style={{ background: '#131B2E', border: '1px solid #2A3450', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
              <div>
                <div style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', fontSize: 16, color: '#E8E6F0' }}>{clientName(m.clientId)}</div>
                <div style={{ fontSize: 12, color: '#8891A8' }}>{m.periodo}</div>
              </div>
              <button onClick={() => remove(m.id)} style={{ background: 'none', border: 'none', color: '#E68C8C', cursor: 'pointer', flexShrink: 0 }}><Trash2 size={14} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, marginBottom: m.notas ? 10 : 0 }}>
              {[
                ['Alcance', m.alcance], ['Visualizaciones', m.visualizaciones],
                ['Interacciones', m.interacciones], ['Crecimiento', m.crecimiento],
              ].map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontSize: 10, color: '#5C6785', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 14, color: '#E8E6F0' }}>{val || '—'}</div>
                </div>
              ))}
            </div>
            {m.notas && <div style={{ fontSize: 12, color: '#8891A8', paddingTop: 10, borderTop: '1px solid #1C2740' }}>{m.notas}</div>}
            {m.transcripcionPdf && <TranscripcionPdfBox texto={m.transcripcionPdf} nombreArchivo={m.pdfNombre} />}
          </div>
        ))}
      </div>

      {showForm && (
        <Modal title="Cargar métrica" onClose={() => setShowForm(false)}>
          <MetricForm clients={clients} onSave={save} />
        </Modal>
      )}
    </div>
  );
}

function TranscripcionPdfBox({ texto, nombreArchivo }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #1C2740' }}>
      <button onClick={() => setAbierto(a => !a)} style={{
        background: 'none', border: 'none', color: '#B8ACEB', fontSize: 12, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 6, padding: 0
      }}>
        <FileText size={13} /> Transcripción del PDF{nombreArchivo ? ` (${nombreArchivo})` : ''}
        <ChevronRight size={13} style={{ transform: abierto ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>
      {abierto && (
        <div style={{
          marginTop: 10, fontSize: 12, color: '#8891A8', whiteSpace: 'pre-wrap',
          maxHeight: 240, overflowY: 'auto', background: '#0B1220', border: '1px solid #1C2740', borderRadius: 8, padding: 10
        }}>{texto}</div>
      )}
    </div>
  );
}

function MetricForm({ clients, onSave }) {
  const [form, setForm] = useState({
    clientId: clients[0]?.id || '', periodo: '', alcance: '', visualizaciones: '', interacciones: '', crecimiento: '', notas: '',
    transcripcionPdf: '', pdfNombre: ''
  });
  const [procesando, setProcesando] = useState(false);
  const [errorPdf, setErrorPdf] = useState('');

  const handlePdf = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProcesando(true);
    setErrorPdf('');
    pdfToText(file)
      .then(texto => {
        setForm(f => ({ ...f, transcripcionPdf: texto, pdfNombre: file.name }));
        setProcesando(false);
      })
      .catch(() => {
        setErrorPdf('No se pudo leer el PDF (¿es un escaneo/imagen? Esta lectura solo funciona con PDFs de texto).');
        setProcesando(false);
      });
  };

  return (
    <div>
      <Field label="Cliente">
        <select style={inputStyle} value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Período"><input style={inputStyle} value={form.periodo} onChange={e => setForm({ ...form, periodo: e.target.value })} placeholder="Ej. Julio 2026" /></Field>
      <Field label="Alcance"><input style={inputStyle} value={form.alcance} onChange={e => setForm({ ...form, alcance: e.target.value })} /></Field>
      <Field label="Visualizaciones"><input style={inputStyle} value={form.visualizaciones} onChange={e => setForm({ ...form, visualizaciones: e.target.value })} /></Field>
      <Field label="Interacciones"><input style={inputStyle} value={form.interacciones} onChange={e => setForm({ ...form, interacciones: e.target.value })} /></Field>
      <Field label="Crecimiento"><input style={inputStyle} value={form.crecimiento} onChange={e => setForm({ ...form, crecimiento: e.target.value })} placeholder="Ej. +12%" /></Field>
      <Field label="Conclusiones / recomendaciones"><textarea style={{ ...inputStyle, minHeight: 70 }} value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} /></Field>
      <Field label="Informe en PDF (opcional — se transcribe el texto, no lo interpreta)">
        <input type="file" accept="application/pdf" onChange={handlePdf} style={{ ...inputStyle, padding: 8 }} />
        {procesando && <div style={{ fontSize: 11, color: '#8891A8', marginTop: 6 }}>Leyendo el PDF...</div>}
        {errorPdf && <div style={{ fontSize: 11, color: '#E68C8C', marginTop: 6 }}>{errorPdf}</div>}
        {form.transcripcionPdf && !procesando && (
          <div style={{ fontSize: 11, color: '#D4FF3D', marginTop: 6 }}>✓ Texto extraído de {form.pdfNombre}</div>
        )}
      </Field>
      <Button onClick={() => onSave(form)} style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>Guardar</Button>
    </div>
  );
}

// ---------- Mis tareas (vista freelancer, basada en procesos que le fueron asignados) ----------
// ---------- Manual de pasos según perfil (CM / Diseñador-Editor) ----------
function ManualRol({ perfil }) {
  const [abierto, setAbierto] = useState(true);
  const manual = MANUALES[perfil];
  if (!manual) return null;

  return (
    <div style={{ background: '#131B2E', border: '1px solid #2A3450', borderRadius: 12, padding: 16, marginBottom: 24 }}>
      <button onClick={() => setAbierto(a => !a)} style={{
        background: 'none', border: 'none', cursor: 'pointer', width: '100%',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 0
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#B8ACEB', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Manual de pasos — {perfil}
        </span>
        <ChevronRight size={15} color="#B8ACEB" style={{ transform: abierto ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>
      {abierto && (
        <div style={{ marginTop: 16 }}>
          <a href={TRELLO_TUTORIAL_LINK} target="_blank" rel="noreferrer" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#0B1220',
            background: '#D4FF3D', fontWeight: 700, borderRadius: 8, padding: '8px 12px', marginBottom: 18
          }}><Video size={14} /> Ver video tutorial: cómo usar Trello ↗</a>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#8891A8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
              {MANUAL_GENERAL.titulo}
            </div>
            {MANUAL_GENERAL.bloques.map((b, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: '#B8ACEB', fontWeight: 700, marginBottom: 6 }}>{b.subtitulo}</div>
                {b.texto && <div style={{ fontSize: 13, color: '#E8E6F0', lineHeight: 1.5 }}>{b.texto}</div>}
                {b.pasos && (
                  <ol style={{ margin: '6px 0 0', paddingLeft: 20, display: 'grid', gap: 6 }}>
                    {b.pasos.map((p, j) => (
                      <li key={j} style={{ fontSize: 13, color: '#E8E6F0', lineHeight: 1.5 }}>{p}</li>
                    ))}
                  </ol>
                )}
              </div>
            ))}
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#8891A8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
              {manual.titulo}
            </div>
            <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 10 }}>
              {manual.pasos.map((paso, i) => (
                <li key={i} style={{ fontSize: 13, color: '#E8E6F0', lineHeight: 1.5 }}>
                  <strong style={{ color: '#B8ACEB' }}>Paso {i + 1}: </strong>{paso}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

// Agrupa una fecha límite (YYYY-MM-DD) en uno de 4 baldes de timeboxing.
// Los vencidos caen en "Hoy" (necesitan atención ya) — el Pill de procesoEstado
// ya los marca como "Atrasado" aparte.
function balderFecha(fechaLimite) {
  if (!fechaLimite) return 'sinFecha';
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const manana = new Date(hoy); manana.setDate(hoy.getDate() + 1);
  const finSemana = new Date(hoy); finSemana.setDate(hoy.getDate() + 7);
  const f = new Date(fechaLimite + 'T00:00:00');
  if (f <= hoy) return 'hoy';
  if (f.getTime() === manana.getTime()) return 'manana';
  if (f <= finSemana) return 'semana';
  return 'semana'; // cualquier cosa más lejos también entra en "Esta semana" (solo hay 4 columnas)
}

const COLUMNAS_TIMEBOXING = [
  { id: 'hoy', titulo: 'Hoy' },
  { id: 'manana', titulo: 'Mañana' },
  { id: 'semana', titulo: 'Esta semana' },
  { id: 'sinFecha', titulo: 'Sin fecha' },
];

// Sección desplegable con las 3 validaciones obligatorias del "espíritu de Bielecka"
function QualityChecklist({ checks, editable, onToggle }) {
  const [abierto, setAbierto] = useState(false);
  const hechos = CHECKLIST_BIELECKA.filter(c => checks[c.id] === true).length;
  return (
    <div style={{ marginBottom: 8 }}>
      <button onClick={() => setAbierto(x => !x)} style={{
        background: 'none', border: 'none', color: '#B8ACEB', fontSize: 12, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 6, padding: 0
      }}>
        <ClipboardCheck size={13} />
        Checklist de calidad ({hechos}/{CHECKLIST_BIELECKA.length})
        <ChevronRight size={13} style={{ transform: abierto ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>
      {abierto && (
        <div style={{ marginTop: 8, display: 'grid', gap: 8, background: '#0B1220', border: '1px solid #2A3450', borderRadius: 10, padding: 12 }}>
          {CHECKLIST_BIELECKA.map(c => (
            <label key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: editable ? 'pointer' : 'default' }}>
              <input
                type="checkbox" checked={checks[c.id] === true} disabled={!editable} onChange={() => onToggle(c.id)}
                style={{ width: 15, height: 15, marginTop: 2, flexShrink: 0, accentColor: '#D4FF3D' }}
              />
              <span style={{ fontSize: 12, color: '#E8E6F0', lineHeight: 1.4 }}>{c.texto}</span>
            </label>
          ))}
          {editable && <div style={{ fontSize: 11, color: '#5C6785' }}>Los 3 puntos son obligatorios para enviar a revisión.</div>}
        </div>
      )}
    </div>
  );
}

// Flujo: Enviar a revisión → (Directora) Aprobar / Pedir ajustes → Marcar como Enviado
function EntregaAcciones({ item, currentUser, update, compact = false }) {
  const esSocia = currentUser.tipo === 'Socia';
  const estado = item.estado || 'Pendiente';
  const puedeEditarChecklist = estado === 'Pendiente' || estado === 'adjusted';

  // Estado local de los checkboxes; se persiste en quality_checklist al tildar
  const [checks, setChecks] = useState(item.quality_checklist || {});
  useEffect(() => { setChecks(item.quality_checklist || {}); }, [item.quality_checklist]);
  const todosMarcados = CHECKLIST_BIELECKA.every(c => checks[c.id] === true);

  const toggle = (id) => {
    const next = { ...checks, [id]: !checks[id] };
    setChecks(next);
    update(item.id, { quality_checklist: next });
  };

  let botones = null;
  if (puedeEditarChecklist) {
    botones = compact ? null : (
      <Button disabled={!todosMarcados} onClick={() => todosMarcados && update(item.id, { estado: 'pending_review', quality_checklist: checks })}>
        Enviar a revisión
      </Button>
    );
  } else if (estado === 'pending_review') {
    botones = esSocia ? (
      <>
        <Button disabled={!todosMarcados} onClick={() => todosMarcados && update(item.id, { estado: 'approved' })}>Aprobar</Button>
        <Button variant="ghost" onClick={() => update(item.id, { estado: 'adjusted' })}>Pedir ajustes</Button>
      </>
    ) : <span style={{ fontSize: 11, color: '#8891A8' }}>Esperando aprobación de la Directora</span>;
  } else if (estado === 'approved') {
    botones = <Button onClick={() => update(item.id, { estado: 'Resuelto' })}>Marcar como Enviado</Button>;
  } else if (estado === 'Resuelto' && esSocia) {
    botones = <Button variant="ghost" onClick={() => update(item.id, { estado: 'Pendiente' })}>Reabrir</Button>;
  }

  return (
    <div>
      {!compact && (
        <>
          <QualityChecklist checks={checks} editable={puedeEditarChecklist} onToggle={toggle} />
          {puedeEditarChecklist && !todosMarcados && (
            <div style={{ fontSize: 11, color: '#8891A8', marginBottom: 8 }}>Marcá las 3 validaciones para habilitar el envío a revisión.</div>
          )}
        </>
      )}
      {botones && <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>{botones}</div>}
    </div>
  );
}

// Hilo de comentarios por tarea (tabla task_comments)
function ComentariosTarea({ item, comentarios, setComentarios, currentUser }) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const hilo = comentarios
    .filter(c => c.task_id === item.id)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const esSocia = currentUser.tipo === 'Socia';

  const enviar = () => {
    if (!texto.trim()) return;
    setComentarios([...comentarios, {
      id: uid(), task_id: item.id, author_id: currentUser.id, author_name: currentUser.name,
      body: texto.trim(), created_at: new Date().toISOString()
    }]);
    setTexto('');
  };
  const borrar = (id) => setComentarios(comentarios.filter(c => c.id !== id));

  return (
    <div style={{ marginTop: 8 }}>
      <button onClick={() => setAbierto(x => !x)} style={{
        background: 'none', border: 'none', color: '#B8ACEB', fontSize: 12, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 6, padding: 0
      }}>
        <MessageSquare size={13} />
        Comentarios ({hilo.length})
        <ChevronRight size={13} style={{ transform: abierto ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>
      {abierto && (
        <div style={{ marginTop: 8, background: '#0B1220', border: '1px solid #2A3450', borderRadius: 10, padding: 12 }}>
          <div style={{ display: 'grid', gap: 8, marginBottom: 10 }}>
            {hilo.length === 0 && <div style={{ fontSize: 12, color: '#3E4867', fontStyle: 'italic' }}>Todavía no hay comentarios.</div>}
            {hilo.map(c => (
              <div key={c.id} style={{ borderLeft: '2px solid #2A3450', paddingLeft: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11, color: '#5C6785' }}>
                  <span><strong style={{ color: '#B8ACEB' }}>{c.author_name || '—'}</strong> · {new Date(c.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  {(esSocia || c.author_id === currentUser.id) && (
                    <button onClick={() => borrar(c.id)} style={{ background: 'none', border: 'none', color: '#E68C8C', cursor: 'pointer', padding: 0 }}><Trash2 size={11} /></button>
                  )}
                </div>
                <div style={{ fontSize: 13, color: '#E8E6F0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c.body}</div>
              </div>
            ))}
          </div>
          <textarea
            style={{ ...inputStyle, minHeight: 44, marginBottom: 8 }} value={texto} onChange={e => setTexto(e.target.value)}
            placeholder="Escribí un comentario sobre esta tarea…"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button disabled={!texto.trim()} onClick={enviar}>Comentar</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function TareaCard({ item, clientName, update, currentUser, comentarios, setComentarios }) {
  const [editandoLink, setEditandoLink] = useState(false);
  return (
    <div style={{ background: '#131B2E', border: '1px solid #2A3450', borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 11, color: '#8891A8', marginBottom: 4 }}>{clientName(item.clientId)}</div>
      <div style={{ fontSize: 14, color: '#E8E6F0', marginBottom: 8, textDecoration: item.estado === 'Resuelto' ? 'line-through' : 'none' }}>{item.texto}</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Pill tone={procesoEstado(item).tone}>{procesoEstado(item).label}</Pill>
        <input
          type="date" value={item.fechaLimite || ''} onChange={e => update(item.id, { fechaLimite: e.target.value || null })}
          style={{ ...inputStyle, padding: '4px 6px', fontSize: 11, width: 130 }}
        />
      </div>

      {editandoLink ? (
        <div style={{ marginBottom: 8 }}>
          <input
            style={{ ...inputStyle, fontSize: 12, padding: '6px 8px' }} value={item.link || ''}
            onChange={e => update(item.id, { link: e.target.value })} placeholder="https://..."
            onBlur={() => setEditandoLink(false)}
          />
        </div>
      ) : item.link ? (
        <a href={item.link} target="_blank" rel="noreferrer" style={{ color: '#B8ACEB', fontSize: 12, display: 'block', marginBottom: 8 }}>Link ↗</a>
      ) : (
        <button onClick={() => setEditandoLink(true)} style={{ background: 'none', border: 'none', color: '#5C6785', fontSize: 11, cursor: 'pointer', padding: 0, marginBottom: 8 }}>+ agregar link</button>
      )}

      <div style={{ marginBottom: 8 }}>
        <AgregarCalendarBoton titulo={`${clientName(item.clientId)} — ${item.texto}`} fechaLimite={item.fechaLimite} notas={item.texto} />
      </div>
      <EntregaAcciones item={item} currentUser={currentUser} update={update} />
      <ComentariosTarea item={item} comentarios={comentarios} setComentarios={setComentarios} currentUser={currentUser} />
    </div>
  );
}

function MisTareasView({ currentUser, procesos, setProcesos, clients, onAbrirTutorial, comentarios, setComentarios }) {
  const mias = procesos.filter(p => p.executor_id === currentUser.id);
  const clientName = (id) => clients.find(c => c.id === id)?.name || '—';

  const update = (id, patch) => setProcesos(procesos.map(p => p.id === id ? { ...p, ...patch } : p));

  const pendientes = mias.filter(m => estaAbierto(m)).length;
  const resueltas = mias.filter(m => m.estado === 'Resuelto').length;
  const atrasadas = mias.filter(m => procesoEstado(m).label === 'Atrasado').length;

  const activas = mias.filter(estaAbierto);
  const porColumna = COLUMNAS_TIMEBOXING.map(col => ({
    ...col,
    items: activas.filter(m => balderFecha(m.fechaLimite) === col.id),
  }));

  return (
    <div>
      <SectionHeader
        eyebrow={`Hola, ${currentUser.name.split(' ')[0]}`}
        title="Mis tareas"
        action={<Button variant="ghost" onClick={onAbrirTutorial}>Repetir tutorial</Button>}
      />

      <ManualRol perfil={currentUser.perfil} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 32 }}>
        <div style={{ background: '#131B2E', border: '1px solid #2A3450', borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: 12, color: '#8891A8', marginBottom: 6 }}>Pendientes</div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 26, color: '#B8ACEB' }}>{pendientes}</div>
        </div>
        <div style={{ background: '#131B2E', border: '1px solid #2A3450', borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: 12, color: '#8891A8', marginBottom: 6 }}>Atrasadas</div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 26, color: '#E68C8C' }}>{atrasadas}</div>
        </div>
        <div style={{ background: '#131B2E', border: '1px solid #2A3450', borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: 12, color: '#8891A8', marginBottom: 6 }}>Enviadas</div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 26, color: '#D4FF3D' }}>{resueltas}</div>
        </div>
      </div>

      {mias.length === 0 ? (
        <EmptyState text="Todavía no tenés tareas asignadas." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16 }}>
          {porColumna.map(col => (
            <div key={col.id}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#B8ACEB', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                {col.titulo} <span style={{ color: '#5C6785' }}>({col.items.length})</span>
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {col.items.length === 0 && <div style={{ fontSize: 12, color: '#3E4867', fontStyle: 'italic' }}>Sin tareas</div>}
                {col.items.map(item => (
                  <TareaCard key={item.id} item={item} clientName={clientName} update={update} currentUser={currentUser} comentarios={comentarios} setComentarios={setComentarios} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Equipo y marcas (vista freelancer) ----------
function EquipoMarcasView({ team, clients }) {
  return (
    <div>
      <SectionHeader eyebrow="Vista general" title="Equipo y marcas" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        {team.map(t => {
          const esDirectiva = t.tipo === 'Socia';
          return (
            <div key={t.id} style={{
              background: esDirectiva ? 'rgba(212,255,61,0.05)' : '#131B2E',
              border: esDirectiva ? '1px solid rgba(212,255,61,0.35)' : '1px solid #2A3450',
              borderLeft: esDirectiva ? '3px solid #D4FF3D' : '1px solid #2A3450',
              borderRadius: 12, padding: 18
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: "'Fraunces', serif", fontSize: 17, color: '#E8E6F0', fontStyle: 'italic' }}>{t.name}</span>
                {esDirectiva && <Pill tone="active">Directiva</Pill>}
              </div>
              <div style={{ fontSize: 12, color: '#8891A8', marginTop: 2, marginBottom: 10 }}>{t.rol}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(t.clientesAsignados || []).length === 0 && <span style={{ fontSize: 12, color: '#5C6785', fontStyle: 'italic' }}>Sin marca asignada</span>}
                {(t.clientesAsignados || []).map(id => {
                  const c = clients.find(cl => cl.id === id);
                  return c ? <Pill key={id} tone="paused">{c.name}</Pill> : null;
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Agenda personal (bloques de tiempo privados por Directora) ----------
function AgendaDirectivaView({ currentUser, team }) {
  const [bloques, setBloques] = useSyncedTable('agenda_bloques', { enabled: true });
  const [ocupados, setOcupados] = useState([]);
  const [texto, setTexto] = useState('');
  const [fecha, setFecha] = useState('');

  useEffect(() => {
    fetchAgendaOcupados().then(({ data, error }) => {
      if (!error && data) setOcupados(data);
    });
  }, [bloques]);

  const propios = bloques.filter(b => b.directoraId === currentUser.id).sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
  const deOtras = ocupados
    .filter(o => o.directoraId !== currentUser.id)
    .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
  const nombreDe = (id) => team.find(t => t.id === id)?.name?.split(' ')[0] || 'Alguien';

  const agregar = () => {
    if (!texto.trim()) return;
    setBloques([...bloques, { id: uid(), directoraId: currentUser.id, texto, fecha: fecha || null }]);
    setTexto(''); setFecha('');
  };
  const remove = (id) => setBloques(bloques.filter(b => b.id !== id));

  return (
    <div>
      <SectionHeader eyebrow="Tu agenda es privada" title="Agenda personal" />
      <div style={{ fontSize: 12, color: '#5C6785', marginBottom: 20, maxWidth: 560 }}>
        Bloques de tiempo propios (terapia, radio, gimnasio, lo que sea) — el detalle nadie más lo ve.
        El resto del equipo directivo solo puede ver que estás ocupada ese día, no en qué.
      </div>

      <div style={{ background: '#131B2E', border: '1px solid #2A3450', borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 8, marginBottom: 10 }}>
          <input style={inputStyle} value={texto} onChange={e => setTexto(e.target.value)} placeholder="Ej. Terapia, Radio, Gimnasio" />
          <input style={inputStyle} type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={agregar}><Plus size={13} /> Guardar bloque</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 8, marginBottom: 32 }}>
        {propios.length === 0 && <EmptyState text="Todavía no cargaste bloques de agenda." />}
        {propios.map(b => (
          <div key={b.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
            background: '#131B2E', border: '1px solid #2A3450', borderRadius: 10, padding: '12px 16px'
          }}>
            <div>
              <span style={{ fontSize: 13, color: '#E8E6F0' }}>{b.texto}</span>
              {b.fecha && <span style={{ fontSize: 11, color: '#5C6785', marginLeft: 8 }}>{b.fecha}</span>}
            </div>
            <button onClick={() => remove(b.id)} style={{ background: 'none', border: 'none', color: '#E68C8C', cursor: 'pointer' }}><Trash2 size={13} /></button>
          </div>
        ))}
      </div>

      <div>
        <h4 style={{ color: '#B8ACEB', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
          Disponibilidad del equipo directivo
        </h4>
        <div style={{ fontSize: 11, color: '#5C6785', marginBottom: 14 }}>Solo se ve que están ocupadas, no el motivo.</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {deOtras.length === 0 && <EmptyState text="Nadie más tiene bloques cargados." />}
          {deOtras.map(o => (
            <div key={o.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
              background: '#131B2E', border: '1px solid #2A3450', borderRadius: 10, padding: '10px 16px'
            }}>
              <span style={{ fontSize: 13, color: '#E8E6F0' }}>{nombreDe(o.directoraId)} no está disponible</span>
              {o.fecha && <span style={{ fontSize: 11, color: '#5C6785' }}>{o.fecha}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Reservas entrantes (turnos pedidos desde la vista pública) ----------
function ReservasView({ reservas, setReservas }) {
  const [copiado, setCopiado] = useState(false);
  const cambiarEstado = (id, estado) => setReservas(reservas.map(r => r.id === id ? { ...r, estado } : r));
  const remove = (id) => setReservas(reservas.filter(r => r.id !== id));
  const ordenadas = [...reservas].sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));

  const linkPublico = `${window.location.origin}${window.location.pathname}?reservar=1`;
  const copiarLink = () => {
    navigator.clipboard?.writeText(linkPublico);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };

  return (
    <div>
      <SectionHeader eyebrow="Desde la página pública" title="Reservas" />

      <div style={{ background: '#131B2E', border: '1px solid #2A3450', borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: '#8891A8', marginBottom: 8 }}>
          Link de reserva para mandarle a una marca — no necesita login, solo lo ven ustedes acá.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input readOnly value={linkPublico} style={{ ...inputStyle, flex: 1, minWidth: 200, fontSize: 12 }} onFocus={e => e.target.select()} />
          <Button onClick={copiarLink}>{copiado ? 'Copiado ✓' : 'Copiar link'}</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {ordenadas.length === 0 && <EmptyState text="Todavía no hay turnos solicitados." />}
        {ordenadas.map(r => (
          <div key={r.id} style={{ background: '#131B2E', border: '1px solid #2A3450', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 15, color: '#E8E6F0', fontWeight: 700 }}>{r.nombre} — {r.marca}</div>
                <div style={{ fontSize: 12, color: '#8891A8', marginTop: 2 }}>{r.email}</div>
                <div style={{ fontSize: 13, color: '#B8ACEB', marginTop: 6 }}>{r.fecha} · {r.hora} hs</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Pill tone={r.estado === 'Confirmada' ? 'active' : r.estado === 'Cancelada' ? 'lost' : 'default'}>{r.estado}</Pill>
                <select value={r.estado} onChange={e => cambiarEstado(r.id, e.target.value)} style={{ ...inputStyle, padding: '4px 8px', fontSize: 11, width: 120 }}>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Confirmada">Confirmada</option>
                  <option value="Cancelada">Cancelada</option>
                </select>
                <AgregarCalendarBoton titulo={`Reunión con ${r.marca}`} fechaLimite={r.fecha} hora={r.hora} notas={`Contacto: ${r.nombre} (${r.email})`} email={r.email} />
                <button onClick={() => remove(r.id)} style={{ background: 'none', border: 'none', color: '#E68C8C', cursor: 'pointer' }}><Trash2 size={13} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


function VistaReservarTurnoCliente() {
  const [paso, setPaso] = useState(1);
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [nombre, setNombre] = useState('');
  const [marca, setMarca] = useState('');
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState('');

  const horariosDisponibles = ['10:00', '11:00', '15:00', '16:30', '17:00'];

  const confirmar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setErrorEnvio('');
    const { error } = await crearReserva({
      id: uid(), nombre, marca, email, fecha, hora, estado: 'Pendiente', creado: new Date().toISOString()
    });
    setEnviando(false);
    if (error) { setErrorEnvio('No se pudo guardar la reserva. Probá de nuevo.'); return; }
    setPaso(3);
  };

  return (
    <div style={{
      fontFamily: "'Manrope', sans-serif", background: '#0B1220', minHeight: '100vh', color: '#E8E6F0',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowX: 'hidden'
    }}>
      <style>{FONT_IMPORT}</style>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', fontSize: 30, color: '#D4FF3D' }}>Bielecka</div>
          <div style={{ fontSize: 11, color: '#8891A8', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>Reserva de reunión con el equipo directivo</div>
        </div>

        <div style={{ background: '#131B2E', border: '1px solid #2A3450', borderRadius: 16, padding: 24 }}>
          {paso === 1 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#E8E6F0', marginBottom: 16 }}>1. Elegí fecha y horario</div>
              <Field label="Fecha de la reunión">
                <input style={inputStyle} type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
              </Field>
              {fecha && (
                <Field label="Horarios disponibles">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: 8 }}>
                    {horariosDisponibles.map(h => (
                      <button key={h} type="button" onClick={() => setHora(h)} style={{
                        padding: '10px 8px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        border: hora === h ? '1px solid #D4FF3D' : '1px solid #2A3450',
                        background: hora === h ? '#D4FF3D' : '#0B1220',
                        color: hora === h ? '#0B1220' : '#E8E6F0'
                      }}>{h} hs</button>
                    ))}
                  </div>
                </Field>
              )}
              <Button
                onClick={() => setPaso(2)}
                style={{ width: '100%', justifyContent: 'center', marginTop: 8, opacity: (fecha && hora) ? 1 : 0.4, cursor: (fecha && hora) ? 'pointer' : 'not-allowed' }}
              >Continuar</Button>
            </div>
          )}

          {paso === 2 && (
            <form onSubmit={confirmar}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#E8E6F0', marginBottom: 16 }}>2. Tus datos de contacto</div>
              <Field label="Nombre y apellido"><input style={inputStyle} required value={nombre} onChange={e => setNombre(e.target.value)} /></Field>
              <Field label="Marca / empresa"><input style={inputStyle} required value={marca} onChange={e => setMarca(e.target.value)} /></Field>
              <Field label="Email"><input style={inputStyle} type="email" required value={email} onChange={e => setEmail(e.target.value)} /></Field>
              {errorEnvio && <div style={{ fontSize: 12, color: '#E68C8C', marginBottom: 10 }}>{errorEnvio}</div>}
              <Button type="submit" style={{ width: '100%', justifyContent: 'center', opacity: enviando ? 0.6 : 1 }}>
                {enviando ? 'Enviando...' : 'Confirmar reserva'}
              </Button>
            </form>
          )}

          {paso === 3 && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <CheckCircle2 size={44} color="#D4FF3D" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: '#E8E6F0', marginBottom: 8 }}>¡Reunión agendada!</div>
              <div style={{ fontSize: 13, color: '#8891A8' }}>
                Guardamos tu turno para el <strong style={{ color: '#E8E6F0' }}>{fecha}</strong> a las <strong style={{ color: '#E8E6F0' }}>{hora} hs</strong>. Te vamos a contactar a {email} para confirmar.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Calendario (todas las marcas, mes a mes, filtro por marca) ----------
function CalendarioView({ procesos, clients }) {
  const [mes, setMes] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [filtroCliente, setFiltroCliente] = useState('');

  const clientName = (id) => clients.find(c => c.id === id)?.name || '—';

  const cambiarMes = (delta) => {
    const d = new Date(mes);
    d.setMonth(d.getMonth() + delta);
    setMes(d);
  };

  const hoy = new Date().toISOString().slice(0, 10);
  const year = mes.getFullYear();
  const month = mes.getMonth();
  const primerDiaSemana = new Date(year, month, 1).getDay(); // 0=domingo
  const diasEnMes = new Date(year, month + 1, 0).getDate();

  const itemsPorDia = {};
  procesos
    .filter(p => p.fechaLimite)
    .filter(p => !filtroCliente || p.clientId === filtroCliente)
    .forEach(p => {
      if (!itemsPorDia[p.fechaLimite]) itemsPorDia[p.fechaLimite] = [];
      itemsPorDia[p.fechaLimite].push(p);
    });

  const celdas = [];
  for (let i = 0; i < primerDiaSemana; i++) celdas.push(null);
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d);

  const nombreMes = mes.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  return (
    <div>
      <SectionHeader
        eyebrow="Todas las marcas"
        title="Calendario"
        action={
          <select style={{ ...inputStyle, width: 200 }} value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)}>
            <option value="">Todas las marcas</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        }
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Button variant="ghost" onClick={() => cambiarMes(-1)}>← Anterior</Button>
        <div style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', fontSize: 18, color: '#E8E6F0', textTransform: 'capitalize' }}>{nombreMes}</div>
        <Button variant="ghost" onClick={() => cambiarMes(1)}>Siguiente →</Button>
      </div>

      <div style={{ display: 'flex', gap: 14, marginBottom: 16, flexWrap: 'wrap', fontSize: 11, color: '#8891A8' }}>
        {PRODUCCION_ESTADOS.map(s => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Pill tone={produccionTone(s)}>{s}</Pill>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 8 }}>
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
          <div key={d} style={{ fontSize: 11, color: '#5C6785', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center', padding: '4px 0' }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {celdas.map((d, i) => {
          if (d === null) return <div key={`empty-${i}`} />;
          const fechaStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const items = itemsPorDia[fechaStr] || [];
          const esHoy = fechaStr === hoy;
          return (
            <div key={fechaStr} style={{
              minHeight: 84, background: '#131B2E', border: esHoy ? '1px solid #D4FF3D' : '1px solid #2A3450',
              borderRadius: 8, padding: 6
            }}>
              <div style={{ fontSize: 11, color: esHoy ? '#D4FF3D' : '#5C6785', fontWeight: esHoy ? 700 : 400, marginBottom: 4 }}>{d}</div>
              <div style={{ display: 'grid', gap: 3 }}>
                {items.slice(0, 3).map(item => (
                  <div key={item.id} title={`${clientName(item.clientId)} — ${item.texto}`} style={{
                    fontSize: 10, padding: '2px 5px', borderRadius: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    background: item.estadoProduccion
                      ? (produccionTone(item.estadoProduccion) === 'active' ? 'rgba(212,255,61,0.18)' : produccionTone(item.estadoProduccion) === 'paused' ? 'rgba(184,172,235,0.18)' : '#1C2740')
                      : '#1C2740',
                    color: item.estadoProduccion
                      ? (produccionTone(item.estadoProduccion) === 'active' ? '#D4FF3D' : produccionTone(item.estadoProduccion) === 'paused' ? '#B8ACEB' : '#8891A8')
                      : '#8891A8'
                  }}>
                    {clientName(item.clientId)}
                  </div>
                ))}
                {items.length > 3 && <div style={{ fontSize: 10, color: '#5C6785' }}>+{items.length - 3} más</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ---------- Recursos de gestión (mensajes predeterminados + briefs) ----------
function RecursosGestion({ mensajes, setMensajes, briefs, setBriefs }) {
  const [tab, setTab] = useState('mensajes'); // 'mensajes' | 'briefs'
  const [showForm, setShowForm] = useState(false);
  const [tituloMsj, setTituloMsj] = useState('');
  const [textoMsj, setTextoMsj] = useState('');
  const [tituloBrief, setTituloBrief] = useState('');
  const [linkBrief, setLinkBrief] = useState('');
  const [copiadoId, setCopiadoId] = useState(null);

  const agregarMensaje = () => {
    if (!tituloMsj.trim() || !textoMsj.trim()) return;
    setMensajes([{ id: uid(), titulo: tituloMsj, texto: textoMsj }, ...mensajes]);
    setTituloMsj(''); setTextoMsj(''); setShowForm(false);
  };
  const agregarBrief = () => {
    if (!tituloBrief.trim() || !linkBrief.trim()) return;
    setBriefs([{ id: uid(), titulo: tituloBrief, link: linkBrief }, ...briefs]);
    setTituloBrief(''); setLinkBrief(''); setShowForm(false);
  };
  const copiar = (id, texto) => {
    navigator.clipboard?.writeText(texto);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 1500);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <h4 style={{ color: '#B8ACEB', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
          Recursos de gestión
        </h4>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant={tab === 'mensajes' ? 'primary' : 'ghost'} onClick={() => setTab('mensajes')}>Mensajes predeterminados</Button>
          <Button variant={tab === 'briefs' ? 'primary' : 'ghost'} onClick={() => setTab('briefs')}>Briefs predeterminados</Button>
          <Button onClick={() => setShowForm(true)}><Plus size={14} /> {tab === 'mensajes' ? 'Agregar mensaje' : 'Agregar brief'}</Button>
        </div>
      </div>

      {tab === 'mensajes' && (
        <div style={{ display: 'grid', gap: 8 }}>
          {mensajes.length === 0 && <EmptyState text="Todavía no cargaste mensajes predeterminados." />}
          {mensajes.map(m => (
            <div key={m.id} style={{ background: '#131B2E', border: '1px solid #2A3450', borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 13, color: '#E8E6F0', fontWeight: 700, marginBottom: 4 }}>{m.titulo}</div>
                  <div style={{ fontSize: 13, color: '#8891A8', whiteSpace: 'pre-wrap' }}>{m.texto}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <Button variant="ghost" onClick={() => copiar(m.id, m.texto)}>{copiadoId === m.id ? 'Copiado ✓' : 'Copiar'}</Button>
                  <button onClick={() => setMensajes(mensajes.filter(x => x.id !== m.id))} style={{ background: 'none', border: 'none', color: '#E68C8C', cursor: 'pointer' }}><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'briefs' && (
        <div style={{ display: 'grid', gap: 8 }}>
          {briefs.length === 0 && <EmptyState text="Todavía no cargaste briefs predeterminados." />}
          {briefs.map(b => (
            <div key={b.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
              background: '#131B2E', border: '1px solid #2A3450', borderRadius: 10, padding: '12px 16px', flexWrap: 'wrap'
            }}>
              <span style={{ fontSize: 13, color: '#E8E6F0' }}>{b.titulo}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={b.link} target="_blank" rel="noreferrer"><Button variant="ghost">Abrir ↗</Button></a>
                <button onClick={() => setBriefs(briefs.filter(x => x.id !== b.id))} style={{ background: 'none', border: 'none', color: '#E68C8C', cursor: 'pointer' }}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && tab === 'mensajes' && (
        <Modal title="Agregar mensaje predeterminado" onClose={() => setShowForm(false)}>
          <Field label="Título">
            <input
              style={inputStyle} value={tituloMsj} onChange={e => setTituloMsj(e.target.value)}
              placeholder="Ej. 'Primer contacto', 'Recordatorio de pago'"
            />
          </Field>
          <Field label="Texto del mensaje">
            <textarea
              style={{ ...inputStyle, minHeight: 90 }} value={textoMsj} onChange={e => setTextoMsj(e.target.value)}
              placeholder="Texto del mensaje..."
            />
          </Field>
          <Button onClick={agregarMensaje} style={{ width: '100%', justifyContent: 'center' }}>Guardar mensaje</Button>
        </Modal>
      )}

      {showForm && tab === 'briefs' && (
        <Modal title="Agregar brief predeterminado" onClose={() => setShowForm(false)}>
          <Field label="Título">
            <input
              style={inputStyle} value={tituloBrief} onChange={e => setTituloBrief(e.target.value)}
              placeholder="Ej. 'Brief marcas nuevas', 'Brief streaming'"
            />
          </Field>
          <Field label="Link del brief">
            <input
              style={inputStyle} value={linkBrief} onChange={e => setLinkBrief(e.target.value)}
              placeholder="Link del brief (Google Doc, Forms, etc.)"
            />
          </Field>
          <Button onClick={agregarBrief} style={{ width: '100%', justifyContent: 'center' }}>Guardar brief</Button>
        </Modal>
      )}
    </div>
  );
}

function InicioView({ clients, team, procesos, setProcesos, actividad, notas, setNotas, currentUser, setTab, mensajes, setMensajes, briefs, setBriefs, onAbrirTutorial }) {
  const activos = clients.filter(c => c.status === 'Activo').length;
  const pendientesTareas = procesos.filter(estaAbierto).length;
  const facturacionActiva = clients.filter(c => c.status === 'Activo').reduce((s, c) => s + (Number(c.fee) || 0), 0);
  const [showAddNota, setShowAddNota] = useState(false);

  const clientName = (id) => clients.find(c => c.id === id)?.name || '—';
  const pendientesNotas = notas.filter(n => n.categoria === 'directivas' && !n.resuelto);
  const resolverNota = (id) => setNotas(notas.map(n => n.id === id ? { ...n, resuelto: true } : n));

  const pendientesMarcas = procesos.filter(estaAbierto);
  const actualizarProceso = (id, patch) => setProcesos(procesos.map(p => p.id === id ? { ...p, ...patch } : p));

  const tusTareas = pendientesMarcas.filter(p => p.executor_id === currentUser.id);

  const recientes = [...actividad].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 6);

  const cards = [
    { label: 'Clientes activos', value: activos, sub: `${clients.length} en total`, tab: 'clientes' },
    { label: 'Integrantes del equipo', value: team.length, sub: 'freelancers y socias', tab: 'equipo' },
    { label: 'Tareas pendientes', value: pendientesTareas, sub: 'en todas las marcas', tab: 'clientes' },
    { label: 'Facturación mensual activa', value: `$${facturacionActiva.toLocaleString('es-AR')}`, sub: 'ARS, clientes activos', tab: 'clientes' },
  ];

  return (
    <div>
      <SectionHeader
        eyebrow="Bielecka · Panel"
        title="Inicio"
        action={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button variant="ghost" onClick={onAbrirTutorial}>Repetir tutorial</Button>
            <Button variant="ghost" onClick={() => setShowAddNota(s => !s)}><Plus size={14} /> {showAddNota ? 'Cerrar' : 'Nueva nota'}</Button>
          </div>
        }
      />

      {tusTareas.length > 0 && (
        <div style={{
          background: 'rgba(212,255,61,0.08)', border: '1px solid rgba(212,255,61,0.4)',
          borderRadius: 14, padding: '18px 20px', marginBottom: 16
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#D4FF3D', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            {currentUser.name.split(' ')[0]}, tenés {tusTareas.length} tarea{tusTareas.length > 1 ? 's' : ''} asignada{tusTareas.length > 1 ? 's' : ''}
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {tusTareas.slice(0, 6).map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <Pill tone={procesoEstado(p).tone}>{procesoEstado(p).label}</Pill>
                  <span style={{ fontSize: 13, color: '#E8E6F0' }}><strong>{currentUser.name.split(' ')[0]}:</strong> {p.texto}</span>
                  <span style={{ fontSize: 11, color: '#5C6785' }}>— {clientName(p.clientId)}{p.fechaLimite ? ` · límite ${p.fechaLimite}` : ''}</span>
                </label>
                {p.fechaLimite && <AgregarCalendarBoton titulo={`${clientName(p.clientId)} — ${p.texto}`} fechaLimite={p.fechaLimite} notas={p.texto} email={currentUser.email} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddNota && (
        <div style={{ marginBottom: 24 }}>
          <AddNotaBox notas={notas} setNotas={setNotas} currentUser={currentUser} categoria="directivas" />
        </div>
      )}

      {pendientesNotas.length > 0 && (
        <div style={{
          background: 'rgba(212,255,61,0.06)', border: '1px solid rgba(212,255,61,0.3)',
          borderRadius: 14, padding: '18px 20px', marginBottom: 16
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#D4FF3D', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Notas pendientes ({pendientesNotas.length})
            </div>
            <button onClick={() => setTab('notas')} style={{ background: 'none', border: 'none', color: '#B8ACEB', fontSize: 12, cursor: 'pointer' }}>Ver todas las notas →</button>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {pendientesNotas.slice(0, 5).map(n => (
              <label key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={false} onChange={() => resolverNota(n.id)} style={{ width: 16, height: 16, flexShrink: 0, accentColor: '#D4FF3D' }} />
                <span style={{ fontSize: 13, color: '#E8E6F0' }}>{n.contenido}</span>
                <span style={{ fontSize: 11, color: '#5C6785' }}>— {n.autor}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {pendientesMarcas.length > 0 && (
        <div style={{
          background: 'rgba(184,172,235,0.06)', border: '1px solid rgba(184,172,235,0.3)',
          borderRadius: 14, padding: '18px 20px', marginBottom: 40
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#B8ACEB', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Pendientes de marcas ({pendientesMarcas.length})
            </div>
            <button onClick={() => setTab('clientes')} style={{ background: 'none', border: 'none', color: '#B8ACEB', fontSize: 12, cursor: 'pointer' }}>Ver clientes →</button>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {pendientesMarcas.slice(0, 6).map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <Pill tone={procesoEstado(p).tone}>{procesoEstado(p).label}</Pill>
                <span style={{ fontSize: 13, color: '#E8E6F0' }}>{p.texto}</span>
                <span style={{ fontSize: 11, color: '#5C6785' }}>— {clientName(p.clientId)}{p.fechaLimite ? ` · límite ${p.fechaLimite}` : ''}</span>
                <EntregaAcciones item={p} currentUser={currentUser} update={actualizarProceso} compact />
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 40 }}>
        <CalendarioView procesos={procesos} clients={clients} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 40 }}>
        {cards.map((c, i) => (
          <div key={i} onClick={() => setTab(c.tab)} style={{
            background: '#131B2E', border: '1px solid #2A3450', borderRadius: 14, padding: 22, cursor: 'pointer'
          }}>
            <div style={{ fontSize: 13, color: '#8891A8', marginBottom: 8, fontWeight: 600 }}>{c.label}</div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 30, color: '#D4FF3D', fontWeight: 600 }}>{c.value}</div>
            <div style={{ fontSize: 12, color: '#5C6785', marginTop: 4 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 40 }}>
        <RecursosGestion mensajes={mensajes} setMensajes={setMensajes} briefs={briefs} setBriefs={setBriefs} />
      </div>

      {recientes.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h4 style={{ color: '#B8ACEB', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Actividad reciente</h4>
            <button onClick={() => setTab('actividad')} style={{ background: 'none', border: 'none', color: '#B8ACEB', fontSize: 12, cursor: 'pointer' }}>Ver toda →</button>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {recientes.map(a => (
              <div key={a.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                background: '#131B2E', border: '1px solid #2A3450', borderRadius: 10, padding: '12px 16px', flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CircleDot size={10} color="#D4FF3D" />
                  <span style={{ fontSize: 13, color: '#E8E6F0' }}><strong>{a.autor}</strong> · {a.tipo}</span>
                </div>
                <span style={{ fontSize: 11, color: '#5C6785' }}>{timeAgo(a.fecha)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Navegación ----------
// ---------- Auditorías de cuenta (solo directoras) ----------
function AuditoriasView({ audits, setAudits, clients, procesos }) {
  const hoy = isoLocal(new Date());
  const vacio = { client_id: '', audit_date: hoy, completed_tasks: 0, pending_tasks: 0, deviations_notes: '', profitability_score: 3 };
  const [form, setForm] = useState(vacio);
  const [filtro, setFiltro] = useState('');
  const clientName = (id) => clients.find(c => c.id === id)?.name || '—';

  // Al elegir cliente, precarga los conteos desde sus tareas (se pueden corregir a mano)
  const elegirCliente = (id) => {
    const delCliente = procesos.filter(p => p.clientId === id);
    setForm(f => ({
      ...f, client_id: id,
      completed_tasks: delCliente.filter(p => p.estado === 'Resuelto').length,
      pending_tasks: delCliente.filter(estaAbierto).length,
    }));
  };

  const puedeGuardar = !!form.client_id && form.profitability_score >= 1 && form.profitability_score <= 5;
  const guardar = () => {
    if (!puedeGuardar) return;
    setAudits([{
      id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : uid(),
      client_id: form.client_id, audit_date: form.audit_date || hoy,
      completed_tasks: Math.max(0, parseInt(form.completed_tasks, 10) || 0),
      pending_tasks: Math.max(0, parseInt(form.pending_tasks, 10) || 0),
      deviations_notes: form.deviations_notes.trim() || null,
      profitability_score: Math.min(5, Math.max(1, Number(form.profitability_score))),
      created_at: new Date().toISOString()
    }, ...audits]);
    setForm({ ...vacio, audit_date: form.audit_date });
  };
  const borrar = (id) => setAudits(audits.filter(a => a.id !== id));

  const lista = audits
    .filter(a => !filtro || a.client_id === filtro)
    .sort((a, b) => (b.audit_date || '').localeCompare(a.audit_date || '') || new Date(b.created_at) - new Date(a.created_at));
  const promedio = lista.length ? (lista.reduce((s, a) => s + Number(a.profitability_score || 0), 0) / lista.length).toFixed(1) : null;
  const scoreTone = (n) => (n >= 4 ? 'active' : n >= 3 ? 'paused' : 'lost');

  return (
    <div>
      <SectionHeader eyebrow="Control de gestión" title="Auditorías de cuenta" />

      <div style={{ background: '#131B2E', border: '1px solid #2A3450', borderRadius: 14, padding: 20, marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#B8ACEB', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Nueva auditoría</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 10 }}>
          <Field label="Cliente">
            <select style={inputStyle} value={form.client_id} onChange={e => elegirCliente(e.target.value)}>
              <option value="">Elegir cliente…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Fecha de auditoría">
            <input style={inputStyle} type="date" value={form.audit_date} onChange={e => setForm({ ...form, audit_date: e.target.value })} />
          </Field>
          <Field label="Tareas completadas">
            <input style={inputStyle} type="number" min="0" value={form.completed_tasks} onChange={e => setForm({ ...form, completed_tasks: e.target.value })} />
          </Field>
          <Field label="Tareas pendientes">
            <input style={inputStyle} type="number" min="0" value={form.pending_tasks} onChange={e => setForm({ ...form, pending_tasks: e.target.value })} />
          </Field>
          <Field label="Rentabilidad (1 a 5)">
            <input style={inputStyle} type="number" min="1" max="5" step="0.5" value={form.profitability_score} onChange={e => setForm({ ...form, profitability_score: e.target.value })} />
          </Field>
        </div>
        <Field label="Desvíos y notas">
          <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.deviations_notes} onChange={e => setForm({ ...form, deviations_notes: e.target.value })} placeholder="Qué se desvió de lo acordado, horas de más, pedidos fuera de pack…" />
        </Field>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button disabled={!puedeGuardar} onClick={guardar}><Plus size={13} /> Guardar auditoría</Button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
        <select style={{ ...inputStyle, maxWidth: 240 }} value={filtro} onChange={e => setFiltro(e.target.value)}>
          <option value="">Todas las marcas</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {promedio && <span style={{ fontSize: 12, color: '#8891A8' }}>{lista.length} auditoría{lista.length > 1 ? 's' : ''} · rentabilidad promedio <strong style={{ color: '#D4FF3D' }}>{promedio}</strong></span>}
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {lista.length === 0 && <EmptyState text="Todavía no hay auditorías cargadas." />}
        {lista.map(a => (
          <div key={a.id} style={{ background: '#131B2E', border: '1px solid #2A3450', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: "'Fraunces', serif", fontSize: 17, color: '#E8E6F0', fontStyle: 'italic' }}>{clientName(a.client_id)}</span>
                <span style={{ fontSize: 12, color: '#5C6785' }}>{a.audit_date}</span>
                <Pill tone={scoreTone(Number(a.profitability_score))}>Rentabilidad {Number(a.profitability_score)}/5</Pill>
              </div>
              <button onClick={() => borrar(a.id)} style={{ background: 'none', border: 'none', color: '#E68C8C', cursor: 'pointer' }}><Trash2 size={13} /></button>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#8891A8', marginTop: 8, flexWrap: 'wrap' }}>
              <span>Completadas: <strong style={{ color: '#D4FF3D' }}>{a.completed_tasks}</strong></span>
              <span>Pendientes: <strong style={{ color: '#B8ACEB' }}>{a.pending_tasks}</strong></span>
            </div>
            {a.deviations_notes && <div style={{ fontSize: 13, color: '#8891A8', marginTop: 8, fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>{a.deviations_notes}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Matriz RACI (todas las personas la ven; se resalta tu columna) ----------
function RaciView({ currentUser }) {
  const miRol = rolRaci(currentUser);
  const cols = 'minmax(0, 2.2fr) repeat(3, minmax(0, 1fr))';
  return (
    <div>
      <SectionHeader eyebrow="Roles y responsabilidades" title="Matriz RACI" />
      <div style={{ fontSize: 13, color: '#8891A8', marginBottom: 16, maxWidth: 640 }}>
        Quién hace, quién aprueba, a quién se consulta y a quién se avisa en cada actividad.
        Tu rol: <strong style={{ color: '#D4FF3D' }}>{RACI_ROLES.find(r => r.id === miRol).label}</strong>.
      </div>
      <div style={{ background: '#131B2E', border: '1px solid #2A3450', borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 6, padding: '10px 12px', borderBottom: '1px solid #2A3450', alignItems: 'end' }}>
          <div style={{ fontSize: 11, color: '#5C6785', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actividad</div>
          {RACI_ROLES.map(r => (
            <div key={r.id} style={{ fontSize: 11, fontWeight: 700, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.03em', color: r.id === miRol ? '#D4FF3D' : '#B8ACEB' }}>{r.label}</div>
          ))}
        </div>
        {RACI_ACTIVIDADES.map(a => (
          <div key={a.id} style={{ display: 'grid', gridTemplateColumns: cols, gap: 6, padding: '10px 12px', borderBottom: '1px solid #1C2740', alignItems: 'center' }}>
            <div style={{ fontSize: 13, color: '#E8E6F0' }}>{a.texto}</div>
            {RACI_ROLES.map(r => {
              const t = RACI_TONOS[a[r.id]] || RACI_TONOS.I;
              return (
                <div key={r.id} style={{
                  textAlign: 'center', background: r.id === miRol ? 'rgba(212,255,61,0.04)' : 'transparent', borderRadius: 6, padding: '2px 0'
                }}>
                  <span style={{ display: 'inline-block', minWidth: 30, background: t.bg, color: t.color, fontSize: 12, fontWeight: 700, padding: '3px 6px', borderRadius: 20 }}>{a[r.id]}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: '#5C6785' }}>
        <strong style={{ color: '#B8ACEB' }}>R</strong> Responsable (ejecuta) · <strong style={{ color: '#D4FF3D' }}>A</strong> Aprobador (rinde cuentas) · <strong>C</strong> Consultado · <strong>I</strong> Informado
      </div>
    </div>
  );
}

const NAV_SOCIA = [
  { id: 'resumen', label: 'Inicio', icon: LayoutDashboard },
  { id: 'clientes', label: 'Clientes', icon: Briefcase },
  { id: 'calendario', label: 'Calendario', icon: CalendarDays },
  { id: 'reservas', label: 'Reservas', icon: CheckCircle2 },
  { id: 'agenda', label: 'Agenda personal', icon: Lock },
  { id: 'equipo', label: 'Equipo', icon: Users },
  { id: 'actividad', label: 'Actividad', icon: Activity },
  { id: 'notas', label: 'Notas', icon: Lock },
  { id: 'auditorias', label: 'Auditorías', icon: FileText },
  { id: 'raci', label: 'Matriz RACI', icon: CircleDot },
  { id: 'metricas', label: 'Métricas', icon: BarChart3 },
];

const NAV_FREELANCE = [
  { id: 'mis-tareas', label: 'Mis tareas', icon: ClipboardCheck },
  { id: 'equipo-marcas', label: 'Equipo y marcas', icon: Users },
  { id: 'raci', label: 'Matriz RACI', icon: CircleDot },
  { id: 'actividad', label: 'Actividad', icon: Activity },
  { id: 'notas', label: 'Notas', icon: Lock },
];

// ---------- Login (sin contraseña, por link al mail) ----------
// ---------- Tutorial de bienvenida (una vez por persona, con botón para repetirlo) ----------
function tutorialKey(email) { return `bielecka-tutorial-visto-${email}`; }

const TUTORIAL_SOCIA = [
  { titulo: 'Inicio', texto: 'Pendientes de notas y de marcas siempre arriba, el calendario del mes, un resumen general y la actividad reciente del equipo.' },
  { titulo: 'Clientes', texto: 'Cada marca con su pack, links de acceso (Trello/Drive/Forms/Pinterest), equipo asignado por tipo de pieza, e historial de pendientes.' },
  { titulo: 'Calendario', texto: 'Todas las marcas juntas, mes a mes, con filtro por marca y color según el estado de producción.' },
  { titulo: 'Equipo', texto: 'Alta de integrantes por email (entran solos con el link mágico), marcas asignadas, y videollamadas de equipo.' },
  { titulo: 'Actividad', texto: 'Bitácora rápida de qué se movió — separada en "todo el equipo" y "solo directivas".' },
  { titulo: 'Notas', texto: 'Notas del equipo directivo (privadas) y notas generales (las ve todo el equipo), en pestañas separadas.' },
  { titulo: 'Métricas', texto: 'Alcance, visualizaciones, interacciones y crecimiento por marca y período, cargado por la CM.' },
];

const TUTORIAL_FREELANCE = [
  { titulo: 'Mis tareas', texto: 'Lo que te asignaron en el historial de cada marca. Arriba tenés tu manual de pasos según tu perfil (CM o Diseñador/Editor).' },
  { titulo: 'Equipo y marcas', texto: 'Quién trabaja en cada marca del equipo, sin ver datos comerciales.' },
  { titulo: 'Actividad', texto: 'Registrá avances rápidos: "estrategia lista", "contenido cargado en Trello y Drive", o si hay dudas sobre un pedido.' },
  { titulo: 'Notas', texto: 'Notas generales del equipo — avisos y recordatorios del día a día.' },
];

function TutorialModal({ isSocia, onClose }) {
  const items = isSocia ? TUTORIAL_SOCIA : TUTORIAL_FREELANCE;
  return (
    <Modal title="Cómo se usa el panel" onClose={onClose}>
      <div style={{ display: 'grid', gap: 14, marginBottom: 18 }}>
        {items.map((it, i) => (
          <div key={i}>
            <div style={{ fontSize: 13, color: '#B8ACEB', fontWeight: 700, marginBottom: 3 }}>{it.titulo}</div>
            <div style={{ fontSize: 13, color: '#8891A8', lineHeight: 1.5 }}>{it.texto}</div>
          </div>
        ))}
      </div>
      {!isSocia && (
        <a href={TRELLO_TUTORIAL_LINK} target="_blank" rel="noreferrer" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#0B1220',
          background: '#D4FF3D', fontWeight: 700, borderRadius: 8, padding: '8px 12px', marginBottom: 18
        }}><Video size={14} /> Ver video tutorial: cómo usar Trello ↗</a>
      )}
      <Button onClick={onClose} style={{ width: '100%', justifyContent: 'center' }}>Entendido</Button>
    </Modal>
  );
}

function LoginView({ onEnviar }) {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState('');

  const enviar = async () => {
    if (!email.trim()) return;
    setEnviando(true);
    setError('');
    const { error } = await onEnviar(email.trim());
    setEnviando(false);
    if (error) setError('No se pudo enviar el link. Probá de nuevo en un momento.');
    else setEnviado(true);
  };

  return (
    <div style={{
      fontFamily: "'Manrope', sans-serif", background: '#0B1220', minHeight: '100vh', color: '#E8E6F0',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <style>{FONT_IMPORT}</style>
      <div style={{ maxWidth: 380, width: '100%', textAlign: 'center' }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', fontSize: 32, marginBottom: 6 }}>Bielecka</div>
        <div style={{ fontSize: 12, color: '#5C6785', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 32 }}>Panel operativo</div>

        {!enviado ? (
          <>
            <div style={{ textAlign: 'left', marginBottom: 20 }}>
              <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#8891A8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tu email</span>
              <input
                style={inputStyle} type="email" autoFocus value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && enviar()}
                placeholder="nombre@gmail.com"
              />
              {error && <div style={{ color: '#E68C8C', fontSize: 12, marginTop: 8 }}>{error}</div>}
            </div>
            <Button onClick={enviar} style={{ width: '100%', justifyContent: 'center', opacity: enviando ? 0.6 : 1 }}>
              {enviando ? 'Enviando...' : 'Enviarme el link de acceso'}
            </Button>
            <div style={{ fontSize: 11, color: '#3E4867', marginTop: 20, lineHeight: 1.5 }}>
              Sin contraseña — te llega un link a tu mail y con eso entrás. Tiene que ser el
              mismo mail con el que te cargó una Directora en Equipo.
            </div>
          </>
        ) : (
          <div style={{ fontSize: 14, color: '#E8E6F0', lineHeight: 1.6 }}>
            Te mandamos un link a <strong>{email}</strong>. Abrilo desde el mismo dispositivo
            para entrar al panel.
          </div>
        )}
      </div>
    </div>
  );
}

function PendingApprovalView({ email, onSalir }) {
  return (
    <div style={{
      fontFamily: "'Manrope', sans-serif", background: '#0B1220', minHeight: '100vh', color: '#E8E6F0',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <style>{FONT_IMPORT}</style>
      <div style={{ maxWidth: 380, width: '100%', textAlign: 'center' }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', fontSize: 32, marginBottom: 20 }}>Bielecka</div>
        <div style={{ fontSize: 14, color: '#E8E6F0', lineHeight: 1.6, marginBottom: 20 }}>
          Tu cuenta ({email}) todavía no está habilitada en el panel.
          Pedile a una Directora que te agregue en la sección Equipo con este mismo mail.
        </div>
        <Button variant="ghost" onClick={onSalir} style={{ width: '100%', justifyContent: 'center' }}>Salir</Button>
      </div>
    </div>
  );
}

// ---------- App shell ----------
const RESPONSIVE_CSS = `
* { box-sizing: border-box; }
html, body { overflow-x: hidden; max-width: 100%; }
.bielecka-shell { display: flex; min-height: 100vh; max-width: 100vw; }
.bielecka-sidebar { width: 220px; flex-shrink: 0; background: #0B1220; border-right: 1px solid #1C2740; padding: 28px 16px; display: flex; flex-direction: column; }
.bielecka-topbar { display: none; }
.bielecka-main { flex: 1; min-width: 0; padding: 36px 40px; max-width: 1100px; box-sizing: border-box; }
.bielecka-nav { display: grid; gap: 4px; }
.bielecka-hamburger { display: none; }
.bielecka-mobile-menu { display: none; }

@media (max-width: 900px) {
  .bielecka-shell { flex-direction: column; }
  .bielecka-sidebar { display: none; }
  .bielecka-topbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 16px; border-bottom: 1px solid #1C2740; background: #0B1220;
    position: sticky; top: 0; z-index: 30;
  }
  .bielecka-hamburger {
    display: flex; align-items: center; justify-content: center;
    width: 38px; height: 38px; border-radius: 8px; border: 1px solid #2A3450;
    background: transparent; color: #E8E6F0; cursor: pointer; flex-shrink: 0;
  }
  .bielecka-mobile-menu.open {
    display: block; background: #0B1220; border-bottom: 1px solid #1C2740;
    padding: 8px 16px 16px;
  }
  .bielecka-mobile-menu .bielecka-nav { grid-auto-flow: row; }
  .bielecka-main { padding: 20px 16px; max-width: 100%; width: 100%; }
}

@media (max-width: 480px) {
  .bielecka-main { padding: 16px 12px; }
}
`;

function Hamburger({ abierto }) {
  return (
    <div className="bielecka-hamburger" style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 9 }}>
      <span style={{ width: 18, height: 2, background: '#E8E6F0', display: 'block', transition: 'transform .15s', transform: abierto ? 'translateY(6px) rotate(45deg)' : 'none' }} />
      <span style={{ width: 18, height: 2, background: '#E8E6F0', display: 'block', opacity: abierto ? 0 : 1 }} />
      <span style={{ width: 18, height: 2, background: '#E8E6F0', display: 'block', transition: 'transform .15s', transform: abierto ? 'translateY(-6px) rotate(-45deg)' : 'none' }} />
    </div>
  );
}

function NavButtons({ visibleNav, tab, setTab, onNavigate }) {
  return (
    <nav className="bielecka-nav">
      {visibleNav.map(n => {
        const Icon = n.icon;
        const active = tab === n.id;
        return (
          <button key={n.id} onClick={() => { setTab(n.id); if (onNavigate) onNavigate(); }} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8,
            background: active ? '#131B2E' : 'transparent', border: 'none', cursor: 'pointer',
            color: active ? '#D4FF3D' : '#8891A8', fontFamily: "'Manrope', sans-serif",
            fontSize: 14, fontWeight: 600, textAlign: 'left', width: '100%'
          }}>
            <Icon size={16} /> {n.label}
          </button>
        );
      })}
    </nav>
  );
}

export default function App() {
  const [tab, setTab] = useState('resumen');
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // Ruta pública, sin login: bielecka-panel.tu-dominio.com/?reservar=1
  const esVistaPublicaReserva = typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('reservar') === '1';

  const session = useAuthSession();
  const ownProfile = useOwnProfile(session);
  const isSocia = ownProfile?.tipo === 'Socia';

  const [clients, setClients, clientsLoaded] = useSyncedClients(!!isSocia);
  const [team, setTeam, teamLoaded] = useSyncedProfiles(!!isSocia);
  const [procesos, setProcesos] = useSyncedTable('procesos', { enabled: !!ownProfile });
  const [notas, setNotas] = useSyncedTable('notas', { enabled: !!ownProfile });
  const [comentarios, setComentarios] = useSyncedTable('task_comments', { enabled: !!ownProfile });
  const [audits, setAudits] = useSyncedTable('account_audits', { enabled: !!isSocia });
  const [actividad, setActividad] = useSyncedTable('actividad', { enabled: !!ownProfile });
  const [metrics, setMetrics] = useSyncedTable('metrics', { enabled: !!isSocia });
  const [mensajes, setMensajes] = useSyncedTable('mensajes', { enabled: !!isSocia });
  const [briefs, setBriefs] = useSyncedTable('briefs', { enabled: !!isSocia });
  const [reservas, setReservas] = useSyncedTable('reservas', { enabled: !!isSocia });

  if (esVistaPublicaReserva) {
    return <VistaReservarTurnoCliente />;
  }

  useEffect(() => {
    if (ownProfile) setTab(ownProfile.tipo === 'Socia' ? 'resumen' : 'mis-tareas');
  }, [ownProfile?.id]);

  useEffect(() => {
    if (!ownProfile || !session) return;
    const key = tutorialKey(session.user.email);
    if (!localStorage.getItem(key)) {
      setShowTutorial(true);
      localStorage.setItem(key, '1');
    }
  }, [ownProfile?.id]);

  // ---- Pantallas de carga / login / sin acceso ----
  if (session === undefined) {
    return (
      <div style={{ fontFamily: "'Manrope', sans-serif", background: '#0B1220', minHeight: '100vh', color: '#5C6785', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Cargando panel…
      </div>
    );
  }

  if (!session) {
    return <LoginView onEnviar={enviarLinkAcceso} />;
  }

  if (ownProfile === undefined) {
    return (
      <div style={{ fontFamily: "'Manrope', sans-serif", background: '#0B1220', minHeight: '100vh', color: '#5C6785', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Cargando panel…
      </div>
    );
  }

  if (ownProfile === null) {
    return <PendingApprovalView email={session.user.email} onSalir={cerrarSesion} />;
  }

  const currentUser = ownProfile;
  const visibleNav = isSocia ? NAV_SOCIA : NAV_FREELANCE;
  // Las colaboradoras solo ven cuentas donde ejecutan tareas o son líderes de cuenta
  // (la base ya filtra con RLS/vistas; esto es una segunda barrera en la interfaz).
  const clientsVisibles = isSocia ? clients : clients.filter(c =>
    c.account_lead_id === currentUser.id || procesos.some(p => p.clientId === c.id && p.executor_id === currentUser.id)
  );

  return (
    <div className="bielecka-shell" style={{ fontFamily: "'Manrope', sans-serif", background: '#0B1220', color: '#E8E6F0' }}>
      <style>{FONT_IMPORT}{RESPONSIVE_CSS}</style>

      <aside className="bielecka-sidebar">
        <div className="bielecka-sidebar-brand" style={{ marginBottom: 36, paddingLeft: 8 }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', fontSize: 24, color: '#E8E6F0' }}>Bielecka</div>
          <div style={{ fontSize: 10, color: '#5C6785', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>Panel operativo</div>
        </div>
        <NavButtons visibleNav={visibleNav} tab={tab} setTab={setTab} />
        <div className="bielecka-sidebar-footer" style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid #1C2740' }}>
          <div style={{ fontSize: 12, color: '#8891A8', marginBottom: 8 }}>{currentUser?.name || session.user.email}</div>
          <button onClick={cerrarSesion} style={{
            background: 'none', border: '1px solid #2A3450', color: '#5C6785', fontSize: 12,
            padding: '6px 10px', borderRadius: 6, cursor: 'pointer', width: '100%'
          }}>Cerrar sesión</button>
        </div>
      </aside>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div className="bielecka-topbar">
          <div style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', fontSize: 19, color: '#E8E6F0' }}>Bielecka</div>
          <button className="bielecka-hamburger-btn" onClick={() => setMenuAbierto(a => !a)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
            <Hamburger abierto={menuAbierto} />
          </button>
        </div>
        <div className={`bielecka-mobile-menu${menuAbierto ? ' open' : ''}`}>
          <NavButtons visibleNav={visibleNav} tab={tab} setTab={setTab} onNavigate={() => setMenuAbierto(false)} />
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #1C2740' }}>
            <div style={{ fontSize: 12, color: '#8891A8', marginBottom: 8 }}>{currentUser?.name || session.user.email}</div>
            <button onClick={cerrarSesion} style={{
              background: 'none', border: '1px solid #2A3450', color: '#5C6785', fontSize: 12,
              padding: '6px 10px', borderRadius: 6, cursor: 'pointer', width: '100%'
            }}>Cerrar sesión</button>
          </div>
        </div>

        <main className="bielecka-main">
          {isSocia && tab === 'resumen' && (
            <InicioView clients={clients} team={team} procesos={procesos} setProcesos={setProcesos} actividad={actividad} notas={notas} setNotas={setNotas} currentUser={currentUser} setTab={setTab} mensajes={mensajes} setMensajes={setMensajes} briefs={briefs} setBriefs={setBriefs} onAbrirTutorial={() => setShowTutorial(true)} />
          )}
          {isSocia && tab === 'clientes' && (
            <ClientesView clients={clients} setClients={setClients} procesos={procesos} setProcesos={setProcesos} team={team} currentUser={currentUser} actividad={actividad} setActividad={setActividad} comentarios={comentarios} setComentarios={setComentarios} />
          )}
          {isSocia && tab === 'calendario' && <CalendarioView procesos={procesos} clients={clients} />}
          {isSocia && tab === 'equipo' && (
            <EquipoView team={team} setTeam={setTeam} clients={clients} procesos={procesos} currentUser={currentUser} actividad={actividad} setActividad={setActividad} />
          )}
          {isSocia && tab === 'auditorias' && <AuditoriasView audits={audits} setAudits={setAudits} clients={clients} procesos={procesos} />}
          {tab === 'raci' && <RaciView currentUser={currentUser} />}
          {isSocia && tab === 'metricas' && <MetricasView metrics={metrics} setMetrics={setMetrics} clients={clients} />}
          {isSocia && tab === 'reservas' && <ReservasView reservas={reservas} setReservas={setReservas} />}
          {isSocia && tab === 'agenda' && <AgendaDirectivaView currentUser={currentUser} team={team} />}
          {tab === 'actividad' && <ActividadView actividad={actividad} setActividad={setActividad} currentUser={currentUser} isSocia={isSocia} clients={clientsVisibles} team={team} />}
          {tab === 'notas' && <NotasView notas={notas} setNotas={setNotas} currentUser={currentUser} isSocia={isSocia} />}
          {tab === 'mis-tareas' && <MisTareasView currentUser={currentUser} procesos={procesos} setProcesos={setProcesos} clients={clientsVisibles} onAbrirTutorial={() => setShowTutorial(true)} comentarios={comentarios} setComentarios={setComentarios} />}
          {!isSocia && tab === 'equipo-marcas' && <EquipoMarcasView team={team} clients={clientsVisibles} />}
        </main>
      </div>

      {showTutorial && <TutorialModal isSocia={isSocia} onClose={() => setShowTutorial(false)} />}
    </div>
  );
}
