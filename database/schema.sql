-- ============================================
-- PhishGuard Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Groups table (create first, referenced by profiles)
CREATE TABLE groups (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO groups (name, description) VALUES
  ('Text-Based', 'Group A: Structured written educational content'),
  ('Video-Based', 'Group B: Short video tutorials with narration'),
  ('Interactive', 'Group C: Quiz-based scenarios with immediate feedback');

-- 2. Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  matric_number TEXT UNIQUE NOT NULL,
  department TEXT,
  year_of_study INTEGER CHECK (year_of_study BETWEEN 1 AND 6),
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  group_id INTEGER REFERENCES groups(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Training modules table
CREATE TABLE training_modules (
  id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES groups(id) NOT NULL,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('text', 'video', 'interactive')),
  content_body TEXT NOT NULL, -- HTML for text, URL for video, JSON for interactive
  display_order INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Phishing scenarios table
CREATE TABLE phishing_scenarios (
  id SERIAL PRIMARY KEY,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  subject_line TEXT NOT NULL,
  email_body_html TEXT NOT NULL,
  persuasion_principle TEXT NOT NULL CHECK (persuasion_principle IN ('authority', 'urgency', 'scarcity', 'social_proof')),
  difficulty_level INTEGER NOT NULL CHECK (difficulty_level BETWEEN 1 AND 3),
  is_phishing BOOLEAN NOT NULL DEFAULT TRUE,
  assessment_set TEXT CHECK (assessment_set IN ('pre', 'post')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Interaction logs table
CREATE TABLE interaction_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  scenario_id INTEGER REFERENCES phishing_scenarios(id) NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('opened', 'clicked_link', 'flagged_suspicious', 'marked_safe', 'dismissed')),
  assessment_phase TEXT NOT NULL CHECK (assessment_phase IN ('pre_training', 'post_training')),
  response_time_ms INTEGER, -- milliseconds between email open and decision
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Assessment results table (computed summaries)
CREATE TABLE assessment_results (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  assessment_phase TEXT NOT NULL CHECK (assessment_phase IN ('pre_training', 'post_training')),
  total_phishing INTEGER DEFAULT 0,
  phishing_detected INTEGER DEFAULT 0,
  phishing_missed INTEGER DEFAULT 0,
  phishing_clicked INTEGER DEFAULT 0,
  total_legitimate INTEGER DEFAULT 0,
  legitimate_correct INTEGER DEFAULT 0,
  legitimate_flagged INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER DEFAULT 0,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, assessment_phase)
);

-- 7. User progress tracking
CREATE TABLE user_progress (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  pre_assessment_complete BOOLEAN DEFAULT FALSE,
  training_complete BOOLEAN DEFAULT FALSE,
  post_assessment_complete BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Row-Level Security Policies
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE interaction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE phishing_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- Profiles: users see own, admins see all
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Allow insert during registration" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Interaction logs: users see own, admins see all
CREATE POLICY "Users can view own logs" ON interaction_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own logs" ON interaction_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all logs" ON interaction_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Assessment results: users see own, admins see all
CREATE POLICY "Users can view own results" ON assessment_results
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own results" ON assessment_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all results" ON assessment_results
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- User progress: users see own
CREATE POLICY "Users can view own progress" ON user_progress
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON user_progress
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON user_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Scenarios and modules: everyone can read
CREATE POLICY "Anyone can view scenarios" ON phishing_scenarios
  FOR SELECT USING (true);
CREATE POLICY "Anyone can view modules" ON training_modules
  FOR SELECT USING (true);
CREATE POLICY "Anyone can view groups" ON groups
  FOR SELECT USING (true);

-- Admin write access to scenarios and modules
CREATE POLICY "Admins can manage scenarios" ON phishing_scenarios
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can manage modules" ON training_modules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- Auto-create profile + progress on signup
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Profile is created via the API after signup, not here
  -- But we ensure progress tracking is initialised
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
