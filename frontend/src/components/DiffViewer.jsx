import React from 'react';

function DiffViewer({ expected, actual, passed }) {
  const expectedLines = expected.split('\n');
  const actualLines = actual.split('\n');
  const maxLines = Math.max(expectedLines.length, actualLines.length);

  const getDiffLines = () => {
    const lines = [];
    
    for (let i = 0; i < maxLines; i++) {
      const expectedLine = expectedLines[i] || '';
      const actualLine = actualLines[i] || '';
      const isMatch = expectedLine === actualLine;
      
      lines.push({
        lineNumber: i + 1,
        expected: expectedLine,
        actual: actualLine,
        isMatch
      });
    }
    
    return lines;
  };

  const diffLines = getDiffLines();

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className={`px-3 py-2 text-sm font-medium ${passed ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
        {passed ? '✓ Test Başarılı' : '✗ Test Başarısız'}
      </div>
      
      {!passed && (
        <div className="bg-gray-50 p-3">
          <div className="text-sm font-medium mb-2">Çıktı Karşılaştırması:</div>
          <div className="bg-white border rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="p-2 text-left w-12">#</th>
                  <th className="p-2 text-left">Beklenen</th>
                  <th className="p-2 text-left">Senin Çıktın</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {diffLines.map((line) => (
                  <tr 
                    key={line.lineNumber} 
                    className={`border-b ${!line.isMatch ? 'bg-red-50' : ''}`}
                  >
                    <td className="p-2 text-gray-500">{line.lineNumber}</td>
                    <td className={`p-2 ${!line.isMatch ? 'bg-red-100' : ''}`}>
                      <pre className="whitespace-pre-wrap">{line.expected || <span className="text-gray-400">(boş satır)</span>}</pre>
                    </td>
                    <td className={`p-2 ${!line.isMatch ? 'bg-red-100' : ''}`}>
                      <pre className="whitespace-pre-wrap">{line.actual || <span className="text-gray-400">(boş satır)</span>}</pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="font-medium mb-1">Beklenen Çıktı:</div>
              <pre className="bg-green-50 p-2 rounded font-mono text-xs whitespace-pre-wrap">
                {expected}
              </pre>
            </div>
            <div>
              <div className="font-medium mb-1">Senin Çıktın:</div>
              <pre className="bg-red-50 p-2 rounded font-mono text-xs whitespace-pre-wrap">
                {actual}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DiffViewer;