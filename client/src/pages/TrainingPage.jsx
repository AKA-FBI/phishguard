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

  useEffect(() => {
    api.getTrainingModule()
      .then(data => setModuleData(data))
      .catch(err => console.error('Failed to load training:', err))
      .finally(() => setLoading(false));
  }, []);

  async function handleComplete() {
    setCompleting(true);
    try {
      await api.completeTraining();
      updateProgress({ training_complete: true });
      navigate('/');
    } catch (err) {
      console.error('Complete error:', err);
    } finally {
      setCompleting(false);
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Loading training content...</div>;
  if (!moduleData || !moduleData.modules?.length) return <div className="text-center py-12 text-gray-500">No training content available.</div>;

  const mod = moduleData.modules[0];

  // TEXT-BASED MODULE
  if (mod.content_type === 'text') {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">Text-Based Training</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-3">{mod.title}</h1>
        </div>
        <div className="bg-white rounded-xl shadow-md p-8 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: mod.content_body }} />
        <div className="mt-6 text-center">
          <button onClick={handleComplete} disabled={completing}
            className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50">
            {completing ? 'Saving...' : 'I Have Completed This Module →'}
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
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">Video-Based Training</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-3">{mod.title}</h1>
          <p className="text-gray-600 mt-1">Watch all video segments below, then mark the module as complete.</p>
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
        <div className="mt-6 text-center">
          <button onClick={handleComplete} disabled={completing}
            className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50">
            {completing ? 'Saving...' : 'I Have Watched All Videos →'}
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
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-5xl mb-4">🎓</div>
            <h2 className="text-2xl font-bold text-gray-900">Training Complete!</h2>
            <p className="text-gray-600 mt-2">You've worked through all the interactive scenarios. Well done.</p>
            <button onClick={handleComplete} disabled={completing}
              className="mt-6 bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50">
              {completing ? 'Saving...' : 'Continue to Post-Training Assessment →'}
            </button>
          </div>
        </div>
      );
    }

    const currentQuiz = quizItems[quizIndex];
    if (!currentQuiz) return <div className="text-center py-12">No quiz items available.</div>;

    function handleQuizAnswer(answer) {
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
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">Interactive Training</span>
            <h1 className="text-xl font-bold text-gray-900 mt-2">Scenario {quizIndex + 1} of {quizItems.length}</h1>
          </div>
          <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full font-semibold text-sm">
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
          <div className="p-5 border-b bg-gray-50">
            <p className="text-sm text-gray-500">Evaluate this email. Is it safe or suspicious?</p>
          </div>
          <div className="p-5" dangerouslySetInnerHTML={{ __html: currentQuiz.scenario_html }} />

          {!showQuizFeedback && (
            <div className="border-t px-5 py-4 flex gap-3">
              <button onClick={() => handleQuizAnswer('safe')}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2.5 rounded-lg font-medium transition-colors">
                ✓ This Looks Safe
              </button>
              <button onClick={() => handleQuizAnswer('suspicious')}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2.5 rounded-lg font-medium transition-colors">
                ⚠ This Looks Suspicious
              </button>
            </div>
          )}

          {showQuizFeedback && (
            <div className={`border-t px-5 py-5 ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className={`font-bold text-lg ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                {isCorrect ? '✓ Correct!' : '✗ Not quite.'}
              </p>
              <p className="text-gray-700 mt-2 text-sm leading-relaxed">
                {isCorrect ? currentQuiz.correct_feedback : currentQuiz.incorrect_feedback}
              </p>
              <button onClick={nextQuiz}
                className="mt-4 bg-brand-600 hover:bg-brand-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
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
