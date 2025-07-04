const { v4: uuidv4 } = require('uuid');

class RoomService {
  constructor() {
    this.rooms = new Map();
    this.userToRoom = new Map();
    this.bannedUsers = new Map(); // Map of roomId -> { userId: bannedUntil }
  }

  createRoom(teacherId, config) {
    const roomId = uuidv4();
    const room = {
      id: roomId,
      teacher: { id: teacherId, socketId: null },
      students: [],
      pendingStudents: [],
      config: {
        language: config.language || 'python',
        allowedLanguages: config.allowedLanguages || ['python', 'go', 'sql'],
        password: config.password || null,
        requireApproval: config.requireApproval || false,
        ...config
      },
      code: '',
      questions: [],
      submissions: new Map(),
      createdAt: new Date()
    };
    
    this.rooms.set(roomId, room);
    return room;
  }

  joinRoom(roomId, userId, role, socketId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    // Check if user is banned
    if (role === 'student' && this.isUserBanned(roomId, userId)) {
      return { banned: true, bannedUntil: this.getBanEndTime(roomId, userId) };
    }

    // Clean up old socket mapping if exists
    for (const [oldSocketId, userInfo] of this.userToRoom.entries()) {
      if (userInfo.userId === userId && userInfo.roomId === roomId && oldSocketId !== socketId) {
        this.userToRoom.delete(oldSocketId);
      }
    }
    
    this.userToRoom.set(socketId, { roomId, userId });

    if (role === 'teacher') {
      room.teacher.socketId = socketId;
      room.teacher.id = userId;
    } else if (role === 'student') {
      // Approval gerektiren odalarda öğrenci direkt eklenmemeli
      if (!room.config.requireApproval) {
        const existingStudent = room.students.find(s => s.id === userId);
        if (existingStudent) {
          existingStudent.socketId = socketId;
          existingStudent.online = true;
        } else {
          room.students.push({
            id: userId,
            socketId,
            online: true,
            joinedAt: new Date()
          });
        }
      }
    }

    return room;
  }

  updateRoomCode(roomId, code, language) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    room.code = code;
    if (language && room.config.allowedLanguages.includes(language)) {
      room.config.language = language;
    }

    return room;
  }

  addQuestion(roomId, question) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const newQuestion = {
      id: uuidv4(),
      ...question,
      createdAt: new Date()
    };

    room.questions.push(newQuestion);
    return room;
  }

  setQuestions(roomId, questions) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    room.questions = questions;
    return room;
  }

  submitAnswer(roomId, userId, questionId, answer) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const key = `${userId}-${questionId}`;
    const submission = {
      userId,
      questionId,
      answer,
      submittedAt: new Date()
    };

    room.submissions.set(key, submission);
    return submission;
  }

  updateStudentState(roomId, userId, updates) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const student = room.students.find(s => s.id === userId);
    if (student) {
      Object.assign(student, updates);
    }
    return student;
  }

  addPendingStudent(roomId, userId, socketId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    // Check if already pending
    const existingPending = room.pendingStudents.find(s => s.id === userId);
    if (existingPending) {
      // Update socket ID if student reconnected
      existingPending.socketId = socketId;
      return room;
    }

    room.pendingStudents.push({
      id: userId,
      socketId,
      requestedAt: new Date()
    });
    return room;
  }

  approveStudent(roomId, userId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const pendingIndex = room.pendingStudents.findIndex(s => s.id === userId);
    if (pendingIndex !== -1) {
      const pending = room.pendingStudents[pendingIndex];
      room.pendingStudents.splice(pendingIndex, 1);
      
      // Directly add to students list instead of calling joinRoom
      const existingStudent = room.students.find(s => s.id === userId);
      if (existingStudent) {
        existingStudent.socketId = pending.socketId;
        existingStudent.online = true;
      } else {
        room.students.push({
          id: userId,
          socketId: pending.socketId,
          online: true,
          joinedAt: new Date()
        });
      }
      
      return { approved: true, student: pending };
    }
    return { approved: false };
  }

  removeUser(socketId) {
    const userInfo = this.userToRoom.get(socketId);
    if (!userInfo) return {};

    const { roomId, userId } = userInfo;
    const room = this.rooms.get(roomId);

    if (room) {
      const student = room.students.find(s => s.socketId === socketId);
      if (student) {
        student.online = false;
      }
    }

    this.userToRoom.delete(socketId);
    return { roomId, userId };
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  getAllRooms() {
    return Array.from(this.rooms.values());
  }

  kickStudent(roomId, studentId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    // Remove student from room
    const studentIndex = room.students.findIndex(s => s.id === studentId);
    if (studentIndex !== -1) {
      const student = room.students[studentIndex];
      room.students.splice(studentIndex, 1);
      
      // Add to banned list for 60 minutes
      const bannedUntil = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes from now
      if (!this.bannedUsers.has(roomId)) {
        this.bannedUsers.set(roomId, new Map());
      }
      this.bannedUsers.get(roomId).set(studentId, bannedUntil);
      
      return { kicked: true, student, bannedUntil };
    }
    
    return { kicked: false };
  }

  isUserBanned(roomId, userId) {
    const roomBans = this.bannedUsers.get(roomId);
    if (!roomBans) return false;
    
    const bannedUntil = roomBans.get(userId);
    if (!bannedUntil) return false;
    
    // Check if ban has expired
    if (new Date() > bannedUntil) {
      roomBans.delete(userId);
      return false;
    }
    
    return true;
  }

  getBanEndTime(roomId, userId) {
    const roomBans = this.bannedUsers.get(roomId);
    if (!roomBans) return null;
    
    return roomBans.get(userId);
  }
}

module.exports = new RoomService();