import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

export default function TrainingPage() {
  const { updateProgress } = useAuth();
  const navigate = useNavigate();
  const [moduleData, setModuleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState(null);
  const [showQuizFeedback, setShowQuizFeedback] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getTrainingModule()
      .then(data => setModuleData(data))
      .catch(err => {
        console.error('Failed to load training:', err);
        setError('Failed to load training content. Please check your connection and refresh.');
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleComplete() {
    setCompleting(true);
    setError(null);
    try {
      await api.completeTraining();
      updateProgress({ training_complete: true });
      navigate('/');
    } catch (err) {
      console.error('Complete error:', err);
      setError('Could not save your progress. Please try again.');
    } finally {
      setCompleting(false);
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Loading training content...</div>;

  if (error && !moduleData) {
    return (
      <div className="max-w-2xl mx-auto px-4 text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={() => window.location.reload()}
          className="bg-brand-600 text-white px-6 py-2.5 rounded-lg font-medium touch-manipulation">
          Refresh Page
        </button>
      </div>
    );
  }

  if (!moduleData || !moduleData.modules?.length) return <div className="text-center py-12 text-gray-500">No training content available.</div>;

  const mod = moduleData.modules[0];

  // TEXT-BASED MODULE
  if (mod.content_type === 'text') {
    return (
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-6">
          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">Text-Based Training</span>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-3">{mod.title}</h1>
          <p className="text-gray-600 text-sm mt-1">Read through the content below carefully. When you are done, click the button at the bottom to continue.</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-5 sm:p-8 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: mod.content_body }} />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mt-4 text-red-700 text-sm">{error}</div>
        )}

        <div className="mt-6 text-center">
          <button type="button" onClick={handleComplete} disabled={completing}
            className="w-full sm:w-auto bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white px-8 py-3.5 rounded-lg font-semibold transition-colors disabled:opacity-50 touch-manipulation select-none">
            {completing ? 'Saving...' : 'I Have Read This Module →'}
          </button>
        </div>
      </div>
    );
  }

  // VIDEO-BASED MODULE
  if (mod.content_type === 'video') {
    let videos = [];
    try { videos = JSON.parse(mod.content_body); } catch { videos = []; }

    return (
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-6">
          <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">Video-Based Training</span>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-3">{mod.title}</h1>
          <p className="text-gray-600 text-sm mt-1">Please watch <strong>at least the first video</strong> before clicking the complete button. You can come back to watch the other videos at your leisure after completing the study.</p>
        </div>
        <div className="space-y-6">
          {videos.map((vid, i) => (
            <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="aspect-video bg-gray-900">
                <iframe src={vid.url} className="w-full h-full" frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen title={vid.title} />
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900">{vid.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{vid.description}</p>
                <span className="text-xs text-gray-400">{vid.duration}</span>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mt-4 text-red-700 text-sm">{error}</div>
        )}

        <div className="mt-6 text-center">
          <button type="button" onClick={handleComplete} disabled={completing}
            className="w-full sm:w-auto bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white px-8 py-3.5 rounded-lg font-semibold transition-colors disabled:opacity-50 touch-manipulation select-none">
            {completing ? 'Saving...' : 'I Have Completed This Module →'}
          </button>
        </div>
      </div>
    );
  }

  // INTERACTIVE QUIZ-BASED MODULE
  if (mod.content_type === 'interactive') {
    let quizItems = [];
    try { quizItems = JSON.parse(mod.content_body); } catch { quizItems = []; }

    if (quizComplete) {
      return (
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
            <div className="text-5xl mb-4">🎓</div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Training Complete!</h2>
            <p className="text-gray-600 mt-2">You have worked through all the interactive scenarios. Well done.</p>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mt-4 text-red-700 text-sm">{error}</div>
            )}

            <button type="button" onClick={handleComplete} disabled={completing}
              className="mt-6 w-full sm:w-auto bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white px-8 py-3.5 rounded-lg font-semibold transition-colors disabled:opacity-50 touch-manipulation select-none">
              {completing ? 'Saving...' : 'Continue to Post-Training Assessment →'}
            </button>
          </div>
        </div>
      );
    }

    const currentQuiz = quizItems[quizIndex];
    if (!currentQuiz) return <div className="text-center py-12">No quiz items available.</div>;

    function handleQuizAnswer(answer) {
      if (quizAnswer !== null) return; // prevent double-tap
      setQuizAnswer(answer);
      setShowQuizFeedback(true);
    }

    function nextQuiz() {
      if (quizIndex < quizItems.length - 1) {
        setQuizIndex(prev => prev + 1);
        setQuizAnswer(null);
        setShowQuizFeedback(false);
      } else {
        setQuizComplete(true);
      }
    }

    const isCorrect = quizAnswer !== null &&
      ((currentQuiz.is_phishing && quizAnswer === 'suspicious') ||
       (!currentQuiz.is_phishing && quizAnswer === 'safe'));

    return (
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">Interactive Training</span>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 mt-2">Scenario {quizIndex + 1} of {quizItems.length}</h1>
          </div>
          <div className="bg-green-100 text-green-700 px-3 sm:px-4 py-2 rounded-full font-semibold text-sm">
            {quizIndex + 1} / {quizItems.length}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((quizIndex + (showQuizFeedback ? 1 : 0)) / quizItems.length) * 100}%` }} />
        </div>

        {/* Email scenario */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-4 sm:p-5 border-b bg-gray-50">
            <p className="text-sm text-gray-500">Evaluate this email. Is it safe or suspicious?</p>
          </div>
          <div className="p-4 sm:p-5 text-sm" dangerouslySetInnerHTML={{ __html: currentQuiz.scenario_html }} />

          {!showQuizFeedback && (
            <div className="border-t px-4 sm:px-5 py-4 flex flex-col sm:flex-row gap-3">
              <button type="button" onClick={() => handleQuizAnswer('safe')}
                className="flex-1 bg-green-600 active:bg-green-700 hover:bg-green-500 text-white py-3.5 rounded-lg font-medium transition-colors select-none touch-manipulation text-center">
                ✓ This Looks Safe
              </button>
              <button type="button" onClick={() => handleQuizAnswer('suspicious')}
                className="flex-1 bg-red-600 active:bg-red-700 hover:bg-red-500 text-white py-3.5 rounded-lg font-medium transition-colors select-none touch-manipulation text-center">
                ⚠ This Looks Suspicious
              </button>
            </div>
          )}

          {showQuizFeedback && (
            <div className={`border-t px-4 sm:px-5 py-5 ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className={`font-bold text-lg ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                {isCorrect ? '✓ Correct!' : '✗ Not quite.'}
              </p>
              <p className="text-gray-700 mt-2 text-sm leading-relaxed">
                {isCorrect ? currentQuiz.correct_feedback : currentQuiz.incorrect_feedback}
              </p>
              <button type="button" onClick={nextQuiz}
                className="mt-4 w-full sm:w-auto bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white px-6 py-3 rounded-lg font-medium transition-colors touch-manipulation select-none">
                {quizIndex < quizItems.length - 1 ? 'Next Scenario →' : 'Finish Training →'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <div className="text-center py-12 text-gray-500">Unknown module type.</div>;
}