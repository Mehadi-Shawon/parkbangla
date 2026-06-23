import { supabase } from '../lib/supabase';

/* ── Action metadata ─────────────────────────────────────
   Used by the UI to render human-readable descriptions.
──────────────────────────────────────────────────────── */
export const ACTION_META = {
  'reservation.created':    { label: 'Created a reservation',       color: '#3b82f6', bg: '#eff6ff',  category: 'reservation' },
  'reservation.cancelled':  { label: 'Cancelled a reservation',     color: '#ef4444', bg: '#fef2f2',  category: 'reservation' },
  'reservation.entry':      { label: 'Marked vehicle entry',        color: '#22c55e', bg: '#f0fdf4',  category: 'reservation' },
  'reservation.exit':       { label: 'Marked vehicle exit',         color: '#10b981', bg: '#ecfdf5',  category: 'reservation' },
  'parking.created':        { label: 'Added a parking location',    color: '#6366f1', bg: '#eef2ff',  category: 'parking'     },
  'parking.updated':        { label: 'Updated a parking location',  color: '#8b5cf6', bg: '#f5f3ff',  category: 'parking'     },
  'parking.approved':       { label: 'Approved a parking location', color: '#22c55e', bg: '#f0fdf4',  category: 'parking'     },
  'parking.rejected':       { label: 'Rejected a parking location', color: '#ef4444', bg: '#fef2f2',  category: 'parking'     },
  'parking.deleted':        { label: 'Deleted a parking location',  color: '#ef4444', bg: '#fef2f2',  category: 'parking'     },
  'manager.assigned':       { label: 'Assigned a manager',          color: '#8b5cf6', bg: '#f5f3ff',  category: 'manager'     },
  'manager.removed':        { label: 'Removed a manager',           color: '#f97316', bg: '#fff7ed',  category: 'manager'     },
  'user.activated':         { label: 'Activated a user account',    color: '#22c55e', bg: '#f0fdf4',  category: 'user'        },
  'user.deactivated':       { label: 'Deactivated a user account',  color: '#ef4444', bg: '#fef2f2',  category: 'user'        },
};

export const CATEGORIES = [
  { key: '',            label: 'All Activity'  },
  { key: 'reservation', label: 'Reservations'  },
  { key: 'parking',     label: 'Parking'       },
  { key: 'manager',     label: 'Managers'      },
  { key: 'user',        label: 'Users'         },
];

/* ── Log an activity (fire-and-forget, never throws) ──── */
export const log = async ({ action, entityType = null, entityId = null, meta = {} }) => {
  try {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return;

    const { data: profile } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', authData.user.id)
      .single();

    if (!profile) return;

    await supabase.from('activity_logs').insert({
      actor_id:    profile.id,
      action,
      entity_type: entityType,
      entity_id:   entityId   || null,
      meta,
    });
  } catch {
    // Never block the main action — logging is best-effort
  }
};

/* ── Fetch activity logs (admin) ─────────────────────── */
export const getActivity = async ({ category = '', page = 1, limit = 30 } = {}) => {
  let query = supabase
    .from('activity_logs')
    .select('*, actor:users!activity_logs_actor_id_fkey(name, email, role)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (category) {
    const actions = Object.entries(ACTION_META)
      .filter(([, m]) => m.category === category)
      .map(([k]) => k);
    if (actions.length) query = query.in('action', actions);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data || [], total: count || 0 };
};
