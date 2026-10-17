'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [pins, setPins] = useState<any[]>([]);
  const [statusMessage, setStatusMessage] = useState('');

  // Call the Next.js API route that connects to Brave Search
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
      } else {
        setStatusMessage('No matching details found.');
      }
    } catch (err) {
      setStatusMessage('Error searching Brave database.');
    } finally {
      setLoading(false);
    }
  }

  // Quickly save a pin directly to your personal Supabase table
  async function savePinToCollection(title: string) {
    setStatusMessage(`Saving "${title}" to Supabase...`);
    
    const { data, error } = await supabase
      .from('pins')
      .insert([
        { 
          name: title, 
          notes: 'Discovered and appended via Brave Search pipeline API',
          release_year: new Date().getFullYear()
        }
      ]);

    if (error) {
      setStatusMessage(`Error saving: ${error.message}`);
    } else {
      setStatusMessage(`Successfully added "${title}" to your database collection!`);
    }
  }

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-sky-400 mb-2">✨ My Disney Pin Database</h1>
        <p className="text-slate-400 mb-8">Search for pins using Brave Search to extract data and build your collection index.</p>

        {/* Search Panel */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <input
            type="text"
            placeholder="e.g., Mickey Mouse Sorcerer Hat Pin 2024"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-slate-800 border border-slate-700 rounded px-4 py-2 text-white focus:outline-none focus:border-sky-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-sky-500 hover:bg-sky-600 disabled:bg-slate-700 px-6 py-2 rounded font-medium transition"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Global Action Status Message Bar */}
        {statusMessage && (
          <div className="bg-slate-800 border-l-4 border-sky-500 text-slate-300 p-3 mb-6 rounded text-sm">
            {statusMessage}
          </div>
        )}

        {/* Live Search Discovery Grid */}
        <div className="space-y-4">
          {pins.map((pin, idx) => (
            <div key={idx} className="bg-slate-800 border border-slate-700 rounded p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="font-semibold text-lg text-white" dangerouslySetInnerHTML={{ __html: pin.title }} />
                <p className="text-sm text-slate-400 mt-1" dangerouslySetInnerHTML={{ __html: pin.description }} />
                <a href={pin.url} target="_blank" rel="noreferrer" className="text-xs text-sky-400 hover:underline mt-2 inline-block">
                  View full historical source page →
                </a>
              </div>
              <button
                onClick={() => savePinToCollection(pin.title.replace(/<\/?[^>]+(>|\$)/g, ""))}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded shrink-0 transition"
              >
                ➕ Add to Database
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
