import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Search, Zap, ListTodo, FileEdit, LogOut, MessageSquare } from 'lucide-react';

// Components
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import ResumeAnalyzer from './pages/ResumeAnalyzer';
import JobAnalyzer from './pages/JobAnalyzer';
import MatchScore from './pages/MatchScore';
import CoverLetter from './pages/CoverLetter';
import JobTracker from './pages/JobTracker';
import Chatbot from './pages/Chatbot';
import Auth from './pages/Auth';

const Sidebar = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="sidebar">
      <div className="px-3 mb-5">
        <h3 className="text-white mb-1">AI Job Assistant</h3>
        <p className="text-muted small mb-0">{user?.email}</p>
      </div>
      <nav>
        <NavLink to="/dashboard" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
          <LayoutDashboard size={20} /> Dashboard
        </NavLink>
        <NavLink to="/resume" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
          <FileText size={20} /> Resume Analyzer
        </NavLink>
        <NavLink to="/job" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
          <Search size={20} /> Job Analyzer
        </NavLink>
        <NavLink to="/match" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
          <Zap size={20} /> Match Score
        </NavLink>
        <NavLink to="/cover-letter" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
          <FileEdit size={20} /> Cover Letter
        </NavLink>
        <NavLink to="/tracker" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
          <ListTodo size={20} /> Job Tracker
        </NavLink>
        <NavLink to="/chatbot" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
          <MessageSquare size={20} /> AI Assistant
        </NavLink>
        <div className="mt-5 pt-5 border-top border-secondary">
          <button 
            onClick={handleLogout}
            className="nav-link w-100 text-start"
            style={{background: 'none', border: 'none', cursor: 'pointer'}}
          >
            <LogOut size={20} /> Logout
          </button>
        </div>
      </nav>
    </div>
  );
};

const ProtectedLayout = ({ children }) => (
  <>
    <Sidebar />
    <main className="main-content">
      {children}
    </main>
  </>
);

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Auth />} />
      <Route path="/" element={<Auth />} />
      
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <ProtectedLayout>
            <Dashboard />
          </ProtectedLayout>
        </ProtectedRoute>
      } />
      <Route path="/resume" element={
        <ProtectedRoute>
          <ProtectedLayout>
            <ResumeAnalyzer />
          </ProtectedLayout>
        </ProtectedRoute>
      } />
      <Route path="/job" element={
        <ProtectedRoute>
          <ProtectedLayout>
            <JobAnalyzer />
          </ProtectedLayout>
        </ProtectedRoute>
      } />
      <Route path="/match" element={
        <ProtectedRoute>
          <ProtectedLayout>
            <MatchScore />
          </ProtectedLayout>
        </ProtectedRoute>
      } />
      <Route path="/cover-letter" element={
        <ProtectedRoute>
          <ProtectedLayout>
            <CoverLetter />
          </ProtectedLayout>
        </ProtectedRoute>
      } />
      <Route path="/tracker" element={
        <ProtectedRoute>
          <ProtectedLayout>
            <JobTracker />
          </ProtectedLayout>
        </ProtectedRoute>
      } />
      <Route path="/chatbot" element={
        <ProtectedRoute>
          <ProtectedLayout>
            <Chatbot />
          </ProtectedLayout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app-container">
          <AppRoutes />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
