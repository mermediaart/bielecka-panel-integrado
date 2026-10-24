import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient.js';

// ----------------------------------------------------------------------------
// useSyncedTable: se comporta exactamente como useState([...]) — los
// componentes existentes ya llaman a setX(nuevoArrayCompleto), setX(prev =>
// ...), etc. Acá adentro, cuando eso pasa, se compara el array viejo contra
// el nuevo y se mandan a Supabase solo los inserts/updates/deletes que
// correspondan. Row Level Security en la base de datos decide, para cada
// usuario, qué filas puede realmente leer o escribir — si el pedido no está
// permitido, Supabase lo rechaza sola.
// ----------------------------------------------------------------------------
export function useSyncedTable(table, { enabled = true } = {}) {
  const [items, setItemsState] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const itemsRef = useRef([]);
  itemsRef.current = items;

  useEffect(() => {
    if (!enabled) { setItemsState([]); setLoaded(true); return; }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from(table).select('*');
      if (cancelled) return;
      if (error) {
        console.error(`Error leyendo ${table}:`, error.message);
        setItemsState([]);
      } else {
        setItemsState(data || []);
      }
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [table, enabled]);

  const setItems = (updater) => {
    const prev = itemsRef.current;
    const next = typeof updater === 'function' ? updater(prev) : updater;
    setItemsState(next); // UI optimista, no espera a la red

    (async () => {
      const prevIds = new Set(prev.map(x => x.id));
      const nextIds = new Set(next.map(x => x.id));

      const toDelete = prev.filter(x => !nextIds.has(x.id));
      const toInsert = next.filter(x => !prevIds.has(x.id));
      const toUpdate = next.filter(x => {
        if (!prevIds.has(x.id)) return false;
        const old = prev.find(p => p.id === x.id);
        return JSON.stringify(old) !== JSON.stringify(x);
      });

      for (const row of toDelete) {
        const { error } = await supabase.from(table).delete().eq('id', row.id);
        if (error) console.error(`Error borrando en ${table}:`, error.message);
      }
      if (toInsert.length) {
        const { error } = await supabase.from(table).insert(toInsert);
        if (error) console.error(`Error insertando en ${table}:`, error.message);
      }
      for (const row of toUpdate) {
        const { error } = await supabase.from(table).update(row).eq('id', row.id);
        if (error) console.error(`Error actualizando en ${table}:`, error.message);
      }
    })();
  };

  return [items, setItems, loaded];
}

// clients y profiles necesitan una fuente distinta según el rol: las Socias
// leen la tabla completa (con datos sensibles); el resto lee una vista
// pública sin esos campos. Row Level Security bloquea igual si alguien
// intentara forzar la tabla completa sin ser Socia.
export function useSyncedClients(isSocia) {
  return useSyncedTableFromSource(isSocia ? 'clients' : 'clients_public', isSocia);
}
export function useSyncedProfiles(isSocia) {
  return useSyncedTableFromSource(isSocia ? 'profiles' : 'profiles_public', isSocia);
}

function useSyncedTableFromSource(source, writable) {
  const [items, setItemsState] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const itemsRef = useRef([]);
  itemsRef.current = items;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from(source).select('*');
      if (cancelled) return;
      if (error) {
        console.error(`Error leyendo ${source}:`, error.message);
        setItemsState([]);
      } else {
        setItemsState(data || []);
      }
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [source]);

  const setItems = (updater) => {
    const prev = itemsRef.current;
    const next = typeof updater === 'function' ? updater(prev) : updater;
    setItemsState(next);

    if (!writable) return; // vista pública de solo lectura: no intenta escribir

    const table = source; // cuando writable=true, source ya es la tabla base
    (async () => {
      const prevIds = new Set(prev.map(x => x.id));
      const nextIds = new Set(next.map(x => x.id));
      const toDelete = prev.filter(x => !nextIds.has(x.id));
      const toInsert = next.filter(x => !prevIds.has(x.id));
      const toUpdate = next.filter(x => {
        if (!prevIds.has(x.id)) return false;
        const old = prev.find(p => p.id === x.id);
        return JSON.stringify(old) !== JSON.stringify(x);
      });
      for (const row of toDelete) {
        const { error } = await supabase.from(table).delete().eq('id', row.id);
        if (error) console.error(`Error borrando en ${table}:`, error.message);
      }
      if (toInsert.length) {
        const { error } = await supabase.from(table).insert(toInsert);
        if (error) console.error(`Error insertando en ${table}:`, error.message);
      }
      for (const row of toUpdate) {
        const { error } = await supabase.from(table).update(row).eq('id', row.id);
        if (error) console.error(`Error actualizando en ${table}:`, error.message);
      }
    })();
  };

  return [items, setItems, loaded];
}

// ----------------------------------------------------------------------------
// Auth: login sin contraseña, por link mágico al mail
// ----------------------------------------------------------------------------
export async function enviarLinkAcceso(email) {
  return supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
}

export async function cerrarSesion() {
  return supabase.auth.signOut();
}

export function useAuthSession() {
  const [session, setSession] = useState(undefined); // undefined = todavía cargando
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  return session;
}

// Busca el profile (perfil de equipo) que corresponde al mail logueado
export function useOwnProfile(session) {
  const [profile, setProfile] = useState(undefined); // undefined = cargando, null = no encontrado
  useEffect(() => {
    if (!session) { setProfile(session === null ? null : undefined); return; }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', session.user.email)
        .maybeSingle();
      if (cancelled) return;
      if (error) { console.error('Error buscando profile:', error.message); setProfile(null); return; }
      setProfile(data || null);
    })();
    return () => { cancelled = true; };
  }, [session]);
  return profile;
}

// Crear una reserva pública (usada por la vista sin login VistaReservarTurnoCliente).
// No requiere sesión — la política de Supabase permite insert anónimo en "reservas".
export async function crearReserva(reserva) {
  return supabase.from('reservas').insert(reserva);
}

// Trae solo id/directoraId/fecha de TODOS los bloques de agenda (sin el texto/motivo),
// para que las Directoras vean disponibilidad entre ellas sin ver el detalle privado.
// Corre server-side vía una función con seguridad propia (ver supabase-schema.sql).
export async function fetchAgendaOcupados() {
  return supabase.rpc('agenda_ocupados');
}
