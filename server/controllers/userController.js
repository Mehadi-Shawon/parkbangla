const pool = require('../config/database');

// GET /api/users/profile
exports.getProfile = async (req, res, next) => {
  try {
    const { rows }    = await pool.query(
      'SELECT id, name, email, phone, role, avatar, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    const { rows: vehicles } = await pool.query(
      'SELECT * FROM vehicles WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ success: true, data: { ...rows[0], vehicles } });
  } catch (err) {
    next(err);
  }
};

// PUT /api/users/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, avatar } = req.body;
    await pool.query(
      `UPDATE users SET
         name   = COALESCE($1, name),
         phone  = COALESCE($2, phone),
         avatar = COALESCE($3, avatar)
       WHERE id = $4`,
      [name || null, phone || null, avatar || null, req.user.id]
    );
    const { rows } = await pool.query(
      'SELECT id, name, email, phone, role, avatar, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json({ success: true, message: 'Profile updated.', data: rows[0] });
  } catch (err) {
    next(err);
  }
};

// GET /api/users/vehicles
exports.getVehicles = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM vehicles WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// POST /api/users/vehicles
exports.addVehicle = async (req, res, next) => {
  try {
    const { vehicle_number, vehicle_type, make, model, color } = req.body;
    const { rows: [{ id }] } = await pool.query(
      'INSERT INTO vehicles (user_id, vehicle_number, vehicle_type, make, model, color) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
      [req.user.id, vehicle_number.toUpperCase(), vehicle_type || 'car', make || null, model || null, color || null]
    );
    const { rows: [vehicle] } = await pool.query('SELECT * FROM vehicles WHERE id = $1', [id]);
    res.status(201).json({ success: true, message: 'Vehicle added.', data: vehicle });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'Vehicle already registered.' });
    }
    next(err);
  }
};

// DELETE /api/users/vehicles/:id
exports.deleteVehicle = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id FROM vehicles WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    await pool.query('DELETE FROM vehicles WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Vehicle removed.' });
  } catch (err) {
    next(err);
  }
};
