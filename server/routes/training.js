const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../utils/supabase');
const { requireAuth } = require('../middleware/auth');

// GET /api/training/module - get the training module for current user's group
router.get('/module', requireAuth, async (req, res) => {
  try {
    const groupId = req.user.profile.group_id;

    const { data: modules, error } = await supabaseAdmin
      .from('training_modules')
      .select('*')
      .eq('group_id', groupId)
      .order('display_order', { ascending: true });

    if (error) throw error;

    res.json({
      group_name: req.user.profile.groups?.name || 'Unknown',
      modules: modules || []
    });
  } catch (err) {
    console.error('Training fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch training content' });
  }
});

// GET /api/training/explore/:groupId - explore any training module (after study completion)
router.get('/explore/:groupId', requireAuth, async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    if (![1, 2, 3].includes(groupId)) {
      return res.status(400).json({ error: 'Invalid group ID' });
    }

    // Fetch the group name
    const { data: group } = await supabaseAdmin
      .from('groups')
      .select('name')
      .eq('id', groupId)
      .single();

    const { data: modules, error } = await supabaseAdmin
      .from('training_modules')
      .select('*')
      .eq('group_id', groupId)
      .order('display_order', { ascending: true });

    if (error) throw error;

    res.json({
      group_name: group?.name || 'Unknown',
      modules: modules || []
    });
  } catch (err) {
    console.error('Explore training error:', err);
    res.status(500).json({ error: 'Failed to fetch training content' });
  }
});

// POST /api/training/complete - mark training as complete
router.post('/complete', requireAuth, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('user_progress')
      .update({ training_complete: true, updated_at: new Date().toISOString() })
      .eq('user_id', req.user.id);

    if (error) throw error;

    res.json({ message: 'Training marked as complete' });
  } catch (err) {
    console.error('Training complete error:', err);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

module.exports = router;