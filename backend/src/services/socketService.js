const roomService = require('./roomService');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', ({ roomId, userId, role, password }) => {
      const room = roomService.getRoom(roomId);
      if (!room) {
        socket.emit('error', { message: 'Oda bulunamadı' });
        return;
      }
      
      // Teacher password check
      if (role === 'teacher' && room.config.password) {
        if (password !== room.config.password) {
          socket.emit('auth-error', { message: 'Hatalı parola' });
          return;
        }
      }
      
      socket.join(roomId);
      const joinedRoom = roomService.joinRoom(roomId, userId, role, socket.id);
      
      if (joinedRoom) {
        if (role === 'student' && joinedRoom.config.requireApproval) {
          // Add to pending students if approval required
          roomService.addPendingStudent(roomId, userId, socket.id);
          socket.emit('pending-approval', { message: 'Öğretmen onayı bekleniyor...' });
          
          const teacher = joinedRoom.teacher;
          if (teacher && teacher.socketId) {
            io.to(teacher.socketId).emit('student-pending', { userId, socketId: socket.id });
          }
        } else {
          socket.emit('room-state', joinedRoom);
          
          if (role === 'student') {
            // Notify all users in room about new student
            io.to(roomId).emit('user-joined', { userId, role });
            
            // Send updated student list to all room members
            io.to(roomId).emit('student-list', joinedRoom.students);
          } else if (role === 'teacher') {
            // Send existing pending students to teacher when they join
            if (joinedRoom.pendingStudents && joinedRoom.pendingStudents.length > 0) {
              joinedRoom.pendingStudents.forEach(pending => {
                socket.emit('student-pending', { userId: pending.id, socketId: pending.socketId });
              });
            }
          }
        }
      }
    });

    socket.on('code-change', ({ roomId, code, language }) => {
      const room = roomService.updateRoomCode(roomId, code, language);
      socket.to(roomId).emit('code-update', { code, language });
    });

    socket.on('submit-answer', ({ roomId, userId, questionId, answer }) => {
      const result = roomService.submitAnswer(roomId, userId, questionId, answer);
      
      io.to(roomId).emit('answer-submitted', {
        userId,
        questionId,
        timestamp: new Date()
      });
      
      const room = roomService.getRoom(roomId);
      if (room && room.teacher && room.teacher.socketId) {
        io.to(room.teacher.socketId).emit('student-progress', {
          userId,
          questionId,
          answer: answer,
          result,
          timestamp: new Date()
        });
      }
    });

    socket.on('student-code-update', ({ roomId, userId, code, questionId }) => {
      const room = roomService.getRoom(roomId);
      roomService.updateStudentState(roomId, userId, { currentQuestionId: questionId, lastCode: code });
      
      if (room && room.teacher && room.teacher.socketId) {
        io.to(room.teacher.socketId).emit('student-live-code', {
          userId,
          code,
          questionId,
          timestamp: new Date()
        });
      }
    });

    socket.on('student-terminal-output', ({ roomId, userId, output, error }) => {
      const room = roomService.getRoom(roomId);
      if (room && room.teacher && room.teacher.socketId) {
        io.to(room.teacher.socketId).emit('student-terminal-update', {
          userId,
          output,
          error,
          timestamp: new Date()
        });
      }
    });

    socket.on('teacher-highlight', ({ roomId, studentId, selection }) => {
      const room = roomService.getRoom(roomId);
      const student = room?.students.find(s => s.id === studentId);
      if (student && student.socketId) {
        io.to(student.socketId).emit('teacher-highlight-received', {
          selection,
          timestamp: new Date()
        });
      }
    });

    socket.on('approve-student', ({ roomId, studentId }) => {
      console.log(`[APPROVE] Starting approval for student ${studentId} in room ${roomId}`);
      const result = roomService.approveStudent(roomId, studentId);
      console.log('[APPROVE] Approval result:', result);
      
      if (result.approved && result.student) {
        const room = roomService.getRoom(roomId);
        console.log('[APPROVE] Room students after approval:', room.students.map(s => s.id));
        console.log('[APPROVE] Room students full:', JSON.stringify(room.students, null, 2));
        
        // Notify the approved student
        io.to(result.student.socketId).emit('approval-status', { approved: true });
        io.to(result.student.socketId).emit('room-state', room);
        
        // Send updated student list to all
        console.log(`[APPROVE] Emitting student-list to room ${roomId}:`, room.students);
        io.to(roomId).emit('student-list', room.students);
        io.to(roomId).emit('user-joined', { userId: studentId, role: 'student' });
      } else {
        console.log('[APPROVE] Approval failed');
      }
    });

    socket.on('reject-student', ({ roomId, studentId }) => {
      const room = roomService.getRoom(roomId);
      const pendingStudent = room?.pendingStudents.find(s => s.id === studentId);
      if (pendingStudent) {
        io.to(pendingStudent.socketId).emit('approval-status', { approved: false, message: 'Öğretmen tarafından reddedildiniz' });
        room.pendingStudents = room.pendingStudents.filter(s => s.id !== studentId);
      }
    });

    socket.on('create-question', ({ roomId, question }) => {
      const updatedRoom = roomService.addQuestion(roomId, question);
      io.to(roomId).emit('new-question', question);
    });

    socket.on('run-code', ({ roomId, code, language, stdin }) => {
      socket.to(roomId).emit('code-running', { userId: socket.id });
    });

    socket.on('disconnect', () => {
      const { roomId, userId } = roomService.removeUser(socket.id);
      if (roomId && userId) {
        const room = roomService.getRoom(roomId);
        io.to(roomId).emit('user-left', { userId });
        
        if (room && room.teacher && room.teacher.socketId) {
          io.to(room.teacher.socketId).emit('student-list', room.students);
        }
      }
    });
  });
};