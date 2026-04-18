import { useState } from 'react';

export default function EmailPreview({ scenario, onDecision, showResult, result }) {
  const [opened, setOpened] = useState(false);
  const [startTime] = useState(Date.now());

  function handleOpen() {
    setOpened(true);
  }

  function handleDecision(decision) {
    const responseTime = Date.now() - startTime;
    onDecision(scenario.id, decision, responseTime);
  }

  function handleLinkClick(e) {
    e.preventDefault();
    const responseTime = Date.now() - startTime;
    onDecision(scenario.id, 'clicked_link', responseTime);
  }

  if (!opened) {
    return (
      <div
        onClick={handleOpen}
        className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all shadow-sm"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-brand-500 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
            {scenario.sender_name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <p className="font-semibold text-gray-900 truncate">{scenario.sender_name}</p>
              <span className="text-xs text-gray-400 shrink-0 ml-2">Just now</span>
            </div>
            <p className="text-sm text-gray-600 truncate">{scenario.sender_email}</p>
            <p className="text-sm font-medium text-gray-800 mt-1">{scenario.subject_line}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
      {/* Email header */}
      <div className="bg-gray-50 border-b px-5 py-4">
        <h3 className="font-bold text-lg text-gray-900">{scenario.subject_line}</h3>
        <div className="mt-2 flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {scenario.sender_name.charAt(0)}
          </div>
          <div>
            <p className="font-medium text-gray-800 text-sm">{scenario.sender_name}</p>
            <p className="text-xs text-gray-500">&lt;{scenario.sender_email}&gt;</p>
          </div>
        </div>
      </div>

      {/* Email body */}
      <div
        className="px-5 py-4 text-sm text-gray-700 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: scenario.email_body_html }}
        onClick={(e) => {
          if (e.target.tagName === 'A') handleLinkClick(e);
        }}
      />

      {/* Decision buttons */}
      {!showResult && (
        <div className="border-t px-5 py-4 flex gap-3">
          <button
            onClick={() => handleDecision('safe')}
            className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2.5 px-4 rounded-lg font-medium transition-colors"
          >
            ✓ This Looks Safe
          </button>
          <button
            onClick={() => handleDecision('suspicious')}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2.5 px-4 rounded-lg font-medium transition-colors"
          >
            ⚠ This Looks Suspicious
          </button>
        </div>
      )}

      {/* Result feedback */}
      {showResult && result && (
        <div className={`border-t px-5 py-4 ${result.correct ? 'bg-green-50' : 'bg-red-50'}`}>
          <p className={`font-semibold ${result.correct ? 'text-green-800' : 'text-red-800'}`}>
            {result.correct ? '✓ Correct!' : '✗ Incorrect'}
          </p>
          <p className="text-sm text-gray-700 mt-1">
            This email was <strong>{result.was_phishing ? 'a phishing attempt' : 'legitimate'}</strong>
            {result.was_phishing && result.principle && (
              <span> using the <em>{result.principle}</em> persuasion tactic</span>
            )}.
          </p>
        </div>
      )}
    </div>
  );
}
