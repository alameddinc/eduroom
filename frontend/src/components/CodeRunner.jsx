import React, { useState, useEffect } from 'react';
import axios from 'axios';

function CodeRunner({ code, language, onOutput, userId, roomId }) {
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (onOutput && (output || error)) {
      onOutput({ output, error });
    }
  }, [output, error, onOutput]);

  const runCode = async () => {
    setIsRunning(true);
    setError('');
    setOutput('');

    try {
      const response = await axios.post('/api/code/run', {
        code,
        language,
        stdin: ''
      });

      if (response.data.success) {
        setOutput(response.data.result.stdout);
        if (response.data.result.stderr) {
          setError(response.data.result.stderr);
        }
      } else {
        setError(response.data.error);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.details || err.response?.data?.error || 'Kod çalıştırılamadı';
      setError(errorMessage);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-dark-100 text-white">
      <div className="flex items-center justify-between px-4 py-2 bg-dark-200 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm font-medium">Terminal & Çıktı</span>
        </div>
        <button
          onClick={runCode}
          disabled={isRunning || !code}
          className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-400 transition-all duration-200 flex items-center gap-2"
        >
          {isRunning ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Çalışıyor...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Çalıştır
            </>
          )}
        </button>
      </div>
      <div className="flex-1 p-4 font-mono text-sm overflow-auto bg-dark-300">
        {error && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-bold">Hata</span>
            </div>
            <pre className="whitespace-pre-wrap text-red-300 bg-red-900/20 p-3 rounded-lg border border-red-800/50">{error}</pre>
          </div>
        )}
        {output && (
          <div>
            <div className="flex items-center gap-2 text-green-400 mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-bold">Çıktı</span>
            </div>
            <pre className="whitespace-pre-wrap text-green-300 bg-green-900/20 p-3 rounded-lg border border-green-800/50">{output}</pre>
          </div>
        )}
        {!output && !error && !isRunning && (
          <div className="text-gray-500 italic flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {!code ? 'Kod yazın ve çalıştırın...' : 'Çalıştırmak için "Çalıştır" butonuna tıklayın'}
          </div>
        )}
      </div>
    </div>
  );
}

export default CodeRunner;