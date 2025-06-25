import React, { useMemo } from 'react';
import { useRoomStore } from '../store/roomStore';

function QuestionCard({ question, isTeacher, studentId, onSelect, isActive, submissions, onTest }) {
  const { room } = useRoomStore();
  
  // Check if current student passed this question
  const studentSubmission = submissions[`${studentId}-${question.id}`];
  const hasStudentPassed = studentSubmission?.answer?.passed;
  
  const studentStats = useMemo(() => {
    if (!isTeacher || !room?.students) return null;
    
    const stats = {
      total: room.students.length,
      completed: 0,
      working: 0,
      failed: 0
    };
    
    room.students.forEach(student => {
      const submission = submissions[`${student.id}-${question.id}`];
      if (submission?.answer?.passed) {
        stats.completed++;
      } else if (student.currentQuestionId === question.id) {
        stats.working++;
      } else if (submission && !submission.answer?.passed) {
        stats.failed++;
      }
    });
    
    return stats;
  }, [isTeacher, room?.students, submissions, question.id]);

  return (
    <div className={`
      group relative overflow-hidden rounded-xl transition-all duration-300
      ${isActive 
        ? 'ring-2 ring-primary-500 shadow-glow scale-[1.02]' 
        : 'hover:shadow-xl hover:scale-[1.01]'
      }
      ${hasStudentPassed && !isTeacher ? 'bg-gradient-to-br from-green-50 to-green-100' : ''}
      ${isTeacher ? 'bg-gradient-to-br from-gray-50 to-gray-100' : !hasStudentPassed ? 'bg-white' : ''}
      border ${hasStudentPassed && !isTeacher ? 'border-green-300' : 'border-gray-200'} hover:border-gray-300
    `}>
      {/* Status bar for teacher */}
      {isTeacher && studentStats && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200">
          <div 
            className="h-full bg-green-500 transition-all duration-500"
            style={{ width: `${(studentStats.completed / studentStats.total) * 100}%` }}
          />
        </div>
      )}
      
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">
              {question.title}
            </h3>
            {question.description && (
              <p className="text-sm text-gray-600 line-clamp-2">
                {question.description}
              </p>
            )}
          </div>
          
          {isTeacher && studentStats && (
            <div className="ml-4 text-right">
              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-gray-600">{studentStats.completed}</span>
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-gray-600">{studentStats.working}</span>
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-gray-600">{studentStats.failed}</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Code preview */}
        {question.testCode && (
          <div className="mb-4">
            <div className="bg-dark-300 text-gray-100 rounded-lg p-3 text-sm font-mono overflow-hidden">
              <div className="text-xs text-gray-400 mb-1">Örnek Kod:</div>
              <pre className="whitespace-pre-wrap line-clamp-3">
                {question.testCode}
              </pre>
            </div>
          </div>
        )}

        {/* Expected output */}
        <div className="mb-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-xs font-medium text-green-700 mb-1">Beklenen Çıktı:</div>
            <pre className="text-sm font-mono text-green-900 whitespace-pre-wrap line-clamp-2">
              {question.expectedOutput || '(Çıktı yok)'}
            </pre>
          </div>
        </div>

        {/* Actions */}
        {!isTeacher && (
          <div className="flex gap-2">
            {hasStudentPassed ? (
              <div className="flex-1 bg-green-100 text-green-800 py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 border border-green-300">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Başarıyla Tamamlandı
              </div>
            ) : !isActive ? (
              <button
                onClick={() => onSelect(question)}
                className="flex-1 btn-primary rounded-lg flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                Soruya Geç
              </button>
            ) : (
              <button
                onClick={() => onTest(question.id)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Test Et
              </button>
            )}
          </div>
        )}

        {/* Student list for teachers */}
        {isTeacher && studentStats && studentStats.total > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <details className="group/details">
              <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800 flex items-center gap-2">
                <svg className="w-4 h-4 transition-transform group-open/details:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Öğrenci Detayları
              </summary>
              <div className="mt-3 space-y-1">
                {room.students.map(student => {
                  const submission = submissions[`${student.id}-${question.id}`];
                  const status = submission?.answer?.passed 
                    ? 'completed' 
                    : student.currentQuestionId === question.id 
                      ? 'working' 
                      : submission 
                        ? 'failed' 
                        : 'waiting';
                  
                  return (
                    <div key={student.id} className="flex items-center gap-2 text-sm">
                      <div className={`w-2 h-2 rounded-full ${
                        status === 'completed' ? 'bg-green-500' :
                        status === 'working' ? 'bg-blue-500 animate-pulse' :
                        status === 'failed' ? 'bg-red-500' :
                        'bg-gray-300'
                      }`} />
                      <span className="text-gray-700">{student.id}</span>
                      {submission?.answer?.error && (
                        <span className="text-xs text-red-600 ml-auto">Hata</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}

export default QuestionCard;