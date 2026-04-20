const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../utils/supabase');
const { requireAuth } = require('../middleware/auth');
const { validateRegistration, validateLogin } = require('../middleware/validate');

// POST /api/auth/register
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const { email, password, full_name, matric_number, department, year_of_study } = req.body;

    // 1. Create auth user in Supabase
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true // auto-confirm for this project
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // 2. Assign to group with fewest members (round-robin)
    const { data: groupCounts } = await supabaseAdmin
      .from('profiles')
      .select('group_id')
      .not('group_id', 'is', null);

    const counts = { 1: 0, 2: 0, 3: 0 };
    if (groupCounts) {
      groupCounts.forEach(p => { if (counts[p.group_id] !== undefined) counts[p.group_id]++; });
    }

    // Find the group with the fewest members
    const assignedGroup = Object.entries(counts)
      .sort((a, b) => a[1] - b[1])[0][0];

    // 3. Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        full_name,
        matric_number,
        department: department || null,
        year_of_study: year_of_study || null,
        group_id: parseInt(assignedGroup),
        role: 'student'
      });

    if (profileError) {
      // Clean up: delete the auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return res.status(400).json({ error: profileError.message });
    }

    // 4. Initialise progress tracking
    await supabaseAdmin
      .from('user_progress')
      .insert({ user_id: authData.user.id });

    // 5. Sign in the user to get a session
    const { data: session, error: loginError } = await supabaseAdmin.auth.signInWithPassword({
      email, password
    });

    if (loginError) {
      return res.status(400).json({ error: 'Account created but login failed. Please log in manually.' });
    }

    res.status(201).json({
      message: 'Registration successful',
      user: { id: authData.user.id, email, full_name, group_id: parseInt(assignedGroup) },
      session: session.session
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
    if (error) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Fetch profile
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('*, groups(name)')
      .eq('id', data.user.id)
      .single();
    console.log('PROFILE DEBUG:', { profile, profileErr });

    // Fetch progress
    const { data: progress } = await supabaseAdmin
      .from('user_progress')
      .select('*, groups(name)')
      .eq('user_id', data.user.id)
      .single();

    res.json({
      session: data.session,
      user: profile,
      progress: progress || { pre_assessment_complete: false, training_complete: false, post_assessment_complete: false }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me - get current user profile and progress
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { data: progress } = await supabaseAdmin
      .from('user_progress')
      .select('*, groups(name)')
      .eq('user_id', req.user.id)
      .single();

    res.json({ user: req.user.profile, progress });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

module.exports = router;
