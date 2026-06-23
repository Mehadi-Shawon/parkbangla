require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const DEMO_USERS = [
  { email: 'admin@parkeasy.com',  name: 'System Admin',  role: 'admin'  },
  { email: 'alice@example.com',   name: 'Alice Johnson', role: 'driver' },
  { email: 'owner1@example.com',  name: 'ParkPro Inc.',  role: 'owner'  },
];

async function createDemoUsers() {
  const client = await pool.connect();
  console.log('✅ Connected to Supabase\n');

  try {
    for (const u of DEMO_USERS) {

      // 1. Check if auth user already exists
      const { rows: existing } = await client.query(
        `SELECT id FROM auth.users WHERE email = $1`, [u.email]
      );

      let authId;

      if (existing.length) {
        // Update password only
        authId = existing[0].id;
        await client.query(
          `UPDATE auth.users SET encrypted_password = crypt('password123', gen_salt('bf')), updated_at = NOW() WHERE id = $1`,
          [authId]
        );
      } else {
        // Insert new auth user
        const { rows } = await client.query(`
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
            crypt('password123', gen_salt('bf')),
            NOW(), NOW(), NOW(),
            '{"provider":"email","providers":["email"]}',
            $2::jsonb,
            false, '', '', '', ''
          ) RETURNING id
        `, [u.email, JSON.stringify({ name: u.name, role: u.role })]);
        authId = rows[0].id;

        // Insert identity record
        await client.query(`
          INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
          VALUES (gen_random_uuid(), $3::text, $1::uuid, jsonb_build_object('sub', $2::text, 'email', $3::text), 'email', NOW(), NOW(), NOW())
        `, [authId, authId, u.email]);
      }

      // 2. Link auth_user_id in public.users
      await client.query(
        'UPDATE public.users SET auth_user_id = $1 WHERE email = $2',
        [authId, u.email]
      );

      console.log(`  ✅ ${u.role.padEnd(7)} | ${u.email}`);
    }

    console.log('\n🎉 Done! Login with password: password123');
    console.log('\n   admin@parkeasy.com  → Admin Dashboard');
    console.log('   alice@example.com   → Driver Dashboard');
    console.log('   owner1@example.com  → Owner Dashboard');

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    if (err.detail) console.error('   Detail:', err.detail);
  } finally {
    client.release();
    await pool.end();
  }
}

createDemoUsers();
