import React from 'react';
import Editor from '@monaco-editor/react';

function CodeEditor({ code, onChange, language, readOnly, title }) {
  const handleEditorChange = (value) => {
    onChange(value || '');
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {title && (
        <div className="bg-gray-800 text-white px-4 py-2 text-sm font-medium border-b border-gray-700">
          {title}
        </div>
      )}
      <div className="flex-1">
        <Editor
          height="100%"
          language={language}
          value={code}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 16,
            lineHeight: 24,
            padding: { top: 16, bottom: 16 },
            fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
            fontLigatures: true,
            readOnly,
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            renderLineHighlight: 'all',
            scrollbar: {
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10
            },
            lineNumbers: 'on',
            glyphMargin: true,
            folding: true,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 3
          }}
        />
      </div>
    </div>
  );
}

export default CodeEditor;