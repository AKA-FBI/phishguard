import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user, progress } = useAuth();
  const navigate = useNavigate();

  const allComplete = progress?.pre_assessment_complete && 
                      progress?.training_complete && 
                      progress?.post_assessment_complete;

  const steps = [
    {
      title: 'Pre-Training Assessment',
      description: 'Evaluate 10 simulated emails to establish your baseline phishing detection ability.',
      complete: progress?.pre_assessment_complete,
      action: () => navigate('/assessment/pre'),
      buttonText: 'Start Assessment',
      locked: false,
      lockedReason: ''
    },
    {
      title: 'Training Module',
      description: `Complete your assigned ${user?.groups?.name || ''} training module to learn how to identify phishing attacks.`,
      complete: progress?.training_complete,
      action: () => navigate('/training'),
      buttonText: 'Begin Training',
      locked: !progress?.pre_assessment_complete,
      lockedReason: 'Complete the Pre-Training Assessment first to unlock this step.'
    },
    {
      title: 'Post-Training Assessment',
      description: 'Take a second assessment with new scenarios to measure how much your detection skills have improved.',
      complete: progress?.post_assessment_complete,
      action: () => navigate('/assessment/post'),
      buttonText: 'Start Assessment',
      locked: !progress?.training_complete,
      lockedReason: 'Complete the Training Module first to unlock this step.'
    },
    {
      title: 'View Your Results',
      description: 'See your pre- and post-training scores side by side and understand your improvement.',
      complete: false,
      action: () => navigate('/results'),
      buttonText: 'View Results',
      locked: !progress?.post_assessment_complete,
      lockedReason: 'Complete the Post-Training Assessment first to unlock this step.'
    }
  ];

  // Determine which modules the user can explore (the two they weren't assigned to)
  const groupId = user?.group_id;
  const otherModules = [
    { id: 1, name: 'Text-Based', description: 'Structured written content covering phishing fundamentals, psychological tactics, red flags, and safe behaviour.', icon: 'T' },
    { id: 2, name: 'Video-Based', description: 'Short video tutorials with screen-capture demonstrations of phishing email analysis.', icon: 'V' },
    { id: 3, name: 'Interactive', description: 'Quiz-based scenarios where you evaluate emails and receive immediate feedback on each decision.', icon: 'Q' },
  ].filter(m => m.id !== groupId);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.full_name?.split(' ')[0]}!</h1>
        <p className="text-gray-600 mt-1">
          You are in <span className="font-semibold text-brand-600">{user?.groups?.name || 'your assigned'}</span> training group.
          Follow the steps below to complete the study.
        </p>
      </div>

      <div className="space-y-4">
        {steps.map((step, i) => (
          <div key={i} className={`bg-white rounded-xl border-2 p-6 transition-all ${
            step.complete ? 'border-green-300 bg-green-50' :
            step.locked ? 'border-gray-200 opacity-60' :
            'border-brand-300 shadow-md'
          }`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0 ${
                  step.complete ? 'bg-green-500' : step.locked ? 'bg-gray-400' : 'bg-brand-600'
                }`}>
                  {step.complete ? '✓' : i + 1}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">{step.title}</h3>
                  <p className="text-gray-600 text-sm mt-1">{step.description}</p>
                </div>
              </div>
              {!step.complete && !step.locked && (
                <button onClick={step.action}
                  className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg font-medium shrink-0 transition-colors">
                  {step.buttonText}
                </button>
              )}
              {step.complete && (
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium shrink-0">
                  Completed ✓
                </span>
              )}
              {step.locked && !step.complete && (
                <div className="relative group shrink-0">
                  <span className="text-gray-400 text-sm cursor-help">🔒 Locked</span>
                  <div className="absolute right-0 top-8 w-64 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 hidden group-hover:block shadow-lg z-10">
                    {step.lockedReason}
                    <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-800 rotate-45"></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Explore Other Modules - only shown after completing the study */}
      {allComplete && (
        <div className="mt-10">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Explore other training modules</h2>
          <p className="text-gray-600 text-sm mb-4">
            You completed the study using the {user?.groups?.name} module. 
            Explore the other two formats below to see how they compare. 
            This does not affect your study results.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {otherModules.map(mod => (
              <div key={mod.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-brand-300 hover:shadow-md transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-lg shrink-0">
                    {mod.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{mod.name} Module</h3>
                    <p className="text-gray-500 text-sm mt-1">{mod.description}</p>
                    <button 
                      onClick={() => navigate(`/explore/${mod.id}`)}
                      className="mt-3 text-brand-600 hover:text-brand-700 text-sm font-medium"
                    >
                      Try this module →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-5">
        <h3 className="font-semibold text-blue-800">About this study</h3>
        <p className="text-blue-700 text-sm mt-2">
          PhishGuard is a research platform evaluating how different training methods affect students' ability
          to detect phishing emails. Your participation helps improve cybersecurity education at ABUAD.
          All your data is confidential and will not affect your academic standing.
        </p>
      </div>
    </div>
  );
}