import { supabase } from '../lib/supabase';

/* ── Get manager's assigned parking ─────────────────────── */
export const getMyParking = async (userId) => {
  const { data, error } = await supabase
    .from('parking_locations')
    .select('*')
    .eq('manager_id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
};

/* ── Get stats for a parking ─────────────────────────────
   pending/confirmed/active = current state (all time)
   completed/cancelled/revenue = today only
──────────────────────────────────────────────────────── */
export const getTodayStats = async (parkingId) => {
  const today    = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);

  // Current actionable statuses — no date filter
  const [{ data: current }, { data: todayData }] = await Promise.all([
    supabase
      .from('reservations')
      .select('status')
      .eq('parking_id', parkingId)
      .in('status', ['pending', 'confirmed', 'active']),
    supabase
      .from('reservations')
      .select('status, total_amount')
      .eq('parking_id', parkingId)
      .gte('updated_at', today.toISOString())
      .lt('updated_at', tomorrow.toISOString()),
  ]);

  const cur  = current   || [];
  const tod  = todayData || [];

  return {
    total:     tod.length,
    pending:   cur.filter(r => r.status === 'pending').length,
    active:    cur.filter(r => r.status === 'active').length,
    confirmed: cur.filter(r => r.status === 'confirmed').length,
    completed: tod.filter(r => r.status === 'completed').length,
    cancelled: tod.filter(r => r.status === 'cancelled').length,
    revenue:   tod.filter(r => ['active','completed'].includes(r.status))
                  .reduce((s,r) => s + parseFloat(r.total_amount||0), 0),
  };
};

/* ── Get ALL reservations for parking with search ────────── */
export const getParkingReservations = async (parkingId, { status='', search='', page=1, limit=20 } = {}) => {
  let query = supabase
    .from('reservations')
    .select('*, driver:users!reservations_user_id_fkey(id,name,email,phone)', { count:'exact' })
    .eq('parking_id', parkingId)
    .order('created_at', { ascending: false })
    .range((page-1)*limit, page*limit-1);

  if (status) query = query.eq('status', status);

  const { data, error, count } = await query;
  if (error) throw error;

  // Client-side search across vehicle_number, driver name, phone
  let results = data || [];
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    results = results.filter(r =>
      r.vehicle_number?.toLowerCase().includes(q) ||
      r.driver?.name?.toLowerCase().includes(q) ||
      r.driver?.phone?.toLowerCase().includes(q) ||
      r.driver?.email?.toLowerCase().includes(q) ||
      String(r.id).includes(q)
    );
  }

  return { data: results, total: count || 0 };
};

/* ── Get today's reservations ───────────────────────────── */
export const getTodayReservations = async (parkingId) => {
  const today    = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);

  const { data, error } = await supabase
    .from('reservations')
    .select('*, driver:users!reservations_user_id_fkey(id,name,email,phone)')
    .eq('parking_id', parkingId)
    .gte('start_time', today.toISOString())
    .lt('start_time', tomorrow.toISOString())
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data || [];
};

/* ── Approve reservation ────────────────────────────────── */
export const approveReservation = async (reservationId) => {
  const { error } = await supabase.rpc('manager_approve_reservation', {
    p_reservation_id: reservationId,
  });
  if (error) throw error;
};

/* ── Reject reservation ─────────────────────────────────── */
export const rejectReservation = async (reservationId) => {
  const { error } = await supabase.rpc('manager_reject_reservation', {
    p_reservation_id: reservationId,
  });
  if (error) throw error;
};

/* ── Mark vehicle entry ─────────────────────────────────── */
export const markEntry = async (reservationId) => {
  const { error } = await supabase.rpc('mark_entry', { p_reservation_id: reservationId });
  if (error) throw error;
};

/* ── Mark vehicle exit ──────────────────────────────────── */
export const markExit = async (reservationId) => {
  const { error } = await supabase.rpc('mark_exit', { p_reservation_id: reservationId });
  if (error) throw error;
};

/* ── Update available slots ─────────────────────────────── */
export const updateSlots = async (parkingId, available_slots) => {
  const { error } = await supabase
    .from('parking_locations')
    .update({ available_slots })
    .eq('id', parkingId);
  if (error) throw error;
};

/* ── Owner: search users to assign ─────────────────────── */
export const searchUserByEmail = async (email) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role')
    .ilike('email', `%${email}%`)
    .in('role', ['manager', 'owner'])
    .limit(5);
  if (error) throw error;
  return data || [];
};

/* ── Owner: assign / remove manager ────────────────────── */
export const assignManager = async (parkingId, managerId) => {
  const { error } = await supabase
    .from('parking_locations').update({ manager_id: managerId }).eq('id', parkingId);
  if (error) throw error;
};

export const removeManager = async (parkingId) => {
  const { error } = await supabase
    .from('parking_locations').update({ manager_id: null }).eq('id', parkingId);
  if (error) throw error;
};
