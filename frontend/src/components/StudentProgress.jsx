import React, { useState, useEffect } from 'react';
import useSocket from '../hooks/useSocket';
import DiffViewer from './DiffViewer';

function StudentProgress({ roomId }) {
  const socket = useSocket();
  const [submissions, setSubmissions] = useState({});
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    if (socket) {
      socket.on('student-progress', (progress) => {
        const key = `${progress.userId}-${progress.questionId}`;
        setSubmissions(prev => ({
          ...prev,
          [key]: progress
        }));
      });

      return () => {
        socket.off('student-progress');
      };
    }
  }, [socket]);

  const getStudentSubmissions = (studentId) => {
    return Object.entries(submissions)
      .filter(([key]) => key.startsWith(`${studentId}-`))
      .map(([, submission]) => submission);
  };

  const uniqueStudents = [...new Set(
    Object.keys(submissions).map(key => key.split('-')[0])
  )];

  return (
    <div className="h-full flex flex-col">
      <div className="bg-gray-800 text-white px-4 py-3 font-medium">
        Öğrenci İlerlemesi
      </div>
      
      <div className="flex-1 flex">
        <div className="w-48 border-r bg-gray-50">
          <div className="p-2 text-sm font-medium text-gray-600">Öğrenciler</div>
          {uniqueStudents.map(studentId => (
            <button
              key={studentId}
              onClick={() => setSelectedStudent(studentId)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                selectedStudent === studentId ? 'bg-blue-100 text-blue-700' : ''
              }`}
            >
              {studentId}
            </button>
          ))}
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          {selectedStudent ? (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">{selectedStudent} - Gönderimler</h3>
              {getStudentSubmissions(selectedStudent).map((submission, idx) => (
                <div key={idx} className="border rounded-lg p-4">
                  <div className="mb-3">
                    <span className="text-sm text-gray-600">Soru ID: </span>
                    <span className="font-medium">{submission.questionId}</span>
                  </div>
                  
                  {submission.answer?.studentCode && (
                    <div className="mb-3">
                      <div className="text-sm font-medium mb-1">Öğrenci Kodu:</div>
                      <pre className="bg-gray-900 text-gray-100 p-3 rounded text-sm overflow-x-auto">
                        {submission.answer.studentCode}
                      </pre>
                    </div>
                  )}

                  {submission.answer?.expectedOutput && (
                    <DiffViewer
                      expected={submission.answer.expectedOutput}
                      actual={submission.answer.actualOutput || ''}
                      passed={submission.answer.passed || false}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              Sol taraftan bir öğrenci seçin
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StudentProgress;