const { supabaseAdmin } = require('../utils/supabase');

async function retryFetch(fn, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`Retry ${i + 1}/${retries} after error: ${err.message}`);
      await new Promise(r => setTimeout(r, delay * (i + 1)));
    }
  }
}

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const { data: { user }, error } = await retryFetch(() =>
      supabaseAdmin.auth.getUser(token)
    );

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { data: profile, error: profileErr } = await retryFetch(() =>
      supabaseAdmin
        .from('profiles')
        .select('*, groups(name)')
        .eq('id', user.id)
        .single()
    );

    console.log('PROFILE DEBUG:', { profile, profileErr });

    if (profileErr || !profile) {
      return res.status(401).json({ error: 'User profile not found' });
    }

    req.user = { ...user, profile };
    req.accessToken = token;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    res.status(503).json({ error: 'Temporary connection issue. Please try again.' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.profile.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };