import { supabase } from '../lib/supabase';

export const getAll = async ({ search = '', page = 1, limit = 20 } = {}) => {
  let query = supabase
    .from('parking_locations')
    .select('*, owner:users!parking_locations_owner_id_fkey(name, phone, email)', { count: 'exact' })
    .eq('status', 'approved')
    .order('available_slots', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (search) {
    query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%,city.ilike.%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data || [], total: count || 0 };
};

export const getById = async (id) => {
  const { data, error } = await supabase
    .from('parking_locations')
    .select('*, owner:users!parking_locations_owner_id_fkey(name, phone, email)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
};

export const getOwnerParkings = async (ownerId) => {
  const { data, error } = await supabase
    .from('parking_locations')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const create = async (payload) => {
  const { data, error } = await supabase
    .from('parking_locations')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const update = async (id, payload) => {
  const { data, error } = await supabase
    .from('parking_locations')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateAvailability = async (id, available_slots) => {
  const { error } = await supabase
    .from('parking_locations')
    .update({ available_slots })
    .eq('id', id);
  if (error) throw error;
};

export const remove = async (id) => {
  const { error } = await supabase
    .from('parking_locations')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

export const getOwnerStats = async (ownerId) => {
  const { data: locs } = await supabase
    .from('parking_locations')
    .select('id, total_slots, available_slots')
    .eq('owner_id', ownerId)
    .eq('status', 'approved');

  const total_locations  = locs?.length || 0;
  const total_slots      = locs?.reduce((s, l) => s + l.total_slots, 0) || 0;
  const available_slots  = locs?.reduce((s, l) => s + l.available_slots, 0) || 0;
  const ids              = locs?.map(l => l.id) || [];

  let total_reservations = 0, active_reservations = 0, total_revenue = 0;
  if (ids.length) {
    const { data: res } = await supabase
      .from('reservations')
      .select('status, total_amount')
      .in('parking_id', ids);

    total_reservations  = res?.length || 0;
    active_reservations = res?.filter(r => r.status === 'active').length || 0;
    total_revenue       = res?.filter(r => ['active','completed'].includes(r.status))
                             .reduce((s, r) => s + parseFloat(r.total_amount || 0), 0) || 0;
  }

  return { total_locations, total_slots, available_slots, total_reservations, active_reservations, total_revenue };
};
