import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ConsentPage() {
  const [agreed, setAgreed] = useState(false);
  const navigate = useNavigate();

  function handleProceed() {
    localStorage.setItem('phishguard_consent', 'true');
    navigate('/register');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">🛡️ PhishGuard</h1>
          <p className="text-gray-500 mt-1">Informed Consent Form</p>
        </div>

        <div className="prose prose-sm max-w-none text-gray-700 space-y-4 mb-6 max-h-96 overflow-y-auto border rounded-lg p-5 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900 mt-0">Study Title</h3>
          <p>Design and Implementation of a Web-Based Phishing Simulation and Awareness Training Platform for University Students</p>

          <h3 className="text-lg font-semibold text-gray-900">Purpose</h3>
          <p>
            This study evaluates how different cybersecurity awareness training formats affect students'
            ability to detect phishing emails. You will be assigned to one of three training groups
            (text-based, video-based, or interactive), complete training, and evaluate simulated phishing
            scenarios before and after training.
          </p>

          <h3 className="text-lg font-semibold text-gray-900">What You Will Do</h3>
          <p>
            1. Complete a pre-training assessment (evaluate 10 simulated emails)<br/>
            2. Go through a cybersecurity awareness training module<br/>
            3. Complete a post-training assessment (evaluate 10 different simulated emails)<br/>
            4. View your personal results
          </p>
          <p>The entire process takes approximately 25-35 minutes.</p>

          <h3 className="text-lg font-semibold text-gray-900">Important Information</h3>
          <p>
            <strong>Simulated phishing emails:</strong> You will encounter realistic but entirely harmless
            simulated phishing emails. No real malicious links, no real credential harvesting, and no risk
            to your actual accounts or devices. Everything is self-contained within this platform.
          </p>
          <p>
            <strong>Confidentiality:</strong> Your individual performance data is confidential and will not
            be shared with lecturers, supervisors, or anyone who could use it to evaluate you academically.
            Published results will only report group-level averages, never individual scores.
          </p>
          <p>
            <strong>Voluntary participation:</strong> Your participation is entirely voluntary. You may
            withdraw at any time without penalty or academic consequence.
          </p>
          <p>
            <strong>Data protection:</strong> Your data is stored securely with Row-Level Security policies.
            Any data exported for analysis will be anonymised with participant codes replacing your name
            and matric number.
          </p>
        </div>

        <label className="flex items-start gap-3 mb-5 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">
            I have read and understood the information above. I understand that simulated phishing
            emails will be used, that my participation is voluntary, and that my data will be kept
            confidential. I consent to participate in this study.
          </span>
        </label>

        <button
          onClick={handleProceed}
          disabled={!agreed}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          I Agree — Proceed to Registration
        </button>

        <p className="text-center text-xs text-gray-400 mt-4">
          Department of Computing, Afe Babalola University, Ado-Ekiti
        </p>
      </div>
    </div>
  );
}
