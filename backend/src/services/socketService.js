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
      
      // Check if user is banned
      if (joinedRoom && joinedRoom.banned) {
        const minutesLeft = Math.ceil((joinedRoom.bannedUntil - new Date()) / 1000 / 60);
        socket.emit('banned', { 
          message: `Odadan atıldınız. ${minutesLeft} dakika sonra tekrar girebilirsiniz.`,
          bannedUntil: joinedRoom.bannedUntil
        });
        return;
      }
      
      if (joinedRoom) {
        if (role === 'student' && joinedRoom.config.requireApproval) {
          // Check if student is already approved
          const isAlreadyApproved = joinedRoom.students.some(s => s.id === userId);
          
          if (isAlreadyApproved) {
            // Update student online status and socket ID
            const student = joinedRoom.students.find(s => s.id === userId);
            if (student) {
              student.online = true;
              student.socketId = socket.id;
            }
            
            // Student is already approved, just send room state
            socket.emit('room-state', joinedRoom);
            
            // Notify all users in room about reconnected student
            io.to(roomId).emit('user-joined', { userId, role });
            io.to(roomId).emit('student-list', joinedRoom.students);
          } else {
            // Add to pending students if approval required and not already approved
            roomService.addPendingStudent(roomId, userId, socket.id);
            socket.emit('pending-approval', { message: 'Öğretmen onayı bekleniyor...' });
            
            const teacher = joinedRoom.teacher;
            if (teacher && teacher.socketId) {
              io.to(teacher.socketId).emit('student-pending', { userId, socketId: socket.id });
            }
          }
        } else {
          socket.emit('room-state', joinedRoom);
          
          if (role === 'student') {
            // Update student online status if reconnecting
            const student = joinedRoom.students.find(s => s.id === userId);
            if (student) {
              student.online = true;
              student.socketId = socket.id;
            }
            
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
      const result = roomService.approveStudent(roomId, studentId);
      if (result.approved && result.student) {
        const room = roomService.getRoom(roomId);
        
        // Notify the approved student
        io.to(result.student.socketId).emit('approval-status', { approved: true });
        io.to(result.student.socketId).emit('room-state', room);
        
        // Send updated student list to all
        io.to(roomId).emit('student-list', room.students);
        io.to(roomId).emit('user-joined', { userId: studentId, role: 'student' });
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
      if (updatedRoom) {
        // Get the newly added question (last in array)
        const newQuestion = updatedRoom.questions[updatedRoom.questions.length - 1];
        io.to(roomId).emit('new-question', newQuestion);
        
        // Also emit updated room state to ensure sync
        io.to(roomId).emit('room-state', updatedRoom);
      }
    });

    socket.on('request-student-code', ({ roomId, studentId }) => {
      const room = roomService.getRoom(roomId);
      if (room) {
        const student = room.students.find(s => s.id === studentId);
        if (student && student.lastCode) {
          socket.emit('student-live-code', {
            userId: studentId,
            code: student.lastCode,
            questionId: student.currentQuestionId || null
          });
        }
      }
    });

    socket.on('kick-student', ({ roomId, studentId }) => {
      const result = roomService.kickStudent(roomId, studentId);
      if (result && result.kicked && result.student) {
        const room = roomService.getRoom(roomId);
        
        // Notify the kicked student
        if (result.student.socketId) {
          io.to(result.student.socketId).emit('kicked', { 
            message: 'Öğretmen tarafından odadan atıldınız. 60 dakika sonra tekrar girebilirsiniz.',
            bannedUntil: result.bannedUntil
          });
        }
        
        // Update student list for all
        io.to(roomId).emit('student-list', room.students);
        io.to(roomId).emit('user-left', { userId: studentId });
      }
    });

    socket.on('run-code', ({ roomId, code, language, stdin }) => {
      socket.to(roomId).emit('code-running', { userId: socket.id });
    });

    socket.on('disconnect', () => {
      const { roomId, userId } = roomService.removeUser(socket.id);
      if (roomId && userId) {
        const room = roomService.getRoom(roomId);
        io.to(roomId).emit('user-left', { userId });
        
        // Send updated student list to all room members
        io.to(roomId).emit('student-list', room.students);
      }
    });
  });
};