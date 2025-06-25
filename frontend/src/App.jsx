import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentRoom from './pages/StudentRoom';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/teacher/:roomId" element={<TeacherDashboard />} />
          <Route path="/student/:roomId" element={<StudentRoom />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;