import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import CodeEditor from '../components/CodeEditor';
import QuestionPanel from '../components/QuestionPanel';
import CodeRunner from '../components/CodeRunner';
import useSocket from '../hooks/useSocket';
import { useRoomStore } from '../store/roomStore';
import { getDefaultCode } from '../utils/codeTemplates';

function StudentRoom() {
  const { roomId } = useParams();
  const socket = useSocket();
  const { room, setRoom, updateCode } = useRoomStore();
  const [studentCode, setStudentCode] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [teacherHighlight, setTeacherHighlight] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState('');
  const studentName = localStorage.getItem('studentName') || 'Student';
  
  // Save room-student association to handle refresh
  useEffect(() => {
    if (roomId && studentName) {
      localStorage.setItem(`room-${roomId}-student`, studentName);
    }
  }, [roomId, studentName]);

  useEffect(() => {
    if (socket) {
      const joinRoom = () => {
        socket.emit('join-room', {
          roomId,
          userId: studentName,
          role: 'student'
        });
      };
      
      // Join immediately
      joinRoom();
      
      // Rejoin on reconnect
      socket.on('connect', joinRoom);

      socket.on('pending-approval', ({ message }) => {
        setPendingApproval(true);
        setApprovalMessage(message);
      });

      socket.on('approval-status', ({ approved, message }) => {
        if (approved) {
          setPendingApproval(false);
          setApprovalMessage('');
        } else {
          setApprovalMessage(message || 'Reddedildiniz');
          setTimeout(() => window.location.href = '/', 3000);
        }
      });

      socket.on('room-state', (roomData) => {
        setRoom(roomData);
        setPendingApproval(false); // Clear pending state if we get room state
        if (!studentCode && roomData?.config?.language) {
          setStudentCode(getDefaultCode(roomData.config.language));
        }
      });

      socket.on('code-update', ({ code, language }) => {
        updateCode(code);
        if (language && room) {
          setRoom({ ...room, config: { ...room.config, language } });
        }
      });

      socket.on('new-question', (question) => {
        console.log('New question received:', question);
        // Update room with new question
        setRoom(prevRoom => {
          if (!prevRoom) return null;
          
          // Check if question already exists
          const exists = prevRoom.questions?.some(q => q.id === question.id);
          if (exists) return prevRoom;
          
          return {
            ...prevRoom,
            questions: [...(prevRoom.questions || []), question]
          };
        });
      });

      socket.on('teacher-highlight-received', ({ selection }) => {
        setTeacherHighlight(selection);
        // Clear after 60 seconds instead of 5
        setTimeout(() => setTeacherHighlight(null), 60000);
      });

      socket.on('banned', ({ message, bannedUntil }) => {
        alert(message);
        localStorage.removeItem(`room-${roomId}-student`);
        window.location.href = '/';
      });

      socket.on('kicked', ({ message, bannedUntil }) => {
        alert(message);
        localStorage.removeItem(`room-${roomId}-student`);
        window.location.href = '/';
      });
      
      return () => {
        socket.off('connect');
        socket.off('pending-approval');
        socket.off('approval-status');
        socket.off('room-state');
        socket.off('code-update');
        socket.off('new-question');
        socket.off('teacher-highlight-received');
        socket.off('banned');
        socket.off('kicked');
      };
    }
  }, [socket, roomId, studentName]);

  useEffect(() => {
    if (socket && studentCode) {
      const timer = setTimeout(() => {
        socket.emit('student-code-update', {
          roomId,
          userId: studentName,
          code: studentCode,
          questionId: currentQuestion?.id
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [socket, studentCode, roomId, studentName, currentQuestion]);

  const handleTerminalOutput = ({ output, error }) => {
    if (socket) {
      socket.emit('student-terminal-output', {
        roomId,
        userId: studentName,
        output,
        error
      });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 shadow-lg">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold">{studentName}</h1>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="opacity-80">Oda ID:</span>
            <span className="font-mono bg-white/20 px-3 py-1 rounded-lg">{roomId}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(roomId);
                setCopySuccess(true);
                setTimeout(() => setCopySuccess(false), 2000);
              }}
              className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors group relative"
              title="Kopyala"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {copySuccess && (
                <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  Kopyalandı!
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex gap-4 p-4">
        <div className="flex-1 flex flex-col gap-4">
          {!currentQuestion && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">Başlamak için sağdaki sorulardan birini seçin</span>
              </div>
            </div>
          )}
          {currentQuestion && (
            <div className="card flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500">
              <div className="flex-1">
                <span className="text-sm text-gray-600">Aktif Soru</span>
                <h3 className="font-semibold text-lg">{currentQuestion.title}</h3>
                {currentQuestion.description && (
                  <p className="text-sm text-gray-700 mt-1">{currentQuestion.description}</p>
                )}
              </div>
              <button
                onClick={() => {
                  setCurrentQuestion(null);
                  setStudentCode(getDefaultCode(room?.config?.language || 'python'));
                }}
                className="text-sm text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1 rounded-lg transition-colors ml-4"
              >
                × Kapat
              </button>
            </div>
          )}
          
          {teacherHighlight && (
            <div className="card p-3 bg-yellow-50 border-l-4 border-yellow-400 animate-pulse-slow relative">
              <button
                onClick={() => setTeacherHighlight(null)}
                className="absolute top-2 right-2 text-yellow-600 hover:text-yellow-800 p-1"
                title="Kapat"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="flex items-center gap-2 text-yellow-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <span className="font-medium">Öğretmen bir bölümü işaretledi</span>
              </div>
              {teacherHighlight.text && (
                <pre className="mt-2 p-2 bg-yellow-100 rounded text-sm font-mono">{teacherHighlight.text}</pre>
              )}
              {teacherHighlight.comment && (
                <div className="mt-2 p-2 bg-yellow-50 rounded">
                  <span className="text-sm font-medium text-yellow-900">Öğretmen notu:</span>
                  <p className="text-sm text-yellow-800 mt-1">{teacherHighlight.comment}</p>
                </div>
              )}
            </div>
          )}
          
          <div className="flex-1 flex gap-4">
            <div className="flex-1 card-dark overflow-hidden">
              <CodeEditor
                code={studentCode}
                onChange={setStudentCode}
                language={room?.config?.language || 'python'}
                readOnly={false}
                title="Kod Editörü"
              />
            </div>
            
            <div className="w-96 card-dark overflow-hidden">
              <CodeRunner 
                code={studentCode} 
                language={room?.config?.language || 'python'}
                onOutput={handleTerminalOutput}
                userId={studentName}
                roomId={roomId}
              />
            </div>
          </div>
        </div>

        <div className="w-96 card overflow-hidden">
          <QuestionPanel 
            roomId={roomId} 
            isTeacher={false} 
            studentId={studentName}
            studentCode={studentCode}
            onQuestionSelect={(question) => {
              setCurrentQuestion(question);
              // If testCode is empty or just whitespace, use default code
              const code = question.testCode && question.testCode.trim() 
                ? question.testCode 
                : getDefaultCode(room?.config?.language || 'python');
              setStudentCode(code);
            }}
            currentQuestionId={currentQuestion?.id}
          />
        </div>
      </div>

      {/* Pending Approval Modal */}
      {pendingApproval && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-2">Onay Bekleniyor</h3>
            <p className="text-gray-600 mb-4">{approvalMessage}</p>
            <div className="animate-pulse">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-500 animate-slide-loading"></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentRoom;