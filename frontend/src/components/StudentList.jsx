import React from 'react';

function StudentList({ students, pendingStudents, onStudentClick, onApprove, onReject }) {
  const getStudentStatus = (student) => {
    if (!student.online) return { color: 'gray', text: 'Çevrimdışı' };
    if (student.currentQuestionId) return { color: 'blue', text: 'Soru Çözüyor' };
    return { color: 'green', text: 'Çevrimiçi' };
  };

  return (
    <div className="h-full flex flex-col bg-dark-100 text-white">
      <div className="bg-dark-200 px-4 py-3 font-medium border-b border-gray-700 flex items-center justify-between">
        <span>Öğrenciler</span>
        <div className="flex items-center gap-2">
          {pendingStudents && pendingStudents.length > 0 && (
            <span className="text-xs bg-orange-600 px-2 py-1 rounded-full animate-pulse">
              {pendingStudents.length} bekliyor
            </span>
          )}
          <span className="text-sm bg-primary-600 px-2 py-1 rounded-full">{students.length}</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {students.length === 0 && (!pendingStudents || pendingStudents.length === 0) ? (
          <div className="text-center text-gray-400 py-8">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className="text-sm">Henüz öğrenci katılmadı</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Pending Students */}
            {pendingStudents && pendingStudents.map((student) => (
              <div
                key={student.id}
                className="p-3 rounded-lg bg-orange-900/20 border border-orange-700 animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    <div>
                      <div className="font-medium">{student.id}</div>
                      <div className="text-xs text-orange-400">Onay bekliyor</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onApprove && onApprove(student.id)}
                      className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs transition-colors"
                    >
                      Onayla
                    </button>
                    <button
                      onClick={() => onReject && onReject(student.id)}
                      className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs transition-colors"
                    >
                      Reddet
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Active Students */}
            {students.map((student) => {
              const status = getStudentStatus(student);
              return (
                <div
                  key={student.id}
                  onClick={() => onStudentClick && onStudentClick(student)}
                  className="group p-3 rounded-lg bg-dark-200 hover:bg-dark-300 transition-all duration-200 cursor-pointer border border-gray-700 hover:border-gray-600"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full animate-pulse bg-${status.color}-500`} />
                      <div>
                        <div className="font-medium">{student.id}</div>
                        {student.currentQuestionId && (
                          <div className="text-xs text-gray-400 mt-1">
                            Soru: {student.currentQuestionId.slice(0, 8)}...
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded bg-${status.color}-900/30 text-${status.color}-400 border border-${status.color}-800/50`}>
                        {status.text}
                      </span>
                      <svg className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Katılım: {new Date(student.joinedAt).toLocaleTimeString('tr-TR')}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentList;