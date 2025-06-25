import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import useSocket from '../hooks/useSocket';

function StudentCodeViewer({ student, language, onClose, roomId }) {
  const socket = useSocket();
  const [code, setCode] = useState('');
  const [questionId, setQuestionId] = useState(null);
  const [terminalOutput, setTerminalOutput] = useState(null);
  const [selection, setSelection] = useState(null);

  useEffect(() => {
    if (socket) {
      const handleLiveCode = ({ userId, code: newCode, questionId: qId }) => {
        if (userId === student.id) {
          setCode(newCode);
          setQuestionId(qId);
        }
      };

      const handleTerminalUpdate = ({ userId, output, error }) => {
        if (userId === student.id) {
          setTerminalOutput({ output, error, timestamp: new Date() });
        }
      };

      socket.on('student-live-code', handleLiveCode);
      socket.on('student-terminal-update', handleTerminalUpdate);

      return () => {
        socket.off('student-live-code', handleLiveCode);
        socket.off('student-terminal-update', handleTerminalUpdate);
      };
    }
  }, [socket, student.id]);

  const handleEditorMount = (editor, monaco) => {
    editor.onDidChangeCursorSelection((e) => {
      const selection = editor.getSelection();
      const selectedText = editor.getModel().getValueInRange(selection);
      if (selectedText) {
        setSelection({ text: selectedText, range: selection });
      }
    });
  };

  const sendHighlight = () => {
    if (socket && selection) {
      socket.emit('teacher-highlight', {
        roomId,
        studentId: student.id,
        selection
      });
    }
  };

  return (
    <div className="h-full flex flex-col bg-dark-100">
      <div className="bg-dark-200 px-4 py-2 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${student.online ? 'bg-green-500' : 'bg-gray-500'} animate-pulse`} />
          <span className="text-white font-medium">{student.id}</span>
          {questionId && (
            <span className="text-xs bg-blue-900/50 text-blue-400 px-2 py-1 rounded">
              Soru: {questionId.slice(0, 8)}...
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {selection && (
        <div className="bg-yellow-900/20 border-b border-yellow-800/50 px-4 py-2 flex items-center justify-between">
          <span className="text-yellow-400 text-sm">Seçili: {selection.text.slice(0, 50)}...</span>
          <button
            onClick={sendHighlight}
            className="text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded transition-colors"
          >
            Öğrenciye Göster
          </button>
        </div>
      )}

      <div className="flex-1 flex">
        <div className="flex-1">
          <Editor
            height="100%"
            language={language}
            value={code || '// Öğrenci henüz kod yazmadı'}
            theme="vs-dark"
            onMount={handleEditorMount}
            options={{
              readOnly: true,
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              lineNumbers: 'on',
              glyphMargin: true,
              folding: true,
              lineDecorationsWidth: 0,
              lineNumbersMinChars: 3,
              renderLineHighlight: 'all',
              scrollbar: {
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10
              },
            }}
          />
        </div>

        {terminalOutput && (
          <div className="w-96 bg-dark-300 border-l border-gray-700 flex flex-col">
            <div className="bg-dark-200 px-4 py-2 text-white text-sm font-medium border-b border-gray-700">
              Terminal Çıktısı
            </div>
            <div className="flex-1 p-4 overflow-auto">
              {terminalOutput.error ? (
                <div className="text-red-400">
                  <div className="font-bold mb-2">Hata:</div>
                  <pre className="text-sm whitespace-pre-wrap">{terminalOutput.error}</pre>
                </div>
              ) : terminalOutput.output ? (
                <div className="text-green-400">
                  <div className="font-bold mb-2">Çıktı:</div>
                  <pre className="text-sm whitespace-pre-wrap">{terminalOutput.output}</pre>
                </div>
              ) : (
                <div className="text-gray-500 italic">Henüz çıktı yok</div>
              )}
              <div className="text-xs text-gray-600 mt-4">
                {new Date(terminalOutput.timestamp).toLocaleTimeString('tr-TR')}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentCodeViewer;