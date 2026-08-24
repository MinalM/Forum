import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export const ROLES = [
  { id: 'ml-engineer', label: 'ML Engineer' },
  { id: 'data-scientist', label: 'Data Scientist' },
  { id: 'mlops', label: 'MLOps / Platform' },
  { id: 'research', label: 'Research' },
  { id: 'still-deciding', label: 'Still deciding' }
];

export const SKILLS = [
  { id: 'python', label: 'Python' },
  { id: 'sql', label: 'SQL' },
  { id: 'pandas', label: 'pandas' },
  { id: 'pytorch', label: 'PyTorch' },
  { id: 'stats', label: 'Statistics' },
  { id: 'web', label: 'Web / backend' }
];

// 'Nothing yet' is a mutually-exclusive fourth state alongside any real
// skill selection, not a skill itself - it never appears in the persisted
// skills list.
export const NOTHING_YET = 'none';

// Illustrative only - the real personalised ranking is a later backlog
// item ("For you" ranking). This mirrors the Onboarding.dc.html mock so the
// preview shown here matches what that item will eventually query for.
const PREVIEWS_BY_ROLE = {
  'ml-engineer': [
    { title: 'Transitioning from Data Analysis to ML Engineering', badge: 'Solved', kind: 'solved', meta: '41 answers · 2.2k views' },
    { title: 'How do I show ML work when my job title still says "Analyst"?', badge: 'Needs an answer', kind: 'open', meta: 'asked 2 hours ago' },
    { title: 'What does the on-call reality look like on an ML team?', badge: 'Needs an answer', kind: 'open', meta: 'asked 1 day ago' }
  ],
  'data-scientist': [
    { title: 'Portfolio Projects for AI Job Applications', badge: 'Solved', kind: 'solved', meta: '23 answers · 1.4k views' },
    { title: 'Case study rounds: what are they really testing?', badge: 'Needs an answer', kind: 'open', meta: 'asked 6 hours ago' },
    { title: 'Online Courses for NLP Specialization', badge: 'Resource', kind: 'neutral', meta: '12 answers · 934 views' }
  ],
  mlops: [
    { title: 'Model monitoring on a team of one — what is the minimum?', badge: 'Needs an answer', kind: 'open', meta: 'asked 4 hours ago' },
    { title: 'Getting Started with Machine Learning infrastructure', badge: 'Solved', kind: 'solved', meta: '24 answers · 2.6k views' },
    { title: 'Best Deep Learning Frameworks for production serving', badge: 'Resource', kind: 'neutral', meta: '31 answers · 3.4k views' }
  ],
  research: [
    { title: 'Is a master’s worth it if I already ship models at work?', badge: 'Needs an answer', kind: 'open', meta: 'asked 7 hours ago' },
    { title: 'Reading papers without a maths background — a route in', badge: 'Solved', kind: 'solved', meta: '27 answers · 1.9k views' },
    { title: 'First-author work outside a lab: does it count?', badge: 'Needs an answer', kind: 'open', meta: 'asked 2 days ago' }
  ],
  'still-deciding': [
    { title: 'The four AI/ML jobs people mean when they say "AI job"', badge: 'Solved', kind: 'solved', meta: '52 answers · 4.1k views' },
    { title: 'Getting Started with Machine Learning', badge: 'Resource', kind: 'neutral', meta: '18 answers · 1.1k views' },
    { title: 'What did your first six months of learning look like?', badge: 'Needs an answer', kind: 'open', meta: 'asked 9 hours ago' }
  ]
};

const BADGE_CLASS_BY_KIND = {
  solved: 'badge badge-success',
  open: 'badge badge-warning',
  neutral: 'badge badge-info'
};

