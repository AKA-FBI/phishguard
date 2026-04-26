const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../utils/supabase');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/admin/dashboard - aggregated metrics per group
router.get('/dashboard', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Get all assessment results with group info
    const { data: results, error } = await supabaseAdmin
      .from('assessment_results')
      .select('*, profiles!inner(group_id, groups(name))');

    if (error) throw error;

    // Aggregate by group and phase
    const groupStats = {};

    (results || []).forEach(r => {
      const groupName = r.profiles?.groups?.name || 'Unknown';
      const phase = r.assessment_phase;
      const key = `${groupName}_${phase}`;

      if (!groupStats[key]) {
        groupStats[key] = {
          group: groupName,
          phase,
          count: 0,
          total_detection_rate: 0,
          total_ctr: 0,
          total_fpr: 0,
          total_response_time: 0
        };
      }

      const gs = groupStats[key];
      gs.count++;

      const detectionRate = r.total_phishing > 0
        ? (r.phishing_detected / r.total_phishing) * 100 : 0;
      const ctr = r.total_phishing > 0
        ? (r.phishing_clicked / r.total_phishing) * 100 : 0;
      const fpr = r.total_legitimate > 0
        ? (r.legitimate_flagged / r.total_legitimate) * 100 : 0;

      gs.total_detection_rate += detectionRate;
      gs.total_ctr += ctr;
      gs.total_fpr += fpr;
      gs.total_response_time += r.avg_response_time_ms || 0;
    });

    // Compute averages
    const dashboard = Object.values(groupStats).map(gs => ({
      group: gs.group,
      phase: gs.phase,
      participants: gs.count,
      avg_detection_rate: gs.count > 0 ? Math.round(gs.total_detection_rate / gs.count * 10) / 10 : 0,
      avg_click_through_rate: gs.count > 0 ? Math.round(gs.total_ctr / gs.count * 10) / 10 : 0,
      avg_false_positive_rate: gs.count > 0 ? Math.round(gs.total_fpr / gs.count * 10) / 10 : 0,
      avg_response_time_ms: gs.count > 0 ? Math.round(gs.total_response_time / gs.count) : 0
    }));

    res.json({ dashboard });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// GET /api/admin/participation - participation status overview
router.get('/participation', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, matric_number, department, group_id, groups(name)')
      .eq('role', 'student');

    const { data: progress } = await supabaseAdmin
      .from('user_progress')
      .select('*');

    const progressMap = {};
    (progress || []).forEach(p => { progressMap[p.user_id] = p; });

    const participants = (profiles || []).map(p => ({
      id: p.id,
      name: p.full_name,
      matric: p.matric_number,
      department: p.department,
      group: p.groups?.name || 'Unassigned',
      pre_complete: progressMap[p.id]?.pre_assessment_complete || false,
      training_complete: progressMap[p.id]?.training_complete || false,
      post_complete: progressMap[p.id]?.post_assessment_complete || false
    }));

    const summary = {
      total_registered: participants.length,
      pre_complete: participants.filter(p => p.pre_complete).length,
      training_complete: participants.filter(p => p.training_complete).length,
      post_complete: participants.filter(p => p.post_complete).length,
      fully_complete: participants.filter(p => p.pre_complete && p.training_complete && p.post_complete).length
    };

    res.json({ summary, participants });
  } catch (err) {
    console.error('Participation error:', err);
    res.status(500).json({ error: 'Failed to fetch participation data' });
  }
});

// GET /api/admin/export - CSV export of anonymised data
router.get('/export', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data: results } = await supabaseAdmin
      .from('assessment_results')
      .select('*, profiles!inner(group_id, groups(name), department, year_of_study)');

    if (!results || results.length === 0) {
      return res.status(404).json({ error: 'No data to export' });
    }

    // Build CSV
    let csvRows = [
      'participant_code,group,department,year_of_study,phase,total_phishing,phishing_detected,phishing_missed,phishing_clicked,total_legitimate,legitimate_correct,legitimate_flagged,avg_response_time_ms'
    ];

    // Create anonymous codes
    const userCodes = {};
    let codeCounter = 1;

    results.forEach(r => {
      if (!userCodes[r.user_id]) {
        userCodes[r.user_id] = `P${String(codeCounter++).padStart(3, '0')}`;
      }

      csvRows.push([
        userCodes[r.user_id],
        r.profiles?.groups?.name || '',
        r.profiles?.department || '',
        r.profiles?.year_of_study || '',
        r.assessment_phase,
        r.total_phishing,
        r.phishing_detected,
        r.phishing_missed,
        r.phishing_clicked,
        r.total_legitimate,
        r.legitimate_correct,
        r.legitimate_flagged,
        r.avg_response_time_ms
      ].join(','));
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=phishguard_data_export.csv');
    res.send(csvRows.join('\n'));
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Export failed' });
  }
});

// DELETE /api/admin/user/:userId - delete a user and all associated data
router.delete('/user/:userId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Delete in order: logs first, then results, progress, profile, then auth user
    await supabaseAdmin.from('assessment_results').delete().eq('user_id', userId);
    await supabaseAdmin.from('interaction_logs').delete().eq('user_id', userId);
    await supabaseAdmin.from('user_progress').delete().eq('user_id', userId);
    await supabaseAdmin.from('profiles').delete().eq('id', userId);
    await supabaseAdmin.auth.admin.deleteUser(userId);

    res.json({ message: 'User and all associated data deleted' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// DELETE /api/admin/users/all - delete all student data (keeps admins)
router.delete('/users/all', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Get all student profiles (not admins)
    const { data: students } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('role', 'student');

    if (!students || students.length === 0) {
      return res.json({ message: 'No student data to clear', deleted: 0 });
    }

    const studentIds = students.map(s => s.id);

    // Delete all associated data
    await supabaseAdmin.from('assessment_results').delete().in('user_id', studentIds);
    await supabaseAdmin.from('interaction_logs').delete().in('user_id', studentIds);
    await supabaseAdmin.from('user_progress').delete().in('user_id', studentIds);
    await supabaseAdmin.from('profiles').delete().in('id', studentIds);

    // Delete auth users one by one
    for (const id of studentIds) {
      await supabaseAdmin.auth.admin.deleteUser(id);
    }

    res.json({ message: `All student data cleared`, deleted: studentIds.length });
  } catch (err) {
    console.error('Clear all error:', err);
    res.status(500).json({ error: 'Failed to clear student data' });
  }
});

module.exports = router;
