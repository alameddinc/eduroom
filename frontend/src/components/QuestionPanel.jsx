import React, { useState, useEffect } from 'react';
import axios from 'axios';
import useSocket from '../hooks/useSocket';
import DiffViewer from './DiffViewer';
import QuestionCard from './QuestionCard';
import { useRoomStore } from '../store/roomStore';

function QuestionPanel({ roomId, isTeacher, studentId, studentCode, onQuestionSelect, currentQuestionId }) {
  const socket = useSocket();
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState({
    title: '',
    description: '',
    testCode: '',
    expectedOutput: ''
  });
  const [submissions, setSubmissions] = useState({});
  const [runningTests, setRunningTests] = useState({});
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [allSubmissions, setAllSubmissions] = useState({});
  const { room } = useRoomStore();

  useEffect(() => {
    // Sync questions from room state if available
    if (room?.questions) {
      setQuestions(room.questions);
    }
  }, [room?.questions]);

  useEffect(() => {
    loadQuestions();
    
    if (socket) {
      socket.on('new-question', (question) => {
        setQuestions(prev => [...prev, question]);
      });

      socket.on('answer-submitted', ({ userId, questionId, timestamp }) => {
        if (isTeacher) {
          console.log(`${userId} submitted answer for question ${questionId}`);
        }
      });

      socket.on('student-progress', (progress) => {
        const key = `${progress.userId}-${progress.questionId}`;
        setAllSubmissions(prev => ({
          ...prev,
          [key]: progress
        }));
        
        if (isTeacher && progress.questionId === selectedSubmission?.questionId) {
          setSelectedSubmission(progress);
        }
      });

      return () => {
        socket.off('new-question');
        socket.off('answer-submitted');
        socket.off('student-progress');
      };
    }
  }, [socket, isTeacher]);

  const loadQuestions = async () => {
    try {
      const response = await axios.get(`/api/rooms/${roomId}`);
      if (response.data.room) {
        if (response.data.room.questions) {
          setQuestions(response.data.room.questions);
        }
        
        // Load submissions from room data
        if (response.data.room.submissions) {
          const roomSubmissions = response.data.room.submissions;
          const formattedSubmissions = {};
          
          // Convert server submissions to local format
          Object.entries(roomSubmissions).forEach(([key, submission]) => {
            formattedSubmissions[key] = {
              userId: submission.userId,
              questionId: submission.questionId,
              answer: submission.answer
            };
          });
          
          setAllSubmissions(formattedSubmissions);
          
          // If student, extract their submissions
          if (!isTeacher && studentId) {
            const studentSubmissions = {};
            Object.entries(roomSubmissions).forEach(([key, submission]) => {
              if (submission.userId === studentId) {
                studentSubmissions[submission.questionId] = submission.answer;
              }
            });
            setSubmissions(studentSubmissions);
          }
        }
      }
    } catch (error) {
      console.error('Error loading questions:', error);
    }
  };

  const createQuestion = () => {
    if (isTeacher && newQuestion.title && newQuestion.testCode) {
      socket.emit('create-question', { 
        roomId, 
        question: {
          ...newQuestion,
          type: 'code-output'
        }
      });
      setNewQuestion({ 
        title: '', 
        description: '', 
        testCode: '',
        expectedOutput: '' 
      });
    }
  };

  const runTest = async (questionId) => {
    const question = questions.find(q => q.id === questionId);
    if (!question || !studentCode) return;

    setRunningTests({ ...runningTests, [questionId]: true });

    try {
      const room = await axios.get(`/api/rooms/${roomId}`);
      const language = room.data.room?.config?.language || 'python';
      
      const response = await axios.post('/api/code/run', {
        code: studentCode,
        language: language,
        stdin: question.stdin || ''
      });

      const submission = {
        questionId,
        studentCode,
        actualOutput: response.data.result.stdout,
        expectedOutput: question.expectedOutput,
        passed: response.data.result.stdout.trim() === question.expectedOutput.trim(),
        error: response.data.result.stderr,
        timestamp: new Date()
      };

      setSubmissions({ ...submissions, [questionId]: submission });
      
      // Also update allSubmissions for QuestionCard
      const key = `${studentId}-${questionId}`;
      setAllSubmissions(prev => ({
        ...prev,
        [key]: { userId: studentId, questionId, answer: submission }
      }));

      if (!isTeacher && socket) {
        socket.emit('submit-answer', {
          roomId,
          userId: studentId,
          questionId,
          answer: submission
        });
      }
    } catch (error) {
      console.error('Error running test:', error);
      const errorMsg = error.response?.data?.details || error.response?.data?.error || 'Test çalıştırılamadı';
      const errorSubmission = {
        questionId,
        studentCode,
        actualOutput: '',
        expectedOutput: question.expectedOutput,
        passed: false,
        error: errorMsg,
        timestamp: new Date()
      };
      
      setSubmissions({ 
        ...submissions, 
        [questionId]: errorSubmission
      });
      
      // Also update allSubmissions for QuestionCard
      const key = `${studentId}-${questionId}`;
      setAllSubmissions(prev => ({
        ...prev,
        [key]: { userId: studentId, questionId, answer: errorSubmission }
      }));
    } finally {
      setRunningTests({ ...runningTests, [questionId]: false });
    }
  };

  const runExpectedOutput = async () => {
    if (!newQuestion.testCode) return;

    try {
      const room = await axios.get(`/api/rooms/${roomId}`);
      const language = room.data.room?.config?.language || 'python';
      
      const response = await axios.post('/api/code/run', {
        code: newQuestion.testCode,
        language: language,
        stdin: ''
      });

      setNewQuestion({
        ...newQuestion,
        expectedOutput: response.data.result.stdout
      });
    } catch (error) {
      console.error('Error running test code:', error);
      alert('Kod çalıştırma hatası: ' + (error.response?.data?.details || error.response?.data?.error || 'Bilinmeyen hata'));
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-4 py-3 font-medium flex items-center justify-between">
        <span className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Sorular
        </span>
        <span className="text-sm bg-white/20 px-2 py-1 rounded-full">
          {questions.length}
        </span>
      </div>
      
      {isTeacher && (
        <div className="p-4 border-b space-y-3">
          <input
            type="text"
            placeholder="Soru başlığı"
            value={newQuestion.title}
            onChange={(e) => setNewQuestion({ ...newQuestion, title: e.target.value })}
            className="w-full p-2 border rounded"
          />
          <textarea
            placeholder="Açıklama (opsiyonel)"
            value={newQuestion.description}
            onChange={(e) => setNewQuestion({ ...newQuestion, description: e.target.value })}
            className="w-full p-2 border rounded h-16"
          />
          <div className="space-y-2">
            <label className="text-sm font-medium">Test Kodu:</label>
            <textarea
              placeholder="# Öğrencinin yazması gereken kod"
              value={newQuestion.testCode}
              onChange={(e) => setNewQuestion({ ...newQuestion, testCode: e.target.value })}
              className="w-full p-2 border rounded h-32 font-mono text-sm"
            />
            <button
              onClick={runExpectedOutput}
              className="w-full bg-gray-600 text-white py-2 rounded hover:bg-gray-700"
            >
              Beklenen Çıktıyı Oluştur
            </button>
          </div>
          {newQuestion.expectedOutput && (
            <div className="bg-gray-100 p-3 rounded">
              <label className="text-sm font-medium">Beklenen Çıktı:</label>
              <pre className="mt-1 font-mono text-sm whitespace-pre-wrap">
                {newQuestion.expectedOutput}
              </pre>
            </div>
          )}
          <button
            onClick={createQuestion}
            disabled={!newQuestion.title || !newQuestion.testCode || !newQuestion.expectedOutput}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            Soru Ekle
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {questions.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500">Henüz soru eklenmemiş</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {questions.map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                isTeacher={isTeacher}
                studentId={studentId}
                onSelect={onQuestionSelect}
                isActive={currentQuestionId === question.id}
                submissions={allSubmissions}
                onTest={runTest}
              />
            ))}
          </div>
        )}
        
        {/* Show submission results for students */}
        {!isTeacher && Object.keys(submissions).length > 0 && (
          <div className="mt-6 space-y-4">
            <h3 className="font-semibold text-gray-700">Test Sonuçları</h3>
            {Object.entries(submissions).map(([qId, submission]) => (
              <div key={qId} className="bg-white rounded-lg p-4 shadow">
                <div className="font-medium mb-2">
                  {questions.find(q => q.id === qId)?.title}
                </div>
                {submission.error ? (
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <div className="text-red-700 font-medium text-sm">Hata:</div>
                    <pre className="text-red-600 text-sm mt-1 whitespace-pre-wrap">
                      {submission.error}
                    </pre>
                  </div>
                ) : (
                  <DiffViewer
                    expected={submission.expectedOutput}
                    actual={submission.actualOutput}
                    passed={submission.passed}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default QuestionPanel;