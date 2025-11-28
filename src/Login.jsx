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
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-96 border border-gray-700">
        <h2 className="text-2xl font-bold mb-6 text-center text-red-500">
            iHAVECPU {isLogin ? 'Login' : 'Sign Up'}
        </h2>
        {error && <div className="bg-red-500/20 text-red-200 p-2 mb-4 rounded text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input 
            type="email" 
            placeholder="Email" 
            className="p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-red-500"
            value={email} onChange={(e) => setEmail(e.target.value)} required 
          />
          <input 
            type="password" 
            placeholder="Password" 
            className="p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-red-500"
            value={password} onChange={(e) => setPassword(e.target.value)} required 
          />
          <button type="submit" className="bg-red-600 hover:bg-red-700 text-white p-2 rounded font-bold transition">
            {isLogin ? 'Login' : 'Create Account'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-400 cursor-pointer hover:text-white" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "Need an account? Sign Up" : "Already have an account? Login"}
        </p>
      </div>
    </div>
  );
}
