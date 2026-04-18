// Simple validation helpers — no external dependencies needed

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateRegistration(req, res, next) {
  const { email, password, full_name, matric_number } = req.body;
  const errors = [];

  if (!email || !validateEmail(email)) errors.push('A valid email address is required');
  if (!password || password.length < 6) errors.push('Password must be at least 6 characters');
  if (!full_name || full_name.trim().length < 2) errors.push('Full name is required');
  if (!matric_number || matric_number.trim().length < 3) errors.push('Matric number is required');

  if (req.body.year_of_study) {
    const year = parseInt(req.body.year_of_study);
    if (isNaN(year) || year < 1 || year > 6) errors.push('Year of study must be between 1 and 6');
  }

  if (errors.length > 0) return res.status(400).json({ error: errors.join('. ') });
  next();
}

function validateLogin(req, res, next) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  next();
}

function validateInteraction(req, res, next) {
  const { scenario_id, action_type, assessment_phase } = req.body;
  const validActions = ['opened', 'clicked_link', 'flagged_suspicious', 'marked_safe', 'dismissed'];
  const validPhases = ['pre_training', 'post_training'];

  if (!scenario_id) return res.status(400).json({ error: 'scenario_id is required' });
  if (!action_type || !validActions.includes(action_type))
    return res.status(400).json({ error: `action_type must be one of: ${validActions.join(', ')}` });
  if (!assessment_phase || !validPhases.includes(assessment_phase))
    return res.status(400).json({ error: `assessment_phase must be pre_training or post_training` });
  next();
}

function validateAssessmentComplete(req, res, next) {
  const { assessment_phase } = req.body;
  if (!assessment_phase || !['pre_training', 'post_training'].includes(assessment_phase))
    return res.status(400).json({ error: 'assessment_phase must be pre_training or post_training' });
  next();
}

module.exports = { validateRegistration, validateLogin, validateInteraction, validateAssessmentComplete };
