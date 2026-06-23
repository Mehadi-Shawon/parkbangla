const router = require('express').Router();
const pool   = require('../config/database');
const { supabaseProtect, supabaseAuthorize } = require('../middleware/supabaseAuth');

/**
 * POST /api/managers/create
 * Owner creates a manager account with email + password.
 * Uses the postgres superuser connection (same as createDemoUsers.js)
 * which CAN write to auth.users — proven to work.
 */
router.post('/create', supabaseProtect, supabaseAuthorize('owner', 'admin'), async (req, res, next) => {
  const { name, email, password, parking_id } = req.body;

  if (!name || !email || !password || !parking_id) {
    return res.status(400).json({ success: false, message: 'name, email, password and parking_id are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify the parking belongs to this owner (skip check for admin)
    if (req.user.role === 'owner') {
      const { rows } = await client.query(
        'SELECT id FROM public.parking_locations WHERE id = $1 AND owner_id = $2',
        [parking_id, req.user.id]
      );
      if (!rows.length) {
        await client.query('ROLLBACK');
        return res.status(403).json({ success: false, message: 'Parking not found or not yours.' });
      }
    }

    // Check if auth user already exists
    const existAuth = await client.query('SELECT id FROM auth.users WHERE email = $1', [email]);
    let authId;

    if (existAuth.rows.length) {
      authId = existAuth.rows[0].id;
      // Just update the password
      await client.query(
        "UPDATE auth.users SET encrypted_password = crypt($1, gen_salt('bf')), updated_at = NOW() WHERE id = $2",
        [password, authId]
      );
    } else {
      // Create new Supabase Auth user
      const { rows: authRows } = await client.query(`
        INSERT INTO auth.users (
          id, instance_id, aud, role, email,
          encrypted_password, email_confirmed_at,
          created_at, updated_at,
          raw_app_meta_data, raw_user_meta_data,
          is_super_admin, confirmation_token,
          email_change, email_change_token_new, recovery_token
        ) VALUES (
          gen_random_uuid(),
          '00000000-0000-0000-0000-000000000000',
          'authenticated', 'authenticated', $1,
          crypt($2, gen_salt('bf')),
          NOW(), NOW(), NOW(),
          '{"provider":"email","providers":["email"]}',
          $3::jsonb,
          false, '', '', '', ''
        ) RETURNING id
      `, [email, password, JSON.stringify({ name, role: 'manager' })]);

      authId = authRows[0].id;

      // Create auth identity (required for email/password login)
      await client.query(`
        INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
        VALUES (gen_random_uuid(), $1, $2, $3::jsonb, 'email', NOW(), NOW(), NOW())
      `, [email, authId, JSON.stringify({ sub: authId, email })]);
    }

    // Create / update public.users record
    const { rows: userRows } = await client.query(`
      INSERT INTO public.users (name, email, password, role, auth_user_id)
      VALUES ($1, $2, 'supabase_auth', 'manager', $3)
      ON CONFLICT (email) DO UPDATE
        SET name = EXCLUDED.name,
            role = 'manager',
            auth_user_id = $3
      RETURNING id
    `, [name, email, authId]);

    const userId = userRows[0].id;

    // Assign manager to parking
    await client.query(
      'UPDATE public.parking_locations SET manager_id = $1 WHERE id = $2',
      [userId, parking_id]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: `Manager account created for ${name}!`, user_id: userId });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
