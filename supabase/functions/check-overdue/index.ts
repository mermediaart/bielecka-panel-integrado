// Supabase Edge Function: check-overdue
// Corre por cron cada 1 hora (ver supabase-schema-fase2.sql, sección 6).
// Por cada alerta: inserta en in_app_notifications (pop-up en Inicio) Y manda
// un mail real con Resend. Si no configurás RESEND_API_KEY, el mail se
// omite pero el pop-up in-app se sigue generando igual.
//
// Secrets que necesita este función (Supabase > Edge Functions > Secrets):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (ya suelen estar por defecto)
//   RESEND_API_KEY   -> creá una cuenta gratis en resend.com
//   RESEND_FROM      -> ej. "Bielecka <alertas@tudominio.com>" (dominio verificado en Resend)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_FROM = Deno.env.get('RESEND_FROM') || 'Bielecka <alertas@bielecka.app>';
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

async function enviarMail(destinatarioEmail, asunto, mensaje) {
  if (!RESEND_API_KEY || !destinatarioEmail) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [destinatarioEmail],
        subject: asunto,
        text: mensaje,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error('Error enviando mail:', err);
    return false;
  }
}

async function yaNotificadoHoy(motivo, clientId, cardId) {
  const hoy = new Date().toISOString().slice(0, 10);
  let q = supabase.from('in_app_notifications').select('id').eq('motivo', motivo).gte('creado', `${hoy}T00:00:00`);
  if (clientId) q = q.eq('clientId', clientId);
  if (cardId) q = q.eq('cardId', cardId);
  const { data } = await q;
  return (data || []).length > 0;
}

async function notificar({ destinatarioId, destinatarioEmail, asunto, mensaje, motivo, clientId, cardId }) {
  if (await yaNotificadoHoy(motivo, clientId, cardId)) return;
  const emailEnviado = await enviarMail(destinatarioEmail, asunto, mensaje);
  await supabase.from('in_app_notifications').insert({
    id: uid(), destinatarioId, destinatarioEmail, mensaje, motivo,
    clientId: clientId || null, cardId: cardId || null,
    leida: false, emailEnviado, creado: new Date().toISOString(),
  });
}

// ---------- 1) Tarjetas +24hs en Revisión Interna ----------
async function chequearRevisionInterna() {
  const limite = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: tarjetas } = await supabase
    .from('content_cards').select('*')
    .eq('columna', 'Revisión Interna')
    .lt('fechaEntradaColumna', limite);
  if (!tarjetas?.length) return;

  const { data: profiles } = await supabase.from('profiles').select('*');
  const carol = profiles?.find(p => p.name?.toLowerCase().includes('carol'));
  const merlina = profiles?.find(p => p.name?.toLowerCase().includes('merlina'));

  const porRevisora = new Map();
  for (const t of tarjetas) {
    const revisoras = t.tipo === 'Estrategia'
      ? [carol, merlina].filter(Boolean)
      : [profiles?.find(p => p.id === t.cmAsignadaId), merlina].filter(Boolean);
    for (const rev of revisoras) {
      if (!porRevisora.has(rev.id)) porRevisora.set(rev.id, { revisora: rev, piezas: [] });
      porRevisora.get(rev.id).piezas.push(t.titulo);
    }
  }

  for (const { revisora, piezas } of porRevisora.values()) {
    const mensaje = `⚠️ Hola @${revisora.name.split(' ')[0]}, las siguientes tarjetas llevan más de 24 horas esperando tu Aprobación en REVISIÓN INTERNA: ${piezas.join(', ')}`;
    await notificar({
      destinatarioId: revisora.id, destinatarioEmail: revisora.email,
      asunto: 'Bielecka — Aprobaciones pendientes +24hs', mensaje, motivo: 'revision_interna_24h',
    });
  }
}

// ---------- 2) Tarjetas +24hs en Revisión de Cliente (Airtable) ----------
async function chequearRevisionCliente() {
  const limite = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: tarjetas } = await supabase
    .from('content_cards').select('*, clients(name)')
    .eq('columna', 'Revisión Cliente')
    .lt('fechaEntradaColumna', limite);
  if (!tarjetas?.length) return;
  const { data: profiles } = await supabase.from('profiles').select('*');

  for (const t of tarjetas) {
    const cm = profiles?.find(p => p.id === t.cmAsignadaId);
    if (!cm) continue;
    const marca = t.clients?.name || t.boardName || 'la marca';
    const mensaje = `⚠️ Hola @${cm.name.split(' ')[0]}, la tarjeta ${t.titulo} / ${marca} lleva 24 horas en Revisión de Cliente. ¿Ya cargaste todo en Airtable para la aprobación del cliente?`;
    await notificar({
      destinatarioId: cm.id, destinatarioEmail: cm.email,
      asunto: 'Bielecka — Confirmar carga en Airtable', mensaje, motivo: 'revision_cliente_24h',
      clientId: t.clientId, cardId: t.id,
    });
  }
}

// ---------- 3) Disparador de Estrategia futura (días 25 al 30) ----------
async function chequearEstrategiaFutura() {
  const hoy = new Date();
  const dia = hoy.getDate();
  if (dia < 25 || dia > 30) return;

  const mesMasDos = new Date(hoy.getFullYear(), hoy.getMonth() + 2, 1);
  const nombreMes = mesMasDos.toLocaleDateString('es-AR', { month: 'long' });

  const { data: clientes } = await supabase.from('clients').select('id, name, "cmId"').eq('status', 'Activo');
  const { data: profiles } = await supabase.from('profiles').select('*');

  for (const c of clientes || []) {
    const cm = profiles?.find(p => p.id === c.cmId);
    if (!cm) continue;
    const mensaje = `🤖 ¡Hola @${cm.name.split(' ')[0]}! Se acerca el cierre de mes. Ya podés comenzar a armar la tarjeta de ESTRATEGIA de ${nombreMes} para ${c.name}.`;
    await notificar({
      destinatarioId: cm.id, destinatarioEmail: cm.email,
      asunto: `Bielecka — Armar estrategia de ${nombreMes}`, mensaje, motivo: 'estrategia_mes', clientId: c.id,
    });
  }
}

// ---------- 4) Onboarding de clientes nuevos (aviso único) ----------
async function chequearOnboarding() {
  const hoy = new Date().toISOString().slice(0, 10);
  const { data: clientes } = await supabase.from('clients').select('id, name, "cmId", "fechaInicio"').eq('fechaInicio', hoy);
  if (!clientes?.length) return;
  const { data: profiles } = await supabase.from('profiles').select('*');

  for (const c of clientes) {
    const cm = profiles?.find(p => p.id === c.cmId);
    if (!cm) continue;
    const diaContrato = new Date(c.fechaInicio + 'T00:00:00').getDate();
    const tramo = diaContrato <= 10 ? 'los primeros 2 meses' : 'los 2 meses siguientes';
    const mensaje = `🤖 Hola @${cm.name.split(' ')[0]}, arrancamos con ${c.name}. Estructurá en Trello ${tramo} de trabajo con esta marca.`;
    await notificar({
      destinatarioId: cm.id, destinatarioEmail: cm.email,
      asunto: `Bielecka — Onboarding de ${c.name}`, mensaje, motivo: 'onboarding', clientId: c.id,
    });
  }
}

Deno.serve(async (_req) => {
  try {
    await Promise.all([
      chequearRevisionInterna(),
      chequearRevisionCliente(),
      chequearEstrategiaFutura(),
      chequearOnboarding(),
    ]);
    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('check-overdue error:', err);
    return new Response('error', { status: 500 });
  }
});
