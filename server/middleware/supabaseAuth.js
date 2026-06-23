const pool = require('../config/database');

/**
 * Verifies a Supabase access token by calling Supabase's own auth endpoint.
 * No JWT secret needed — Supabase validates the token itself.
 */
const supabaseProtect = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Not authorized. No token.' });
  }

  const token = header.split(' ')[1];

  try {
    const supabaseUrl  = process.env.SUPABASE_URL;
    const supabaseAnon = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnon) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set in server .env');
    }

    // Ask Supabase to validate the token — returns the auth user if valid
    const authRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey:        supabaseAnon,
      },
    });

    if (!authRes.ok) {
      return res.status(401).json({ success: false, message: 'Invalid or expired session. Please log in again.' });
    }

    const supabaseUser = await authRes.json();
    const authUserId   = supabaseUser.id; // Supabase auth UUID

    // Look up the corresponding public.users record
    const { rows } = await pool.query(
      'SELECT id, name, email, role, is_active FROM public.users WHERE auth_user_id = $1',
      [authUserId]
    );

    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'User profile not found.' });
    }
    if (!rows[0].is_active) {
      return res.status(403).json({ success: false, message: 'Account deactivated.' });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    console.error('supabaseProtect error:', err.message);
    return res.status(401).json({ success: false, message: 'Authentication failed.' });
  }
};

const supabaseAuthorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: `Role '${req.user?.role}' is not authorized.` });
  }
  next();
};

module.exports = { supabaseProtect, supabaseAuthorize };
