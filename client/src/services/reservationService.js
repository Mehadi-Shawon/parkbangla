import { supabase } from '../lib/supabase';
import { calcAmount } from '../utils/helpers';

export const create = async ({ parking, vehicleNumber, vehicleType, startTime, endTime, notes }) => {
  const totalAmount = calcAmount(parking.hourly_rate, startTime, endTime);
  const { data, error } = await supabase.rpc('create_reservation', {
    p_parking_id:     parking.id,
    p_vehicle_number: vehicleNumber.toUpperCase(),
    p_vehicle_type:   vehicleType,
    p_start_time:     new Date(startTime).toISOString(),
    p_end_time:       new Date(endTime).toISOString(),
    p_total_amount:   totalAmount,
    p_notes:          notes || null,
  });
  if (error) throw error;
  return data;
};

export const getMyReservations = async ({ status = '', page = 1, limit = 10 } = {}) => {
  let query = supabase
    .from('reservations')
    .select(`*, parking:parking_locations(name, address, hourly_rate, latitude, longitude)`, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (status) query = query.eq('status', status);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data || [], total: count || 0 };
};

export const getOwnerReservations = async ({ status = '', search = '', page = 1, limit = 10, parkingIds = [] } = {}) => {
  if (!parkingIds.length) return { data: [], total: 0 };

  let query = supabase
    .from('reservations')
    .select(`*, parking:parking_locations(name), driver:users!reservations_user_id_fkey(name, phone)`, { count: 'exact' })
    .in('parking_id', parkingIds)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (status) query = query.eq('status', status);
  if (search.trim()) {
    const isId = /^\d+$/.test(search.trim());
    query = isId
      ? query.or(`vehicle_number.ilike.%${search}%,id.eq.${search}`)
      : query.ilike('vehicle_number', `%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data || [], total: count || 0 };
};

export const cancel = async (id) => {
  const { error } = await supabase.rpc('cancel_reservation', { p_reservation_id: id });
  if (error) throw error;
};

export const markEntry = async (id) => {
  const { error } = await supabase.rpc('mark_entry', { p_reservation_id: id });
  if (error) throw error;
};

export const markExit = async (id) => {
  const { error } = await supabase.rpc('mark_exit', { p_reservation_id: id });
  if (error) throw error;
};
