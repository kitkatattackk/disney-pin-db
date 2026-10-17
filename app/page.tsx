'use client';

import { useState } from 'react';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoBuilding, setAutoBuilding] = useState(false);
  const [pins, setPins] = useState<any[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    setStatusMessage('Searching Brave API...');
    try {
      const res = await fetch('/api/scrape-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinName: searchQuery }),
      });
      const data = await res.json();
      if (data.searchResults) {
        setPins(data.searchResults);
        setStatusMessage(`Found ${data.searchResults.length} reference results.`);
      }
    } catch (err) {
      setStatusMessage('Error searching Brave database.');
    } finally {
      setLoading(false);
    }
  }

  async function triggerAutoBuild() {
    setAutoBuilding(true);
    setExecutionLogs([]);
    setStatusMessage('🚀 Auto-Build Pipeline Active! Brave Search is crawling disneypinsblog.com...');
    try {
      const res = await fetch('/api/auto-build', { method: 'POST' });
      const data = await res.json();
      setStatusMessage(data.message || 'Auto-build processing complete.');
      if (data.details) {
        setExecutionLogs(data.details);
      }
    } catch (err) {
      setStatusMessage('Automation job crashed or timed out.');
    } finally {
      setAutoBuilding(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-3xl font-bold text-sky-400">✨ My Disney Pin Database</h1>
          <button
            onClick={triggerAutoBuild}
            disabled={autoBuilding}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 text-white font-medium px-4 py-2 rounded text-sm transition shadow-lg"
          >
            {autoBuilding ? '⚡ Auto-Building DB...' : '🤖 Trigger Auto-Build'}
          </button>
        </div>
        <p className="text-slate-400 mb-8">Search for pins manually, or activate the automated engine to harvest rows using Brave Search indexing.</p>

        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <input
            type="text"
            placeholder="e.g., Mickey Mouse Sorcerer Hat Pin 2024"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-slate-800 border border-slate-700 rounded px-4 py-2 text-white focus:outline-none focus:border-sky-500"
          />
          <button type="submit" disabled={loading} className="bg-sky-500 hover:bg-sky-600 px-6 py-2 rounded font-medium">
            Search
          </button>
        </form>

        {statusMessage && (
          <div className="bg-slate-800 border-l-4 border-purple-500 text-slate-300 p-3 mb-6 rounded text-sm">
            {statusMessage}
          </div>
        )}

        {/* Real-time Processing Console Log Panel */}
        {executionLogs.length > 0 && (
          <div className="bg-slate-950 border border-slate-800 rounded p-4 mb-6 font-mono text-xs text-emerald-400 space-y-1 max-h-60 overflow-y-auto shadow-inner">
            <div className="text-slate-500 border-b border-slate-800 pb-1 mb-2 font-sans font-semibold">🖥️ Engine Sync Execution History:</div>
            {executionLogs.map((log, index) => (
              <div key={index}>&gt; {log}</div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
