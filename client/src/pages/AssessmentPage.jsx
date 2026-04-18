import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import EmailPreview from '../components/EmailPreview';

export default function AssessmentPage() {
  const { phase } = useParams(); // 'pre' or 'post'
  const { updateProgress } = useAuth();
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [finalResults, setFinalResults] = useState(null);

  const assessmentPhase = phase === 'pre' ? 'pre_training' : 'post_training';

  useEffect(() => {
    api.getScenarios(phase)
      .then(data => setScenarios(data.scenarios || []))
      .catch(err => console.error('Failed to load scenarios:', err))
      .finally(() => setLoading(false));
  }, [phase]);

  async function handleDecision(scenarioId, decision, responseTimeMs) {
    try {
      // Map click to appropriate action types
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

      // Move to next scenario after a short delay
      setTimeout(() => {
        if (currentIndex < scenarios.length - 1) {
          setCurrentIndex(prev => prev + 1);
        } else {
          completeAssessment();
        }
      }, 2000);
    } catch (err) {
      console.error('Decision handling error:', err);
    }
  }

  async function completeAssessment() {
    setCompleting(true);
    try {
      const data = await api.completeAssessment({ assessment_phase: assessmentPhase });
      setFinalResults(data.results);
      updateProgress({
        [phase === 'pre' ? 'pre_assessment_complete' : 'post_assessment_complete']: true
      });
      setFinished(true);
    } catch (err) {
      console.error('Assessment completion error:', err);
    } finally {
      setCompleting(false);
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Loading scenarios...</div>;

  if (finished && finalResults) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-5xl mb-4">🎯</div>
          <h2 className="text-2xl font-bold text-gray-900">
            {phase === 'pre' ? 'Pre-Training' : 'Post-Training'} Assessment Complete!
          </h2>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-3xl font-bold text-green-700">{finalResults.detection_rate}%</p>
              <p className="text-sm text-green-600">Detection Rate</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4">
              <p className="text-3xl font-bold text-red-700">{finalResults.click_through_rate}%</p>
              <p className="text-sm text-red-600">Click-Through Rate</p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4">
              <p className="text-3xl font-bold text-yellow-700">{finalResults.false_positive_rate}%</p>
              <p className="text-sm text-yellow-600">False Positive Rate</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-3xl font-bold text-blue-700">{(finalResults.avg_response_time_ms / 1000).toFixed(1)}s</p>
              <p className="text-sm text-blue-600">Avg Response Time</p>
            </div>
          </div>
          <button onClick={() => navigate('/')}
            className="mt-6 bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-lg font-medium transition-colors">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentScenario = scenarios[currentIndex];
  if (!currentScenario) return <div className="text-center py-12 text-gray-500">No scenarios available.</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {phase === 'pre' ? 'Pre-Training' : 'Post-Training'} Assessment
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Evaluate each email carefully. Is it safe or suspicious?
          </p>
        </div>
        <div className="bg-brand-100 text-brand-700 px-4 py-2 rounded-full font-semibold text-sm">
          {currentIndex + 1} / {scenarios.length}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
        <div className="bg-brand-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + (results[currentScenario.id] ? 1 : 0)) / scenarios.length) * 100}%` }} />
      </div>

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
