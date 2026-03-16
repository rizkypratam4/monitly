// src/components/Login.tsx
// Login terhubung ke backend — validasi via POST /api/auth/login
// Token JWT disimpan di localStorage untuk session

import React, { useState } from 'react';
import { Monitor, Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { BASE_URL } from '../services/api';

interface LoginProps {
  onLogin: (token: string, user: { username: string; role: string }) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername]       = useState('');
  const [password, setPassword]       = useState('');
  const [showPass, setShowPass]       = useState(false);
  const [remember, setRemember]       = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login gagal, coba lagi');
        return;
      }

      // Simpan token
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem('netwatch_token', data.token);
      storage.setItem('netwatch_user', JSON.stringify(data.user));

      onLogin(data.token, data.user);

    } catch (e) {
      setError('Tidak bisa terhubung ke server. Pastikan backend sudah running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#141518] flex flex-col justify-center items-center p-4 font-sans selection:bg-blue-500/30">

      {/* Card */}
      <div className="w-full max-w-md bg-[#1E1F23] border border-gray-800 rounded-2xl shadow-2xl p-8">

        {/* Logo & Title */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-blue-600/20 rounded-xl mb-4 border border-blue-500/30">
            <Monitor className="w-8 h-8 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Monitly</h1>
          <p className="text-gray-400 text-sm mt-2">Sign in to access the dashboard</p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-5">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-4 w-4 text-gray-500" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-700 rounded-lg bg-[#2A2B30] text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors sm:text-sm"
                placeholder="admin"
                autoComplete="username"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-gray-500" />
              </div>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                className="block w-full pl-10 pr-10 py-2.5 border border-gray-700 rounded-lg bg-[#2A2B30] text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors sm:text-sm"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Remember me */}
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-gray-400 hover:text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="rounded border-gray-700 bg-[#2A2B30] text-blue-500 focus:ring-blue-500/50"
              />
              Remember me
            </label>
            <span className="text-gray-600 text-xs">Session: {remember ? '8 jam' : 'sampai browser ditutup'}</span>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1E1F23] focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Default credentials hint */}
        <div className="mt-6 p-3 bg-[#2A2B30] rounded-lg border border-gray-700/50">
          <p className="text-xs text-gray-500 text-center">
            Default: <span className="text-gray-400 font-mono">admin</span> / <span className="text-gray-400 font-mono">admin123</span>
          </p>
        </div>
      </div>

      <div className="mt-8 text-center text-gray-600 text-sm">
        <p>&copy; 2026 Monitly Systems. All rights reserved.</p>
      </div>
    </div>
  );
}