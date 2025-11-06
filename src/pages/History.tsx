import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Copy, Check, Trash2, ArrowLeft } from 'lucide-react';

interface SpeechRecord {
  id: string;
  transcript: string;
  gemini_response: string;
  created_at: string;
  title?: string;
}

interface HistoryPageProps {
  onBack: () => void;
}

export function HistoryPage({ onBack }: HistoryPageProps) {
  const [records, setRecords] = useState<SpeechRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<SpeechRecord | null>(null);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('speech_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setRecords(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteRecord = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('speech_records')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      setRecords(records.filter(r => r.id !== id));
      if (selectedRecord?.id === id) setSelectedRecord(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete record');
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError('Failed to copy to clipboard');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (selectedRecord) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_50%)]" />
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-700" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 py-12">
          <button
            onClick={() => setSelectedRecord(null)}
            className="mb-8 flex items-center gap-2 px-4 py-2 bg-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-700 hover:text-white transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to History
          </button>

          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-slate-100 mb-2">
                  {selectedRecord.title || 'Untitled Record'}
                </h2>
                <p className="text-slate-400 text-sm">
                  {formatDate(selectedRecord.created_at)}
                </p>
              </div>
              <button
                onClick={() => deleteRecord(selectedRecord.id)}
                className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-all"
              >
                <Trash2 className="w-5 h-5 text-red-400" />
              </button>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-200">Transcript</h3>
                  <button
                    onClick={() => copyToClipboard(selectedRecord.transcript, `transcript-${selectedRecord.id}`)}
                    className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-all"
                  >
                    {copied === `transcript-${selectedRecord.id}` ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700 max-h-96 overflow-y-auto">
                  <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {selectedRecord.transcript}
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-200">AI Analysis</h3>
                  <button
                    onClick={() => copyToClipboard(selectedRecord.gemini_response, `response-${selectedRecord.id}`)}
                    className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-all"
                  >
                    {copied === `response-${selectedRecord.id}` ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700 max-h-96 overflow-y-auto">
                  <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {selectedRecord.gemini_response}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_50%)]" />
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2">
              Your History
            </h1>
            <p className="text-slate-400">Browse and manage your saved recordings</p>
          </div>
          <button
            onClick={onBack}
            className="px-6 py-2 bg-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-700 hover:text-white transition-all font-medium"
          >
            Back
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        ) : records.length === 0 ? (
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl p-12 text-center">
            <p className="text-slate-400 text-lg">No recordings yet. Start by creating one!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {records.map(record => (
              <button
                key={record.id}
                onClick={() => setSelectedRecord(record)}
                className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 shadow-lg p-6 hover:border-blue-500/30 hover:shadow-blue-500/10 hover:bg-slate-800/70 transition-all duration-300 text-left group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-slate-200 group-hover:text-white transition-colors mb-2">
                      {record.title || 'Untitled Recording'}
                    </h3>
                    <p className="text-sm text-slate-400 mb-3">
                      {formatDate(record.created_at)}
                    </p>
                    <p className="text-slate-300 line-clamp-2 text-sm leading-relaxed">
                      {record.transcript}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteRecord(record.id);
                    }}
                    className="ml-4 p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-all flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
