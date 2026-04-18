const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../utils/supabase');
const { requireAuth } = require('../middleware/auth');

// GET /api/simulation/scenarios/:phase - get assessment scenarios
router.get('/scenarios/:phase', requireAuth, async (req, res) => {
  try {
    const { phase } = req.params; // 'pre' or 'post'
    if (!['pre', 'post'].includes(phase)) {
      return res.status(400).json({ error: 'Phase must be "pre" or "post"' });
    }

    const { data: scenarios, error } = await supabaseAdmin
      .from('phishing_scenarios')
      .select('id, sender_name, sender_email, subject_line, email_body_html, is_phishing, difficulty_level, persuasion_principle')
      .eq('assessment_set', phase);

    if (error) throw error;

    // Shuffle the scenarios so they appear in random order
    const shuffled = (scenarios || []).sort(() => Math.random() - 0.5);

    // Don't reveal is_phishing to the client - strip it and store server-side
    const clientScenarios = shuffled.map(s => ({
      id: s.id,
      sender_name: s.sender_name,
      sender_email: s.sender_email,
      subject_line: s.subject_line,
      email_body_html: s.email_body_html,
      difficulty_level: s.difficulty_level
    }));

    res.json({ phase, scenarios: clientScenarios, total: clientScenarios.length });
  } catch (err) {
    console.error('Scenario fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch scenarios' });
  }
});

// POST /api/simulation/evaluate - check if a decision was correct
router.post('/evaluate', requireAuth, async (req, res) => {
  try {
    const { scenario_id, decision } = req.body; // decision: 'safe' or 'suspicious'

    const { data: scenario, error } = await supabaseAdmin
      .from('phishing_scenarios')
      .select('is_phishing, persuasion_principle, difficulty_level')
      .eq('id', scenario_id)
      .single();

    if (error || !scenario) {
      return res.status(404).json({ error: 'Scenario not found' });
    }

    const isCorrect = (scenario.is_phishing && decision === 'suspicious') ||
                      (!scenario.is_phishing && decision === 'safe');

    res.json({
      correct: isCorrect,
      was_phishing: scenario.is_phishing,
      principle: scenario.persuasion_principle
    });
  } catch (err) {
    console.error('Evaluation error:', err);
    res.status(500).json({ error: 'Evaluation failed' });
  }
});

module.exports = router;
