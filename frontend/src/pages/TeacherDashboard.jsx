import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CodeEditor from '../components/CodeEditor';
import StudentList from '../components/StudentList';
import QuestionPanel from '../components/QuestionPanel';
import StudentProgress from '../components/StudentProgress';
import StudentCodeViewer from '../components/StudentCodeViewer';
import useSocket from '../hooks/useSocket';
import { useRoomStore } from '../store/roomStore';
import { getDefaultCode } from '../utils/codeTemplates';
import axios from 'axios';

function TeacherDashboard() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();
  const { room, setRoom, updateCode, setStudents, pendingStudents, setPendingStudents, addPendingStudent, removePendingStudent } = useRoomStore();
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [activeTab, setActiveTab] = useState('questions');
  const [studentTabs, setStudentTabs] = useState([]);
  const [activeStudentTab, setActiveStudentTab] = useState(null);
  const [studentCodes, setStudentCodes] = useState({});
  const [savedQuestions, setSavedQuestions] = useState([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(true);
  const [enteredPassword, setEnteredPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    // Check if password exists in localStorage
    const savedPassword = localStorage.getItem(`room-${roomId}-password`);
    if (savedPassword) {
      setEnteredPassword(savedPassword);
      setShowPasswordModal(false);
      joinAsTeacher(savedPassword);
    }
  }, [roomId]);

  const joinAsTeacher = (password) => {
    if (socket) {
      socket.emit('join-room', {
        roomId,
        userId: `teacher-${Date.now()}`,
        role: 'teacher',
        password
      });
    }
  };

  useEffect(() => {
    if (socket) {
      // Setup all listeners first
      socket.on('student-list', (students) => {
        if (students && Array.isArray(students)) {
          setStudents(students);
        }
      });
      
      socket.on('room-state', (roomData) => {
        setRoom(roomData);
        setSelectedLanguage(roomData.config.language);
        if (!roomData.code) {
          updateCode(getDefaultCode(roomData.config.language));
        }
        setShowPasswordModal(false);
        if (enteredPassword) {
          localStorage.setItem(`room-${roomId}-password`, enteredPassword);
        }
        // Set pending students from room data
        if (roomData.pendingStudents) {
          setPendingStudents(roomData.pendingStudents);
        }
      });

      socket.on('auth-error', ({ message }) => {
        setPasswordError(message);
        setShowPasswordModal(true);
      });

      socket.on('student-progress', (progress) => {
        // Handle student progress
      });

      socket.on('student-pending', ({ userId, socketId }) => {
        addPendingStudent({ id: userId, socketId });
      });

      socket.on('user-joined', ({ userId, role }) => {
        // Don't handle user-joined for students here
        // student-list event already handles the updated list
      });

      socket.on('student-live-code', ({ userId, code, questionId }) => {
        setStudentCodes(prev => ({
          ...prev,
          [userId]: { code, questionId, lastUpdate: new Date() }
        }));
      });
      
      // Rejoin room on reconnect - this should be last
      socket.on('connect', () => {
        if (enteredPassword) {
          joinAsTeacher(enteredPassword);
        } else {
          const savedPassword = localStorage.getItem(`room-${roomId}-password`);
          if (savedPassword) {
            joinAsTeacher(savedPassword);
          }
        }
      });
      
      // If socket is already connected, join immediately
      if (socket.connected) {
        const savedPassword = localStorage.getItem(`room-${roomId}-password`);
        if (savedPassword && !showPasswordModal) {
          joinAsTeacher(savedPassword);
        }
      }

      return () => {
        socket.off('connect');
        socket.off('room-state');
        socket.off('auth-error');
        socket.off('student-progress');
        socket.off('student-pending');
        socket.off('user-joined');
        socket.off('student-list');
        socket.off('student-live-code');
      };
    }
  }, [socket, roomId]);

  const handleCodeChange = (code) => {
    updateCode(code);
    if (socket) {
      socket.emit('code-change', { roomId, code, language: selectedLanguage });
    }
  };

  const handleLanguageChange = (language) => {
    setSelectedLanguage(language);
    const newCode = getDefaultCode(language);
    updateCode(newCode);
    if (socket) {
      socket.emit('code-change', { 
        roomId, 
        code: newCode, 
        language 
      });
    }
  };

  const openStudentTab = (student) => {
    if (!studentTabs.find(tab => tab.id === student.id)) {
      setStudentTabs([...studentTabs, student]);
    }
    setActiveStudentTab(student.id);
  };

  const closeStudentTab = (studentId) => {
    setStudentTabs(studentTabs.filter(tab => tab.id !== studentId));
    if (activeStudentTab === studentId) {
      setActiveStudentTab(null);
    }
  };

  const approveStudent = (studentId) => {
    if (socket) {
      socket.emit('approve-student', { roomId, studentId });
      
      // Remove from pending students using store function
      removePendingStudent(studentId);
    }
  };

  const rejectStudent = (studentId) => {
    if (socket) {
      socket.emit('reject-student', { roomId, studentId });
      removePendingStudent(studentId);
    }
  };

  const saveQuestionsAsCSV = () => {
    if (room?.questions?.length > 0) {
      const csvContent = [
        ['title', 'description', 'testCode', 'expectedOutput'],
        ...room.questions.map(q => [
          q.title,
          q.description || '',
          q.testCode || '',
          q.expectedOutput || ''
        ])
      ].map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `questions-${roomId}.csv`;
      link.click();
    }
  };

  const loadQuestionsFromCSV = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target.result;
          const lines = text.split('\n');
          const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
          
          const questions = [];
          for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
              const values = lines[i].match(/(".*?"|[^,]+)/g).map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"'));
              const question = {};
              headers.forEach((header, index) => {
                question[header] = values[index] || '';
              });
              if (question.title) {
                questions.push({
                  id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  ...question,
                  createdAt: new Date()
                });
              }
            }
          }
          
          await axios.put(`/api/rooms/${roomId}/questions`, { questions });
          setRoom({ ...room, questions });
          alert('Sorular yüklendi!');
        } catch (error) {
          console.error('Error loading CSV:', error);
          alert('CSV yükleme hatası!');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-4 shadow-lg">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold">Öğretmen Paneli</h1>
          </div>
          <div className="flex items-center gap-4">
            <label className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              CSV Yükle
              <input
                type="file"
                accept=".csv"
                onChange={loadQuestionsFromCSV}
                className="hidden"
              />
            </label>
            <button
              onClick={saveQuestionsAsCSV}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V2" />
              </svg>
              CSV İndir
            </button>
            <div className="text-sm flex items-center gap-2">
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
        </div>
      </header>

      <div className="flex-1 flex gap-4 p-4">
        <div className="flex-1 flex flex-col gap-4">
          <div className="bg-white rounded-lg shadow p-3 flex items-center gap-4">
            <label className="font-medium">Programlama Dili:</label>
            <select
              value={selectedLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="px-3 py-2 rounded border border-gray-300 focus:border-blue-500 focus:outline-none"
            >
              <option value="python">Python</option>
              <option value="go">Go</option>
              <option value="sql">SQL</option>
            </select>
          </div>
          <div className="flex-1 flex flex-col gap-4">
            {activeStudentTab ? (
              <StudentCodeViewer
                student={studentTabs.find(s => s.id === activeStudentTab)}
                language={selectedLanguage}
                onClose={() => setActiveStudentTab(null)}
                roomId={roomId}
              />
            ) : (
              <div className="flex-1 card-dark overflow-hidden">
                <CodeEditor
                  code={room?.code || ''}
                  onChange={handleCodeChange}
                  language={selectedLanguage}
                  readOnly={false}
                  title="Kod Editörü"
                />
              </div>
            )}
          </div>
        </div>

        <div className="w-96 flex flex-col gap-4">
          <div className="h-64 bg-white rounded-lg shadow-lg overflow-hidden">
            <StudentList 
              students={room?.students || []} 
              pendingStudents={pendingStudents}
              onStudentClick={openStudentTab}
              onApprove={approveStudent}
              onReject={rejectStudent}
            />
          </div>
          <div className="flex-1 bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('questions')}
                className={`flex-1 px-4 py-2 text-sm font-medium ${
                  activeTab === 'questions' 
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Sorular
              </button>
              <button
                onClick={() => setActiveTab('progress')}
                className={`flex-1 px-4 py-2 text-sm font-medium ${
                  activeTab === 'progress' 
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Öğrenci İlerlemesi
              </button>
            </div>
            <div className="flex-1">
              {activeTab === 'questions' ? (
                <QuestionPanel roomId={roomId} isTeacher={true} />
              ) : (
                <StudentProgress roomId={roomId} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 animate-slide-in">
            <h3 className="text-2xl font-bold mb-4">Öğretmen Girişi</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Oda Parolası
                </label>
                <input
                  type="password"
                  placeholder="Oda oluştururken belirlediğiniz parola"
                  value={enteredPassword}
                  onChange={(e) => setEnteredPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && joinAsTeacher(enteredPassword)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                />
                {passwordError && (
                  <p className="text-red-500 text-sm mt-2">{passwordError}</p>
                )}
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => navigate('/')}
                className="flex-1 btn-secondary rounded-xl"
              >
                İptal
              </button>
              <button
                onClick={() => joinAsTeacher(enteredPassword)}
                disabled={!enteredPassword}
                className="flex-1 btn-primary rounded-xl"
              >
                Giriş Yap
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default TeacherDashboard;