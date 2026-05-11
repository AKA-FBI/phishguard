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
  const [processing, setProcessing] = useState(false);

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
    if (results[scenarioId] || processing) return;

    setError(null);
    setProcessing(true);
    setPendingDecision({ scenarioId, decision, responseTimeMs });

    try {
      let actionType = decision;
      if (decision === 'safe') actionType = 'marked_safe';
      if (decision === 'suspicious') actionType = 'flagged_suspicious';

      await api.logInteraction({
        scenario_id: scenarioId,
        action_type: actionType,
        assessment_phase: assessmentPhase,
        response_time_ms: responseTimeMs
      });

      const evalDecision = decision === 'clicked_link' ? 'safe' : decision;
      const evalResult = await api.evaluateDecision({ scenario_id: scenarioId, decision: evalDecision });

      setResults(prev => ({ ...prev, [scenarioId]: evalResult }));
      setPendingDecision(null);
      setProcessing(false);
      // No auto-advance — user clicks "Next Question" button
    } catch (err) {
      console.error('Decision handling error:', err);
      setError('Connection issue. Tap "Retry" to try again.');
      setProcessing(false);
    }
  }

  function nextQuestion() {
    if (currentIndex < scenarios.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      completeAssessment();
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
            className="mt-6 bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-lg font-medium transition-colors touch-manipulation w-full sm:w-auto">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentScenario = scenarios[currentIndex];
  if (!currentScenario) return <div className="text-center py-12 text-gray-500">No scenarios available.</div>;

  const hasResult = !!results[currentScenario.id];
  const isLastQuestion = currentIndex >= scenarios.length - 1;

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
          style={{ width: `${((currentIndex + (hasResult ? 1 : 0)) / scenarios.length) * 100}%` }} />
      </div>

      {/* Error banner with retry and skip */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          <p className="text-red-700 text-sm mb-3">{error}</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setError(null);
                if (pendingDecision) {
                  retryDecision();
                } else {
                  completeAssessment();
                }
              }}
              className="bg-red-600 active:bg-red-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium touch-manipulation select-none"
            >
              {pendingDecision ? 'Retry' : 'Try Again'}
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setPendingDecision(null);
                setProcessing(false);
                if (currentIndex < scenarios.length - 1) {
                  setCurrentIndex(prev => prev + 1);
                } else {
                  completeAssessment();
                }
              }}
              className="bg-gray-200 active:bg-gray-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium touch-manipulation select-none"
            >
              Skip & Continue
            </button>
          </div>
        </div>
      )}

      {/* Processing indicator */}
      {processing && (
        <div className="text-center py-2 mb-4 text-gray-500 text-sm">Saving your response...</div>
      )}

      <EmailPreview
        key={currentScenario.id}
        scenario={currentScenario}
        onDecision={handleDecision}
        showResult={hasResult}
        result={results[currentScenario.id]}
      />

      {/* Next Question / Complete button — only shows after feedback is displayed */}
      {hasResult && !completing && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={nextQuestion}
            className="w-full sm:w-auto bg-brand-600 active:bg-brand-700 hover:bg-brand-700 text-white px-8 py-3.5 rounded-lg font-semibold transition-colors touch-manipulation select-none text-base"
          >
            {isLastQuestion ? 'Complete Assessment →' : 'Next Question →'}
          </button>
        </div>
      )}

      {completing && (
        <div className="text-center py-8 text-gray-500">Computing your results...</div>
      )}
    </div>
  );
}