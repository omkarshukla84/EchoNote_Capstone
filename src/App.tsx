import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles, Loader2, Copy, Check, Trash2 } from 'lucide-react';
import { supabase } from './lib/supabase';

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

function App() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [geminiResponse, setGeminiResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognitionAPI();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript + ' ';
          }
        }
        if (finalTranscript) {
          setTranscript(prev => prev + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      setError('Speech recognition is not supported in this browser.');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setError('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const processWithGemini = async () => {
    if (!transcript.trim()) {
      setError('Please record some speech first');
      return;
    }

    if (!geminiApiKey.trim()) {
      setError('Please enter your Gemini API key');
      return;
    }

    setIsProcessing(true);
    setError('');
    setGeminiResponse('');

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: customPrompt.trim()
                      ? `${customPrompt}\n\n${transcript}`
                      : `Please analyze and improve the following text. Provide a summary, correct any grammar issues, and suggest improvements:\n\n${transcript}`,
                  },
                ],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to process with Gemini API');
      }

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
      setGeminiResponse(generatedText);

      await supabase.from('speech_records').insert({
        transcript,
        gemini_response: generatedText,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearAll = () => {
    setTranscript('');
    setGeminiResponse('');
    setError('');
    setCopied(false);
    setCustomPrompt('');
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_50%)]" />
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-16 animate-in fade-in duration-700">
          <h1 className="text-7xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent mb-6 tracking-tight hover:scale-105 transition-transform duration-500 cursor-default bg-[length:200%_auto] animate-[gradient_3s_ease_infinite]">
            EchoNote
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto hover:text-slate-300 transition-colors duration-300">
            Transform your voice into intelligent insights with advanced AI processing
          </p>
        </div>

        <div className="mb-8 bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl p-6 hover:border-blue-500/30 hover:shadow-blue-500/10 transition-all duration-500 hover:scale-[1.01]">
          <label className="block text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2 group">
            <div className="w-1 h-4 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full group-hover:h-5 transition-all duration-300" />
            API Configuration
          </label>
          <input
            type="password"
            value={geminiApiKey}
            onChange={(e) => setGeminiApiKey(e.target.value)}
            placeholder="Enter your Gemini API key"
            className="w-full px-4 py-3 bg-slate-900/50 rounded-xl border border-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-slate-600 transition-all duration-300 text-slate-200 placeholder-slate-500"
          />
          <p className="mt-3 text-xs text-slate-500 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" />
            Get your API key from{' '}
            <a
              href="https://makersuite.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 underline decoration-cyan-500/30 hover:decoration-cyan-400 transition-colors"
            >
              Google AI Studio
            </a>
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl p-8 hover:border-blue-500/30 hover:shadow-blue-500/10 transition-all duration-500 hover:scale-[1.01] group">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full group-hover:h-10 transition-all duration-500" />
                <h2 className="text-2xl font-bold text-slate-100 group-hover:text-white transition-colors duration-300">Voice Input</h2>
              </div>
              <button
                onClick={toggleListening}
                className={`relative p-5 rounded-2xl transition-all duration-500 transform hover:scale-110 hover:rotate-3 ${
                  isListening
                    ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-500/50 hover:shadow-red-500/70'
                    : 'bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/50 hover:shadow-blue-500/70'
                }`}
              >
                {isListening && (
                  <span className="absolute -inset-1 bg-red-500 rounded-2xl animate-ping opacity-20" />
                )}
                {isListening ? (
                  <MicOff className="w-6 h-6 text-white relative z-10" />
                ) : (
                  <Mic className="w-6 h-6 text-white relative z-10" />
                )}
              </button>
            </div>

            {isListening && (
              <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                <div className="relative">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                </div>
                <span className="text-sm font-medium text-red-400">Recording in progress...</span>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-300 mb-3">
                Transcript
              </label>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Your speech will appear here..."
                className="w-full h-48 px-4 py-3 bg-slate-900/50 rounded-xl border border-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-slate-600 hover:bg-slate-900/70 transition-all duration-300 resize-none text-slate-200 placeholder-slate-600"
              />
            </div>

            <div className="mb-8">
              <label className="block text-sm font-semibold text-slate-300 mb-3">
                Custom Prompt (Optional)
              </label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="e.g., Extract all dates and names from the text above..."
                className="w-full h-24 px-4 py-3 bg-slate-900/50 rounded-xl border border-slate-700 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 hover:border-slate-600 hover:bg-slate-900/70 transition-all duration-300 resize-none text-slate-200 placeholder-slate-600 text-sm"
              />
              <p className="mt-2 text-xs text-slate-500 flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-cyan-500" />
                Leave empty for default analysis or write your own instructions
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={processWithGemini}
                disabled={isProcessing || !transcript.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-500 disabled:hover:to-cyan-500 transition-all duration-300 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/50 hover:scale-[1.03] hover:-translate-y-0.5"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Analyze with AI
                  </>
                )}
              </button>
              <button
                onClick={clearAll}
                className="px-6 py-4 bg-slate-700/50 text-slate-300 font-semibold rounded-xl hover:bg-slate-700 border border-slate-600 transition-all duration-300 hover:scale-[1.03] hover:-translate-y-0.5 hover:text-white hover:border-slate-500 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl p-8 hover:border-cyan-500/30 hover:shadow-cyan-500/10 transition-all duration-500 hover:scale-[1.01] group">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full group-hover:h-10 transition-all duration-500" />
                <h2 className="text-2xl font-bold text-slate-100 group-hover:text-white transition-colors duration-300">AI Analysis</h2>
              </div>
              {geminiResponse && (
                <button
                  onClick={() => copyToClipboard(geminiResponse)}
                  className="p-2.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 border border-slate-600 transition-all duration-300 hover:scale-110 hover:rotate-6 hover:border-slate-500"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-green-400" />
                  ) : (
                    <Copy className="w-5 h-5 text-slate-400" />
                  )}
                </button>
              )}
            </div>

            <div className="h-[28rem] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {geminiResponse ? (
                <div className="prose prose-invert max-w-none">
                  <div className="whitespace-pre-wrap text-slate-300 leading-relaxed">
                    {geminiResponse}
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="relative inline-block mb-6">
                      <Sparkles className="w-16 h-16 text-slate-700" />
                      <div className="absolute inset-0 blur-xl bg-cyan-500/20 animate-pulse" />
                    </div>
                    <p className="text-slate-500 text-lg">AI analysis will appear here</p>
                    <p className="text-slate-600 text-sm mt-2">Waiting for input...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-8 bg-red-500/10 border border-red-500/30 rounded-xl p-5 backdrop-blur-sm animate-in slide-in-from-top-4">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              <p className="text-red-400 font-medium">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
