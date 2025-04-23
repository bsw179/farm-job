import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useUser } from '@/context/UserContext'; // 👈 add this

export default function LoginPage() {
  const navigate = useNavigate();
  const { user } = useUser(); // 👈 check if already logged in

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // 👇 Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

const handleLogin = async (e) => {
  e.preventDefault();
  setError('');
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Firebase login successful:', result.user);
    navigate('/');
  } catch (err) {
    console.error('❌ Login error:', err);
    setError('Invalid login. Please check your email and password.');
  }
};


  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <form
        onSubmit={handleLogin}
        className="bg-white shadow-md rounded-lg p-6 w-full max-w-sm"
      >
        <h2 className="text-2xl font-bold mb-4 text-center">Sign In</h2>

        {error && (
          <div className="text-sm text-red-600 mb-2 text-center">{error}</div>
        )}

        <input
          type="email"
          placeholder="Email"
          className="w-full mb-3 p-2 border rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full mb-4 p-2 border rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Log In
        </button>
      </form>
    </div>
  );
}
