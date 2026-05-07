import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import EmailPreview from '../components/EmailPreview';

export default function AssessmentPage() {
  const { phase } = useParams();
  const { updateProgress } = useAuth();
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [finalResults, setFinalResults] = useState(null);
  const [error, setError] = useState(null);
  const [pendingDecision, setPendingDecision] = useState(null);

  const assessmentPhase = phase === 'pre' ? 'pre_training' : 'post_training';

  useEffect(() => {
    api.getScenarios(phase)
      .then(data => setScenarios(data.scenarios || []))
      .catch(err => {
        console.error('Failed to load scenarios:', err);
        setError('Failed to load scenarios. Please check your connection and refresh the page.');
      })
      .finally(() => setLoading(false));
  }, [phase]);

  async function handleDecision(scenarioId, decision, responseTimeMs) {
    // Prevent double-tap
    if (results[scenarioId]) return;

    setError(null);
    setPendingDecision({ scenarioId, decision, responseTimeMs });

    try {
      let actionType = decision;
      if (decision === 'safe') actionType = 'marked_safe';
      if (decision === 'suspicious') actionType = 'flagged_suspicious';

      // Log the interaction
      await api.logInteraction({
        scenario_id: scenarioId,
        action_type: actionType,
        assessment_phase: assessmentPhase,
        response_time_ms: responseTimeMs
      });

      // Get evaluation result
      const evalDecision = decision === 'clicked_link' ? 'safe' : decision;
      const evalResult = await api.evaluateDecision({ scenario_id: scenarioId, decision: evalDecision });

      setResults(prev => ({ ...prev, [scenarioId]: evalResult }));
      setPendingDecision(null);

      // Move to next scenario after a short delay
      setTimeout(() => {
        if (currentIndex < scenarios.length - 1) {
          setCurrentIndex(prev => prev + 1);
        } else {
          completeAssessment();
        }
      }, 1500);
    } catch (err) {
      console.error('Decision handling error:', err);
      setError('Connection issue. Tap "Retry" to try again.');
    }
  }

  async function retryDecision() {
    if (pendingDecision) {
      const { scenarioId, decision, responseTimeMs } = pendingDecision;
      await handleDecision(scenarioId, decision, responseTimeMs);
    }
  }

  async function completeAssessment() {
    setCompleting(true);
    setError(null);
    try {
      const data = await api.completeAssessment({ assessment_phase: assessmentPhase });
      setFinalResults(data.results);
      updateProgress({
        [phase === 'pre' ? 'pre_assessment_complete' : 'post_assessment_complete']: true
      });
      setFinished(true);
    } catch (err) {
      console.error('Assessment completion error:', err);
      setError('Could not save your results. Tap "Try Again" to retry.');
    } finally {
      setCompleting(false);
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Loading scenarios...</div>;

  if (finished && finalResults) {
    return (
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 text-center">
          <div className="text-5xl mb-4">🎯</div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            {phase === 'pre' ? 'Pre-Training' : 'Post-Training'} Assessment Complete!
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-6">
            <div className="bg-green-50 rounded-xl p-3 sm:p-4">
              <p className="text-2xl sm:text-3xl font-bold text-green-700">{finalResults.detection_rate}%</p>
              <p className="text-xs sm:text-sm text-green-600">Detection Rate</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3 sm:p-4">
              <p className="text-2xl sm:text-3xl font-bold text-red-700">{finalResults.click_through_rate}%</p>
              <p className="text-xs sm:text-sm text-red-600">Click-Through Rate</p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-3 sm:p-4">
              <p className="text-2xl sm:text-3xl font-bold text-yellow-700">{finalResults.false_positive_rate}%</p>
              <p className="text-xs sm:text-sm text-yellow-600">False Positive Rate</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 sm:p-4">
              <p className="text-2xl sm:text-3xl font-bold text-blue-700">{(finalResults.avg_response_time_ms / 1000).toFixed(1)}s</p>
              <p className="text-xs sm:text-sm text-blue-600">Avg Response Time</p>
            </div>
          </div>
          <button onClick={() => navigate('/')}
            className="mt-6 bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-lg font-medium transition-colors touch-manipulation">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentScenario = scenarios[currentIndex];
  if (!currentScenario) return <div className="text-center py-12 text-gray-500">No scenarios available.</div>;

  return (
    <div className="max-w-3xl mx-auto px-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">
            {phase === 'pre' ? 'Pre-Training' : 'Post-Training'} Assessment
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Evaluate each email carefully. Is it safe or suspicious?
          </p>
        </div>
        <div className="bg-brand-100 text-brand-700 px-3 sm:px-4 py-2 rounded-full font-semibold text-sm">
          {currentIndex + 1} / {scenarios.length}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
        <div className="bg-brand-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + (results[currentScenario.id] ? 1 : 0)) / scenarios.length) * 100}%` }} />
      </div>

      {/* Error banner with retry */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 flex items-center justify-between gap-3">
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={pendingDecision ? retryDecision : completeAssessment}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium shrink-0 touch-manipulation"
          >
            {pendingDecision ? 'Retry' : 'Try Again'}
          </button>
        </div>
      )}

      <EmailPreview
        key={currentScenario.id}
        scenario={currentScenario}
        onDecision={handleDecision}
        showResult={!!results[currentScenario.id]}
        result={results[currentScenario.id]}
      />

      {completing && (
        <div className="text-center py-8 text-gray-500">Computing your results...</div>
      )}
    </div>
  );
}