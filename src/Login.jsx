import { useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to authenticate: ' + err.message);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
      {/* RESPONSIVE UPDATES:
         - w-full: Takes full width on mobile
         - max-w-md: Stops growing on desktop (approx 450px)
      */}
      <div className="bg-gray-800 p-6 sm:p-8 rounded-lg shadow-lg w-full max-w-md border border-gray-700">
        
        <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-center text-red-500">
            iHAVECPU <span className="text-white block sm:inline text-lg sm:text-2xl">{isLogin ? 'Login' : 'Sign Up'}</span>
        </h2>
        
        {error && <div className="bg-red-500/20 text-red-200 p-3 mb-4 rounded text-sm break-words">{error}</div>}
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input 
            type="email" 
            placeholder="Email" 
            className="p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-red-500 transition-colors w-full"
            value={email} onChange={(e) => setEmail(e.target.value)} required 
          />
          <input 
            type="password" 
            placeholder="Password" 
            className="p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-red-500 transition-colors w-full"
            value={password} onChange={(e) => setPassword(e.target.value)} required 
          />
          <button type="submit" className="bg-red-600 hover:bg-red-700 text-white p-3 rounded font-bold transition transform active:scale-95">
            {isLogin ? 'Login' : 'Create Account'}
          </button>
        </form>
        
        <p className="mt-6 text-center text-sm text-gray-400 cursor-pointer hover:text-white transition-colors" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "Need an account? Sign Up" : "Already have an account? Login"}
        </p>
      </div>
    </div>
  );
}