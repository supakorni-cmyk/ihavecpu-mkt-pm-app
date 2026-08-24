// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './Login';
import Dashboard from './Dashboard';

// 🟢 ROUTE GUARD: Verify user session and email domain
const PrivateRoute = ({ children }) => {
  const { currentUser } = useAuth();
  const isAllowedDomain = currentUser?.email?.toLowerCase().endsWith('@ihavecpu.com');
  
  return currentUser && isAllowedDomain ? children : <Navigate to="/" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route 
            path="/dashboard" 
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } 
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;