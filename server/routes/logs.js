const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../utils/supabase');
const { requireAuth } = require('../middleware/auth');
const { validateInteraction, validateAssessmentComplete } = require('../middleware/validate');

// POST /api/logs/interaction - log a single interaction event
router.post('/interaction', requireAuth, validateInteraction, async (req, res) => {
  try {
    const { scenario_id, action_type, assessment_phase, response_time_ms } = req.body;

    const { error } = await supabaseAdmin
      .from('interaction_logs')
      .insert({
        user_id: req.user.id,
        scenario_id,
        action_type,
        assessment_phase,
        response_time_ms: response_time_ms || null
      });

    if (error) throw error;
    res.json({ message: 'Interaction logged' });
  } catch (err) {
    console.error('Log interaction error:', err);
    res.status(500).json({ error: 'Failed to log interaction' });
  }
});

// POST /api/logs/complete-assessment - compute and store assessment results
router.post('/complete-assessment', requireAuth, validateAssessmentComplete, async (req, res) => {
  try {
    const { assessment_phase } = req.body; // 'pre_training' or 'post_training'
    const userId = req.user.id;
    const setType = assessment_phase === 'pre_training' ? 'pre' : 'post';

    // Get all scenarios in this assessment set
    const { data: scenarios } = await supabaseAdmin
      .from('phishing_scenarios')
      .select('id, is_phishing')
      .eq('assessment_set', setType);

    if (!scenarios || scenarios.length === 0) {
      return res.status(400).json({ error: 'No scenarios found for this assessment set' });
    }

    // Get all interaction logs for this user in this phase
    const { data: logs } = await supabaseAdmin
      .from('interaction_logs')
      .select('scenario_id, action_type, response_time_ms')
      .eq('user_id', userId)
      .eq('assessment_phase', assessment_phase);

    const scenarioMap = {};
    scenarios.forEach(s => { scenarioMap[s.id] = s.is_phishing; });

    // Build a map of the user's final action per scenario
    const userActions = {};
    const responseTimes = [];
    (logs || []).forEach(log => {
      // Keep the most decisive action per scenario
      if (log.action_type === 'flagged_suspicious' || log.action_type === 'marked_safe' || log.action_type === 'clicked_link') {
        userActions[log.scenario_id] = log.action_type;
        if (log.response_time_ms) responseTimes.push(log.response_time_ms);
      }
    });

    // Compute metrics
    let totalPhishing = 0, phishingDetected = 0, phishingMissed = 0, phishingClicked = 0;
    let totalLegitimate = 0, legitimateCorrect = 0, legitimateFlagged = 0;

    scenarios.forEach(s => {
      const action = userActions[s.id];
      if (s.is_phishing) {
        totalPhishing++;
        if (action === 'flagged_suspicious') phishingDetected++;
        else if (action === 'clicked_link') { phishingClicked++; phishingMissed++; }
        else phishingMissed++;
      } else {
        totalLegitimate++;
        if (action === 'marked_safe' || !action) legitimateCorrect++;
        else if (action === 'flagged_suspicious') legitimateFlagged++;
      }
    });

    const avgResponseTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;

    // Upsert assessment results
    const { error: upsertError } = await supabaseAdmin
      .from('assessment_results')
      .upsert({
        user_id: userId,
        assessment_phase,
        total_phishing: totalPhishing,
        phishing_detected: phishingDetected,
        phishing_missed: phishingMissed,
        phishing_clicked: phishingClicked,
        total_legitimate: totalLegitimate,
        legitimate_correct: legitimateCorrect,
        legitimate_flagged: legitimateFlagged,
        avg_response_time_ms: avgResponseTime,
        computed_at: new Date().toISOString()
      }, { onConflict: 'user_id,assessment_phase' });

    if (upsertError) throw upsertError;

    // Update progress
    const progressField = assessment_phase === 'pre_training'
      ? 'pre_assessment_complete'
      : 'post_assessment_complete';

    await supabaseAdmin
      .from('user_progress')
      .update({ [progressField]: true, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    res.json({
      message: 'Assessment completed',
      results: {
        detection_rate: totalPhishing > 0 ? Math.round((phishingDetected / totalPhishing) * 100) : 0,
        click_through_rate: totalPhishing > 0 ? Math.round((phishingClicked / totalPhishing) * 100) : 0,
        false_positive_rate: totalLegitimate > 0 ? Math.round((legitimateFlagged / totalLegitimate) * 100) : 0,
        avg_response_time_ms: avgResponseTime
      }
    });
  } catch (err) {
    console.error('Complete assessment error:', err);
    res.status(500).json({ error: 'Failed to compute assessment results' });
  }
});

// GET /api/logs/results - get user's assessment results
router.get('/results', requireAuth, async (req, res) => {
  try {
    const { data: results, error } = await supabaseAdmin
      .from('assessment_results')
      .select('*')
      .eq('user_id', req.user.id)
      .order('assessment_phase');

    if (error) throw error;
    res.json({ results: results || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

module.exports = router;
