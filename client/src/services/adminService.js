import { supabase } from '../lib/supabase';

export const getStats = async () => {
  const [usersRes, parkingRes, resvRes, chartRes] = await Promise.all([
    supabase.from('users').select('role'),
    supabase.from('parking_locations').select('status'),
    supabase.from('reservations').select('status, total_amount'),
    supabase.from('reservations').select('created_at').gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
  ]);

  const users    = usersRes.data    || [];
  const parkings = parkingRes.data  || [];
  const resvs    = resvRes.data     || [];
  const recent   = chartRes.data    || [];

  // Build 7-day chart
  const chartMap = {};
  recent.forEach(r => {
    const date = r.created_at.slice(0, 10);
    chartMap[date] = (chartMap[date] || 0) + 1;
  });
  const chart = Object.entries(chartMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    users: {
      total:   users.length,
      drivers: users.filter(u => u.role === 'driver').length,
      owners:  users.filter(u => u.role === 'owner').length,
    },
    parkings: {
      total:    parkings.length,
      approved: parkings.filter(p => p.status === 'approved').length,
      pending:  parkings.filter(p => p.status === 'pending').length,
    },
    reservations: {
      total:   resvs.length,
      active:  resvs.filter(r => r.status === 'active').length,
      revenue: resvs.filter(r => ['active','completed'].includes(r.status))
                    .reduce((s, r) => s + parseFloat(r.total_amount || 0), 0),
    },
    chart,
  };
};

export const getAllUsers = async ({ search = '', role = '', page = 1, limit = 15 } = {}) => {
  let query = supabase
    .from('users')
    .select('id, name, email, phone, role, is_active, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (role)   query = query.eq('role', role);
  if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data || [], total: count || 0 };
};

export const setUserActive = async (id, is_active) => {
  const { error } = await supabase.from('users').update({ is_active }).eq('id', id);
  if (error) throw error;
};

export const getAllParkings = async ({ status = '', search = '', page = 1, limit = 15 } = {}) => {
  let query = supabase
    .from('parking_locations')
    .select('*, owner:users!parking_locations_owner_id_fkey(name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (status) query = query.eq('status', status);
  if (search) query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%`);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data || [], total: count || 0 };
};

export const setParkingStatus = async (id, status) => {
  const { error } = await supabase.from('parking_locations').update({ status }).eq('id', id);
  if (error) throw error;
};

export const getAllReservations = async ({ status = '', fromDate = '', toDate = '', page = 1, limit = 15 } = {}) => {
  let query = supabase
    .from('reservations')
    .select(`*, parking:parking_locations(name), driver:users!reservations_user_id_fkey(name, email)`, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (status)   query = query.eq('status', status);
  if (fromDate) query = query.gte('created_at', fromDate);
  if (toDate)   query = query.lt('created_at', toDate);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data || [], total: count || 0 };
};
