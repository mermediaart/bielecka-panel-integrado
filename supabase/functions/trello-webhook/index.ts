// Supabase Edge Function: trello-webhook
// Recibe los webhooks de Trello cuando una tarjeta cambia de lista.
// Deploy: supabase functions deploy trello-webhook --no-verify-jwt
// Registrar en Trello: POST a https://TU-PROYECTO.supabase.co/functions/v1/trello-webhook

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  detectarTipoPrincipal,
  normalizarNombreMarca,
  nombresCoinciden,
  matchFormatoAsignacion,
  tarjetaEsAnteriorAIncorporacion,
  fechaCreacionDesdeIdTrello,
} from '../_shared/normalizacion.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const COLUMNAS_REVISION = {
  'revisión interna': 'Revisión Interna',
  'revision interna': 'Revisión Interna',
  'revisión de cliente': 'Revisión Cliente',
  'revision de cliente': 'Revisión Cliente',
  'revisión cliente': 'Revisión Cliente',
};

Deno.serve(async (req) => {
  if (req.method === 'GET' || req.method === 'HEAD') {
    return new Response('ok', { status: 200 }); // verificación de Trello al registrar el webhook
  }

  try {
    const body = await req.json();
    const action = body?.action;
    if (!action || action.type !== 'updateCard') {
      return new Response('ignored', { status: 200 });
    }

    const listAfter = action.data?.listAfter?.name;
    if (!listAfter) return new Response('no list change', { status: 200 });

    const columnaDetectada = COLUMNAS_REVISION[listAfter.trim().toLowerCase()];
    if (!columnaDetectada) return new Response('not a tracked column', { status: 200 });

    const card = action.data.card;
    const boardName = action.data.board?.name || '';
    const titulo = card?.name || '';
    const tipo = detectarTipoPrincipal(titulo);
    const fechaCreacionTrello = fechaCreacionDesdeIdTrello(card?.id);

    // Resolver el cliente por nombre de tablero, con nombres normalizados
    // (sin acentos/mayúsculas) para no fallar por diferencias de formato.
    const { data: clientes } = await supabase.from('clients').select('id, name, asignaciones, "cmId"');
    const boardNorm = normalizarNombreMarca(boardName);
    const cliente = (clientes || []).find(c => {
      const nombreNorm = normalizarNombreMarca(c.name);
      return boardNorm.includes(nombreNorm) || nombreNorm.includes(boardNorm);
    });

    const { data: profiles } = await supabase.from('profiles').select('id, name, "fechaInicio"');

    // Resolver quién hizo la pieza, cruzando el formato detectado contra
    // clients.asignaciones (el "CONFIG_MARCAS"), y filtrando por fecha de
    // incorporación de esa persona.
    const asignacionMatch = cliente?.asignaciones?.find(a => matchFormatoAsignacion(tipo, a.tipo));
    let asignadoId = null;
    if (asignacionMatch?.responsable) {
      const persona = (profiles || []).find(p => nombresCoinciden(p.name, asignacionMatch.responsable));
      if (persona && !tarjetaEsAnteriorAIncorporacion(fechaCreacionTrello, persona.fechaInicio)) {
        asignadoId = persona.id;
      }
    }

    let cmAsignadaId = null;
    if (tipo !== 'Estrategia' && cliente?.cmId) cmAsignadaId = cliente.cmId;

    await supabase.from('content_cards').upsert({
      id: card.id,
      clientId: cliente?.id || null,
      titulo,
      tipo,
      columna: columnaDetectada,
      fechaEntradaColumna: new Date().toISOString(),
      fechaCreacionTrello,
      cmAsignadaId,
      asignadoId,
      trelloUrl: card.shortUrl || null,
      boardName,
      actualizado: new Date().toISOString(),
    }, { onConflict: 'id' });

    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('trello-webhook error:', err);
    return new Response('error', { status: 200 });
  }
});
