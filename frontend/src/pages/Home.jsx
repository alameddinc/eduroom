import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Home() {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [teacherPassword, setTeacherPassword] = useState('');
  const [requireApproval, setRequireApproval] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState('python');

  const createRoom = async () => {
    if (!teacherPassword) {
      alert('Lütfen bir parola belirleyin');
      return;
    }
    
    setIsCreating(true);
    try {
      const response = await axios.post('/api/rooms/create', {
        teacherId: `teacher-${Date.now()}`,
        config: {
          language: selectedLanguage,
          allowedLanguages: [selectedLanguage], // Only allow selected language
          password: teacherPassword,
          requireApproval
        }
      });
      
      const newRoomId = response.data.room.id;
      localStorage.setItem(`room-${newRoomId}-password`, teacherPassword);
      navigate(`/teacher/${newRoomId}`);
    } catch (error) {
      console.error('Error creating room:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const joinAsStudent = () => {
    if (roomId && studentName) {
      localStorage.setItem('studentName', studentName);
      navigate(`/student/${roomId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center p-4">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent mb-4">
            EduRoom
          </h1>
          <p className="text-xl text-gray-600">İnteraktif Kod Eğitimi Platformu</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div className="card hover:scale-105 transition-transform duration-300 animate-slide-in">
            <div className="p-8">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-800">Öğretmen</h2>
              </div>
              
              <p className="text-gray-600 mb-8">
                Yeni bir oda oluşturun ve öğrencilerinizle interaktif kod dersleri verin
              </p>
              
              <button
                onClick={() => setShowTeacherModal(true)}
                className="w-full btn-primary py-3 text-lg font-semibold rounded-xl flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Yeni Oda Oluştur
              </button>
            </div>
          </div>

          <div className="card hover:scale-105 transition-transform duration-300 animate-slide-in" style={{animationDelay: '0.1s'}}>
            <div className="p-8">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-800">Öğrenci</h2>
              </div>
              
              <p className="text-gray-600 mb-8">
                Oda ID'si ile derse katılın ve öğretmeninizle birlikte kod yazın
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Adınız</label>
                  <input
                    type="text"
                    placeholder="Örn: Ali Yılmaz"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Oda ID</label>
                  <input
                    type="text"
                    placeholder="Öğretmeninizden aldığınız ID"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                  />
                </div>
                
                <button
                  onClick={joinAsStudent}
                  disabled={!roomId || !studentName}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-3 rounded-xl font-semibold transition-all duration-200 hover:shadow-lg flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Derse Katıl
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-12 text-center text-gray-500 animate-fade-in" style={{animationDelay: '0.2s'}}>
          <p className="text-sm">
            💡 İpucu: Öğretmenler oda oluşturduktan sonra ID'yi öğrencilerle paylaşmalıdır
          </p>
        </div>
      </div>

      {/* Teacher Modal */}
      {showTeacherModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 animate-slide-in">
            <h3 className="text-2xl font-bold mb-4">Öğretmen Ayarları</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Oda Parolası
                </label>
                <input
                  type="password"
                  placeholder="Güvenli bir parola belirleyin"
                  value={teacherPassword}
                  onChange={(e) => setTeacherPassword(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Bu parolayı öğrencilerle paylaşmayın, sadece siz kullanacaksınız
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Programlama Dili
                </label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                >
                  <option value="python">Python</option>
                  <option value="go">Go</option>
                  <option value="sql">SQL</option>
                  <option value="javascript">JavaScript</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Seçtiğiniz dil oda boyunca sabit kalacaktır
                </p>
              </div>
              
              <div>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={requireApproval}
                    onChange={(e) => setRequireApproval(e.target.checked)}
                    className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Öğrenci katılımları için onay gereksin
                  </span>
                </label>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowTeacherModal(false);
                  setTeacherPassword('');
                }}
                className="flex-1 btn-secondary rounded-xl"
              >
                İptal
              </button>
              <button
                onClick={() => {
                  setShowTeacherModal(false);
                  createRoom();
                }}
                disabled={!teacherPassword || isCreating}
                className="flex-1 btn-primary rounded-xl flex items-center justify-center gap-2"
              >
                {isCreating ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Oluşturuluyor...
                  </>
                ) : (
                  'Oda Oluştur'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;