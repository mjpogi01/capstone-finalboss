const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateSupabaseToken, requireRole } = require('../middleware/supabaseAuth');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const router = express.Router();

// Get all branches (public endpoint for customers)
router.get('/', async (req, res) => {
  try {
    const { data: branches, error } = await supabase
      .from('branches')
      .select('id, name, address, city, phone, email, is_main_manufacturing, created_at')
      .order('name');

    if (error) {
      console.error('Supabase error fetching branches:', error);
      return res.status(500).json({ error: 'Failed to fetch branches' });
    }

    const uniqueBranches = [];
    const seenNames = new Set();

    for (const branch of branches ?? []) {
      const key = (branch?.name || '').trim().toLowerCase();
      if (!key || seenNames.has(key)) {
        continue;
      }
      seenNames.add(key);
      uniqueBranches.push(branch);
    }

    res.json(uniqueBranches);
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
});

// Get branch by ID (public endpoint for customers)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: branch, error } = await supabase
      .from('branches')
      .select('id, name, address, city, phone, email, is_main_manufacturing, created_at')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Supabase error fetching branch:', error);
      return res.status(500).json({ error: 'Failed to fetch branch' });
    }

    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    res.json(branch);
  } catch (error) {
    console.error('Error fetching branch:', error);
    res.status(500).json({ error: 'Failed to fetch branch' });
  }
});

module.exports = router;
