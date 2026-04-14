import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { BookOpen, LogOut, User, Moon, Sun } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check local storage or system preference
    const isDark = localStorage.getItem('darkMode') === 'true' || 
                   (!('darkMode' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setIsDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-slate-200 fixed z-30 w-full">
      <div className="px-3 py-3 lg:px-5 lg:pl-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-start">
            <Link to="/dashboard" className="flex items-center gap-2 group">
              <BookOpen className="h-8 w-8 text-indigo-600 transition-transform group-hover:scale-110" />
              <span className="self-center text-xl font-bold whitespace-nowrap text-slate-800">
                LMS Platform
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <p className="text-sm font-medium text-slate-900">{profile?.nombre} {profile?.apellido}</p>
              <p className="text-xs text-slate-500 text-right capitalize">{profile?.roles?.nombre_rol}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border-2 border-indigo-200">
              {profile?.nombre?.charAt(0) || <User className="w-5 h-5"/>}
            </div>
            
            {/* Requisito Avanzado: Toggle Modo Oscuro */}
            <button
              onClick={toggleDarkMode}
              className="text-slate-500 hover:text-indigo-600 hover:bg-slate-100 p-2 rounded-lg transition-colors"
              title="Cambiar Modo"
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5" />}
            </button>
            <button 
              onClick={handleLogout}
              className="text-slate-500 hover:text-red-600 hover:bg-slate-100 p-2 rounded-lg transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
