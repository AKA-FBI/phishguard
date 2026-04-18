import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from '../utils/api';

export default function ResultsPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getResults()
      .then(data => setResults(data.results || []))
      .catch(err => console.error('Results fetch error:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading your results...</div>;
  if (results.length === 0) return <div className="text-center py-12 text-gray-500">No results yet. Complete both assessments first.</div>;

  const pre = results.find(r => r.assessment_phase === 'pre_training');
  const post = results.find(r => r.assessment_phase === 'post_training');

  function rate(num, den) { return den > 0 ? Math.round((num / den) * 100) : 0; }

  const chartData = [
    {
      metric: 'Detection Rate',
      'Pre-Training': pre ? rate(pre.phishing_detected, pre.total_phishing) : 0,
      'Post-Training': post ? rate(post.phishing_detected, post.total_phishing) : 0,
    },
    {
      metric: 'Click-Through Rate',
      'Pre-Training': pre ? rate(pre.phishing_clicked, pre.total_phishing) : 0,
      'Post-Training': post ? rate(post.phishing_clicked, post.total_phishing) : 0,
    },
    {
      metric: 'False Positive Rate',
      'Pre-Training': pre ? rate(pre.legitimate_flagged, pre.total_legitimate) : 0,
      'Post-Training': post ? rate(post.legitimate_flagged, post.total_legitimate) : 0,
    }
  ];

  const preDetection = pre ? rate(pre.phishing_detected, pre.total_phishing) : 0;
  const postDetection = post ? rate(post.phishing_detected, post.total_phishing) : 0;
  const improvement = postDetection - preDetection;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Results</h1>
      <p className="text-gray-600 mb-8">Here is how your phishing detection performance changed after training.</p>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          <p className="text-sm text-gray-500 mb-1">Pre-Training Detection</p>
          <p className="text-4xl font-bold text-gray-800">{preDetection}%</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          <p className="text-sm text-gray-500 mb-1">Post-Training Detection</p>
          <p className="text-4xl font-bold text-brand-600">{postDetection}%</p>
        </div>
        <div className={`rounded-xl shadow-md p-6 text-center ${improvement >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          <p className="text-sm text-gray-500 mb-1">Improvement</p>
          <p className={`text-4xl font-bold ${improvement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {improvement >= 0 ? '+' : ''}{improvement}%
          </p>
        </div>
      </div>

      {/* Bar chart comparison */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Comparison</h2>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="metric" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="Pre-Training" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Post-Training" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed breakdown */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Detailed Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Metric</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Pre-Training</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Post-Training</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Change</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Phishing Emails Detected', pre: pre?.phishing_detected, post: post?.phishing_detected, total_pre: pre?.total_phishing, total_post: post?.total_phishing },
                { label: 'Phishing Links Clicked', pre: pre?.phishing_clicked, post: post?.phishing_clicked, total_pre: pre?.total_phishing, total_post: post?.total_phishing, invert: true },
                { label: 'Legitimate Emails Wrongly Flagged', pre: pre?.legitimate_flagged, post: post?.legitimate_flagged, total_pre: pre?.total_legitimate, total_post: post?.total_legitimate, invert: true },
              ].map((row, i) => {
                const preRate = rate(row.pre || 0, row.total_pre || 1);
                const postRate = rate(row.post || 0, row.total_post || 1);
                const change = postRate - preRate;
                const good = row.invert ? change <= 0 : change >= 0;
                return (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-3 px-4 text-gray-800">{row.label}</td>
                    <td className="py-3 px-4 text-center">{row.pre || 0} / {row.total_pre || 0} ({preRate}%)</td>
                    <td className="py-3 px-4 text-center">{row.post || 0} / {row.total_post || 0} ({postRate}%)</td>
                    <td className={`py-3 px-4 text-center font-semibold ${good ? 'text-green-600' : 'text-red-600'}`}>
                      {change >= 0 ? '+' : ''}{change}%
                    </td>
                  </tr>
                );
              })}
              <tr className="border-b last:border-0">
                <td className="py-3 px-4 text-gray-800">Avg Response Time</td>
                <td className="py-3 px-4 text-center">{pre ? (pre.avg_response_time_ms / 1000).toFixed(1) : '—'}s</td>
                <td className="py-3 px-4 text-center">{post ? (post.avg_response_time_ms / 1000).toFixed(1) : '—'}s</td>
                <td className="py-3 px-4 text-center text-gray-500">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
