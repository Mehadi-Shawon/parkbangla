import { supabase } from '../lib/supabase';

export const updateProfile = async (userId, { name, phone }) => {
  const { data, error } = await supabase
    .from('users')
    .update({ name, phone })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const changePassword = async (newPassword) => {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
};

export const getVehicles = async (userId) => {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const addVehicle = async (userId, vehicle) => {
  const { data, error } = await supabase
    .from('vehicles')
    .insert({ user_id: userId, ...vehicle, vehicle_number: vehicle.vehicle_number.toUpperCase() })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteVehicle = async (id) => {
  const { error } = await supabase.from('vehicles').delete().eq('id', id);
  if (error) throw error;
};
