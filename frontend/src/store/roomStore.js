import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export const useRoomStore = create(devtools((set) => ({
  room: null,
  pendingStudents: [],
  setRoom: (room) => set({ room }),
  setPendingStudents: (pendingStudents) => set({ pendingStudents }),
  addPendingStudent: (student) => set((state) => {
    const exists = state.pendingStudents.some(s => s.id === student.id);
    if (!exists) {
      return { pendingStudents: [...state.pendingStudents, student] };
    }
    return state;
  }),
  removePendingStudent: (studentId) => set((state) => ({
    pendingStudents: state.pendingStudents.filter(s => s.id !== studentId)
  })),
  updateCode: (code) => set((state) => ({
    room: state.room ? { ...state.room, code } : null
  })),
  addQuestion: (question) => set((state) => ({
    room: state.room ? {
      ...state.room,
      questions: [...state.room.questions, question]
    } : null
  })),
  updateStudent: (studentId, updates) => set((state) => {
    if (!state.room) return state;
    
    const students = state.room.students.map(student =>
      student.id === studentId ? { ...student, ...updates } : student
    );
    
    return { room: { ...state.room, students } };
  }),
  addStudent: (student) => set((state) => {
    if (!state.room) return state;
    
    const existingStudent = state.room.students.find(s => s.id === student.id);
    if (existingStudent) {
      return {
        room: {
          ...state.room,
          students: state.room.students.map(s =>
            s.id === student.id ? { ...s, ...student } : s
          )
        }
      };
    }
    
    return {
      room: {
        ...state.room,
        students: [...state.room.students, student]
      }
    };
  }),
  setStudents: (students) => set((state) => {
    console.log('[STORE] setStudents called with:', students);
    console.log('[STORE] Current room:', state.room);
    if (!state.room) {
      console.log('[STORE] No room exists, cannot set students');
      return state;
    }
    const newState = { room: { ...state.room, students } };
    console.log('[STORE] New state will be:', newState);
    return newState;
  })
}), { name: 'room-store' }));