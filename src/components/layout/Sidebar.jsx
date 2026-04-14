import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Home, 
  Book, 
  CheckSquare, 
  MessageSquare,
  BarChart,
  Users
} from 'lucide-react';

export default function Sidebar() {
  const { profile } = useAuth();
  const location = useLocation();

  const isEstudiante = profile?.id_rol === 3;
  const isDocente = profile?.id_rol === 2;
  const isAdmin = profile?.id_rol === 1;

  const getNavItems = () => {
    const items = [{ name: 'Dashboard', icon: Home, path: '/dashboard' }];

    if (isEstudiante) {
      items.push({ name: 'Mis Cursos', icon: Book, path: '/dashboard/cursos' });
      items.push({ name: 'Tareas Pendientes', icon: CheckSquare, path: '/dashboard/tareas' });
      items.push({ name: 'Calificaciones', icon: BarChart, path: '/dashboard/calificaciones' });
      items.push({ name: 'Foros', icon: MessageSquare, path: '/dashboard/foros' });
    } else if (isDocente) {
      items.push({ name: 'Gestión de Cursos', icon: Book, path: '/dashboard/cursos-docente' });
      items.push({ name: 'Revisar Tareas', icon: CheckSquare, path: '/dashboard/revisiones' });
      items.push({ name: 'Foros y Dudas', icon: MessageSquare, path: '/dashboard/foros' });
    } else if (isAdmin) {
      items.push({ name: 'Administrar Usuarios', icon: Users, path: '/dashboard/usuarios' });
      items.push({ name: 'Todos los Cursos', icon: Book, path: '/dashboard/admin-cursos' });
    }

    return items;
  };

  const menuItems = getNavItems();

  return (
    <aside className="fixed hidden md:flex flex-col top-0 left-0 z-20 w-64 h-screen pt-20 transition-transform -translate-x-full bg-white border-r border-slate-200 md:translate-x-0">
      <div className="h-full px-3 pb-4 overflow-y-auto bg-white">
        <ul className="space-y-2 font-medium">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <li key={item.name}>
                <Link
                  to={item.path}
                  className={`flex items-center p-3 rounded-lg group transition-colors ${
                    isActive 
                      ? 'bg-indigo-50 text-indigo-700' 
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-indigo-700' : 'text-slate-500 group-hover:text-slate-900'}`} />
                  <span className="ml-3">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
