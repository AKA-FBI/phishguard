import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

export default function ExplorePage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [moduleData, setModuleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState(null);
  const [showQuizFeedback, setShowQuizFeedback] = useState(false);

  useEffect(() => {
    api.exploreModule(groupId)
      .then(data => setModuleData(data))
      .catch(err => console.error('Failed to load module:', err))
      .finally(() => setLoading(false));
  }, [groupId]);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading training content...</div>;
  if (!moduleData || !moduleData.modules?.length) return <div className="text-center py-12 text-gray-500">No content available.</div>;

  const mod = moduleData.modules[0];

  // TEXT MODULE
  if (mod.content_type === 'text') {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">Exploring: Text-Based Training</span>
            <h1 className="text-2xl font-bold text-gray-900 mt-3">{mod.title}</h1>
          </div>
          <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700 text-sm">← Back to Dashboard</button>
        </div>
        <div className="bg-white rounded-xl shadow-md p-8 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: mod.content_body }} />
        <div className="mt-6 text-center">
          <button onClick={() => navigate('/')}
            className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors">
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // VIDEO MODULE
  if (mod.content_type === 'video') {
    let videos = [];
    try { videos = JSON.parse(mod.content_body); } catch { videos = []; }

    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">Exploring: Video-Based Training</span>
            <h1 className="text-2xl font-bold text-gray-900 mt-3">{mod.title}</h1>
          </div>
          <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700 text-sm">← Back to Dashboard</button>
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
          <button onClick={() => navigate('/')}
            className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors">
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // INTERACTIVE MODULE
  if (mod.content_type === 'interactive') {
    let quizItems = [];
    try { quizItems = JSON.parse(mod.content_body); } catch { quizItems = []; }

    const currentQuiz = quizItems[quizIndex];
    if (!currentQuiz) {
      return (
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-5xl mb-4">🎓</div>
            <h2 className="text-2xl font-bold text-gray-900">Module Complete!</h2>
            <p className="text-gray-600 mt-2">You have explored all the interactive scenarios.</p>
            <button onClick={() => navigate('/')}
              className="mt-6 bg-gray-600 hover:bg-gray-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors">
              ← Back to Dashboard
            </button>
          </div>
        </div>
      );
    }

    function handleQuizAnswer(answer) {
      setQuizAnswer(answer);
      setShowQuizFeedback(true);
    }

    function nextQuiz() {
      setQuizIndex(prev => prev + 1);
      setQuizAnswer(null);
      setShowQuizFeedback(false);
    }

    const isCorrect = quizAnswer !== null &&
      ((currentQuiz.is_phishing && quizAnswer === 'suspicious') ||
       (!currentQuiz.is_phishing && quizAnswer === 'safe'));

    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">Exploring: Interactive Training</span>
            <h1 className="text-xl font-bold text-gray-900 mt-2">Scenario {quizIndex + 1} of {quizItems.length}</h1>
          </div>
          <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700 text-sm">← Back to Dashboard</button>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((quizIndex + (showQuizFeedback ? 1 : 0)) / quizItems.length) * 100}%` }} />
        </div>

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
                {quizIndex < quizItems.length - 1 ? 'Next Scenario →' : 'Finish →'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <div className="text-center py-12 text-gray-500">Unknown module type.</div>;
}