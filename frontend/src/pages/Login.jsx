import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Calendar,
  ArrowRight,
  GraduationCap,
  Lock,
  Mail,
  Shield,
  UserCheck
} from 'lucide-react';

export default function Login() {
  const [role, setRole] = useState('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const performLogin = async (loginEmail, loginPassword, expectedRole = role) => {
    setErrorMessage('');
    setIsLoggingIn(true);
    try {
      const loggedInUser = await login(loginEmail, loginPassword, expectedRole);
      navigate(`/${loggedInUser.role}`);
    } catch (error) {
      setErrorMessage(
        error instanceof TypeError && error.message === 'Failed to fetch'
          ? 'Unable to reach the login server. Please try again later.'
          : error.message || 'Login failed. Please check your details and try again.'
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    await performLogin(email, password, role);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        {/* Branding header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 mb-4">
            <Calendar className="w-7 h-7 text-blue-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Smart-Schedule</h1>
          <p className="text-xs text-blue-700 font-semibold tracking-wide uppercase mt-1">
            Automatic Timetable Generator
          </p>
          <p className="text-slate-500 text-xs mt-2">
            Department of Computer Engineering Dashboard Access
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Select your role
            </label>
            <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
              {[
                { id: 'admin', label: 'Admin', Icon: Shield },
                { id: 'teacher', label: 'Teacher', Icon: UserCheck },
                { id: 'student', label: 'Student', Icon: GraduationCap }
              ].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  disabled={isLoggingIn}
                  onClick={() => setRole(id)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 disabled:cursor-not-allowed ${
                    role === id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. admin@college.edu"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          {errorMessage && (
            <p role="alert" className="text-sm text-red-700">
              {errorMessage}
            </p>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer group"
          >
            <span>{isLoggingIn ? 'Logging in…' : `Login to ${role.toUpperCase()} Portal`}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

      </div>
    </div>
  );
}
