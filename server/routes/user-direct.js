const express = require('express');
const { pool } = require('../lib/db');
const { authenticateSupabaseToken } = require('../middleware/supabaseAuth');

const router = express.Router();

// Get user's address from users table
router.get('/address', authenticateSupabaseToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        id, email, full_name, phone,
        street_address, barangay, city, province, 
        postal_code, address
      FROM users 
      WHERE id = $1
    `, [req.user.id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = rows[0];
    
    // Check if user has address
    if (!user.address) {
      return res.status(404).json({ error: 'No address found' });
    }

    res.json({
      fullName: user.full_name,
      phone: user.phone,
      streetAddress: user.street_address,
      barangay: user.barangay,
      city: user.city,
      province: user.province,
      postalCode: user.postal_code,
      address: user.address
    });
  } catch (error) {
    console.error('Error fetching user address:', error);
    res.status(500).json({ error: 'Failed to fetch address' });
  }
});

// Save user's address to users table
router.post('/address', authenticateSupabaseToken, async (req, res) => {
  try {
    const { fullName, phone, streetAddress, barangay, city, province, postalCode, address } = req.body;

    const { rows } = await pool.query(`
      UPDATE users SET 
        full_name = $2,
        phone = $3,
        street_address = $4,
        barangay = $5,
        city = $6,
        province = $7,
        postal_code = $8,
        address = $9
      WHERE id = $1
      RETURNING id, full_name, phone, address
    `, [req.user.id, fullName, phone, streetAddress, barangay, city, province, postalCode, address]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      fullName: rows[0].full_name,
      phone: rows[0].phone,
      address: rows[0].address
    });
  } catch (error) {
    console.error('Error saving user address:', error);
    res.status(500).json({ error: 'Failed to save address' });
  }
});

// Update user's address in users table
router.put('/address', authenticateSupabaseToken, async (req, res) => {
  try {
    const { fullName, phone, streetAddress, barangay, city, province, postalCode, address } = req.body;

    const { rows } = await pool.query(`
      UPDATE users SET 
        full_name = $2,
        phone = $3,
        street_address = $4,
        barangay = $5,
        city = $6,
        province = $7,
        postal_code = $8,
        address = $9
      WHERE id = $1
      RETURNING id, full_name, phone, address
    `, [req.user.id, fullName, phone, streetAddress, barangay, city, province, postalCode, address]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      fullName: rows[0].full_name,
      phone: rows[0].phone,
      address: rows[0].address
    });
  } catch (error) {
    console.error('Error updating user address:', error);
    res.status(500).json({ error: 'Failed to update address' });
  }
});

module.exports = router;
