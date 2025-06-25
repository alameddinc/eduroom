const express = require('express');
const router = express.Router();
const roomService = require('../services/roomService');

router.post('/create', (req, res) => {
  const { teacherId, config } = req.body;
  const room = roomService.createRoom(teacherId, config);
  res.json({ success: true, room });
});

router.get('/:roomId', (req, res) => {
  const room = roomService.getRoom(req.params.roomId);
  if (!room) {
    return res.status(404).json({ success: false, error: 'Room not found' });
  }
  
  // Convert submissions Map to object for JSON serialization
  const roomData = {
    ...room,
    submissions: room.submissions ? Object.fromEntries(room.submissions) : {}
  };
  
  res.json({ success: true, room: roomData });
});

router.get('/', (req, res) => {
  const rooms = roomService.getAllRooms();
  res.json({ success: true, rooms });
});

router.post('/:roomId/questions', (req, res) => {
  const { roomId } = req.params;
  const question = req.body;
  const room = roomService.addQuestion(roomId, question);
  
  if (!room) {
    return res.status(404).json({ success: false, error: 'Room not found' });
  }
  
  res.json({ success: true, room });
});

router.put('/:roomId/questions', (req, res) => {
  const { roomId } = req.params;
  const { questions } = req.body;
  const room = roomService.setQuestions(roomId, questions);
  
  if (!room) {
    return res.status(404).json({ success: false, error: 'Room not found' });
  }
  
  res.json({ success: true, room });
});

module.exports = router;