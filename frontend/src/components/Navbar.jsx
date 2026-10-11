import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Calendar, LogOut, Shield, UserCheck, GraduationCap } from 'lucide-react';

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
            <Shield className="w-3.5 h-3.5" /> Admin
          </span>
        );
      case 'teacher':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
            <UserCheck className="w-3.5 h-3.5" /> Teacher
          </span>
        );
      case 'student':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
            <GraduationCap className="w-3.5 h-3.5" /> Student
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Name */}
        <Link to={isAuthenticated ? `/${user.role}` : "/login"} className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                Smart-Schedule
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 hidden sm:inline-block">
                Auto Timetable
              </span>
            </div>
            <span className="text-xs text-slate-500 block -mt-0.5 font-medium">Computer Engineering Dept.</span>
          </div>
        </Link>

        {/* User Info & Actions */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <div className="hidden sm:flex items-center gap-3 pr-3 border-r border-slate-200">
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-800">{user.name}</div>
                  <div className="text-[11px] text-slate-500">{user.email}</div>
                </div>
                {getRoleBadge(user.role)}
              </div>

              <button
                onClick={handleLogout}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-white text-slate-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Logout from system"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
