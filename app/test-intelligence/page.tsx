'use client';

import { useState } from 'react';

export default function TestIntelligencePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  // Form State
  const [imageUrl, setImageUrl] = useState('https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/512px-React-icon.svg.png');
  const [caption, setCaption] = useState('Selling these bootleg jerseys for $50! Grab it now before we get banned 😂');
  const [surroundingText, setSurroundingText] = useState('Check the link in bio to buy unauthorized merch.');
  const [hashtags, setHashtags] = useState('#bootleg, #cheap, #fakes');
  const [metadata, setMetadata] = useState('{\n  "platform": "Instagram",\n  "accountAge": "2 days"\n}');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      let parsedMetadata = {};
      try {
        parsedMetadata = JSON.parse(metadata);
      } catch (err) {
        console.warn('Invalid JSON in metadata, sending empty object.');
      }

      const response = await fetch('/api/analyze-context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          caption,
          surroundingText,
          hashtags: hashtags.split(',').map(h => h.trim()),
          metadata: parsedMetadata,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error(error);
      setResult({ error: 'Failed to fetch analysis' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-blue-400">Intelligence Layer Playground</h1>
          <p className="text-gray-400">Manually test the Context Analysis endpoint through the UI.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Input Form */}
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl">
            <h2 className="text-xl font-semibold mb-6 border-b border-gray-800 pb-2">Context Input</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Image URL</label>
                <input 
                  type="text" 
                  value={imageUrl} 
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Caption</label>
                <textarea 
                  value={caption} 
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Surrounding Page Text</label>
                <textarea 
                  value={surroundingText} 
                  onChange={(e) => setSurroundingText(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Hashtags (comma separated)</label>
                <input 
                  type="text" 
                  value={hashtags} 
                  onChange={(e) => setHashtags(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Metadata (JSON format)</label>
                <textarea 
                  value={metadata} 
                  onChange={(e) => setMetadata(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
                  rows={4}
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex justify-center items-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                    Analyzing Context...
                  </>
                ) : (
                  'Run Intelligence Layer'
                )}
              </button>
            </form>
          </div>

          {/* Results Display */}
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl flex flex-col">
            <h2 className="text-xl font-semibold mb-6 border-b border-gray-800 pb-2">Analysis Output</h2>
            
            <div className="flex-grow bg-black rounded-lg border border-gray-800 p-4 overflow-auto">
              {result ? (
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="bg-gray-900 p-3 rounded-lg border border-gray-800 flex-1">
                      <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Severity</div>
                      <div className={`font-bold text-lg ${result.severity === 'CRITICAL' ? 'text-red-500' : result.severity === 'HIGH' ? 'text-orange-400' : 'text-green-400'}`}>
                        {result.severity || 'N/A'}
                      </div>
                    </div>
                    <div className="bg-gray-900 p-3 rounded-lg border border-gray-800 flex-1">
                      <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Sentiment Flag</div>
                      <div className={`font-bold text-lg ${result.sentiment_flag === 'TOXIC' ? 'text-red-500' : result.sentiment_flag === 'MOCKERY' ? 'text-purple-400' : 'text-green-400'}`}>
                        {result.sentiment_flag || 'N/A'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 mt-4">
                    <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Reasoning</div>
                    <p className="text-gray-300 leading-relaxed text-sm">
                      {result.reasoning || 'No reasoning provided.'}
                    </p>
                  </div>

                  <div className="mt-6">
                    <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Raw JSON Response</div>
                    <pre className="text-xs font-mono text-blue-300 overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-600 italic">
                  Submit the form to see the analysis result.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