const Onboarding = () => {
  useDocumentTitle('Get Started');
  const { user, updateProfile } = useAuth();
  const { setAlert } = useAlert();
  const navigate = useNavigate();

  const [role, setRole] = useState(null);
  const [skills, setSkills] = useState({});
  const [saving, setSaving] = useState(false);

  // Already done this before (or dismissed it) - never show it again.
  useEffect(() => {
    if (user && user.onboardingCompleted) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const toggleSkill = id => {
    setSkills(prev => {
      if (id === NOTHING_YET) {
        return prev[NOTHING_YET] ? {} : { [NOTHING_YET]: true };
      }
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = true;
      }
      delete next[NOTHING_YET];
      return next;
    });
  };

  const chosenSkillLabels = SKILLS.filter(s => skills[s.id]).map(s => s.label);
  const selectedRole = ROLES.find(r => r.id === role);
  const preview = role ? PREVIEWS_BY_ROLE[role] || [] : [];

  const skillHint = chosenSkillLabels.length === 0
    ? 'Pick anything you could answer a beginner question about.'
    : 'This decides which unanswered questions get routed to you.';

  const helpLine = chosenSkillLabels.length === 0
    ? 'Nobody starts with answers. We will show you questions from people one step behind you as soon as you post anything.'
    : `${chosenSkillLabels.length * 4} people are waiting on questions tagged ${chosenSkillLabels.slice(0, 3).join(', ')}. Answering one is the fastest way to be recognised here.`;

  const finish = async fields => {
    setSaving(true);
    const success = await updateProfile({ onboardingCompleted: true, ...fields });
    setSaving(false);

    if (!success) {
      setAlert('Could not save your preferences - you can set these later in your profile.', 'danger');
    }

    navigate('/');
  };

  const onSkip = () => finish({});

  const onSubmit = () => {
    const fields = { skills: chosenSkillLabels };
    if (selectedRole) {
      fields.targetRole = selectedRole.label;
    }
    finish(fields);
  };

  return (
    <div className="main-content">
      <div className="onboarding-container">
        <div className="onboarding-grid">
          <div className="onboarding-step">
            <div>
              <h1 className="onboarding-title">Two questions, then your feed.</h1>
              <p className="onboarding-subtitle">
                Answer these and the forum opens on discussions from people making the
                same move - not a welcome page.
              </p>
            </div>

            <div className="onboarding-field">
              <div className="onboarding-field-label">Where are you headed?</div>
              <div className="onboarding-chip-group">
                {ROLES.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    className={`onboarding-chip${role === r.id ? ' onboarding-chip--active' : ''}`}
                    aria-pressed={role === r.id}
                    onClick={() => setRole(role === r.id ? null : r.id)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="onboarding-field">
              <div className="onboarding-field-label">What can you already help someone with?</div>
              <div className="onboarding-chip-group">
                {SKILLS.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    className={`onboarding-chip${skills[s.id] ? ' onboarding-chip--active' : ''}`}
                    aria-pressed={Boolean(skills[s.id])}
                    onClick={() => toggleSkill(s.id)}
                  >
                    {s.label}
                  </button>
                ))}
                <button
                  type="button"
                  className={`onboarding-chip${skills[NOTHING_YET] ? ' onboarding-chip--active' : ''}`}
                  aria-pressed={Boolean(skills[NOTHING_YET])}
                  onClick={() => toggleSkill(NOTHING_YET)}
                >
                  Nothing yet
                </button>
              </div>
              <div className="onboarding-hint">{skillHint}</div>
            </div>

            <div className="onboarding-actions">
              <button
                type="button"
                className="btn onboarding-submit"
                onClick={onSubmit}
                disabled={saving}
              >
                Show my feed
              </button>
              <button
                type="button"
                className="onboarding-skip"
                onClick={onSkip}
                disabled={saving}
              >
                Skip - you can set this later in your profile
              </button>
            </div>
          </div>

          <div className="onboarding-preview">
            <div className="onboarding-field-label">Your feed will open with</div>

            {preview.length > 0 ? (
              <div className="onboarding-preview-list">
                {preview.map(p => (
                  <div className="onboarding-preview-card" key={p.title}>
                    <span className="onboarding-preview-card-title">{p.title}</span>
                    <div className="onboarding-preview-card-meta">
                      <span className={BADGE_CLASS_BY_KIND[p.kind]}>{p.badge}</span>
                      <span>{p.meta}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="onboarding-preview-empty">
                Pick a track above to preview your feed.
              </p>
            )}

            {preview.length > 0 && (
              <div className="onboarding-preview-help">{helpLine}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
