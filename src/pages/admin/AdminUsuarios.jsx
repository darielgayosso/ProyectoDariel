import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Shield, Edit2, CheckCircle } from 'lucide-react';

export default function AdminUsuarios() {
  const { profile } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    if (profile?.id_rol === 1) {
      cargarDatos();
    }
  }, [profile]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const ROLES_ESTATICOS = [
        { id_rol: 1, nombre_rol: 'administrador' },
        { id_rol: 2, nombre_rol: 'docente' },
        { id_rol: 3, nombre_rol: 'estudiante' }
      ];
      setRoles(ROLES_ESTATICOS);

      // 2. Obtener lista de todos los usuarios
      const { data: dataUsuarios } = await supabase
        .from('usuarios')
        .select(`
          *,
          roles(nombre_rol)
        `)
        .order('fecha_registro', { ascending: false });

      setUsuarios(dataUsuarios || []);
    } catch (error) {
      console.error("Error cargando usuarios:", error);
    } finally {
      setLoading(false);
    }
  };

  const cambiarRol = async (id_usuario, nuevoRol) => {
    setUpdating(id_usuario);
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ id_rol: parseInt(nuevoRol) })
        .eq('id_usuario', id_usuario);

      if (error) throw error;
      
      // Actualizar estado local para reflejar el cambio rápido
      setUsuarios(prev => prev.map(u => {
        if (u.id_usuario === id_usuario) {
           const rolInfo = roles.find(r => r.id_rol === parseInt(nuevoRol));
           return { ...u, id_rol: parseInt(nuevoRol), roles: { nombre_rol: rolInfo?.nombre_rol } };
        }
        return u;
      }));

    } catch (error) {
      console.error("Error al cambiar rol:", error);
      alert("Hubo un problema al cambiar el rol. Verifica tus permisos.");
    } finally {
      setUpdating(null);
    }
  };

  if (profile?.id_rol !== 1) {
    return <div className="p-10 text-center text-red-500 font-bold">Acceso Denegado. Se requiere nivel Administrador.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center">
          <Shield className="w-8 h-8 text-indigo-600 mr-3" />
          Administración de Usuarios
        </h1>
        <p className="mt-2 text-slate-500">
          Gestiona todos los accesos a la plataforma. Cambia libremente de Alumnos a Docentes según sea necesario.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
           <h2 className="font-bold text-slate-700 flex items-center">
              <Users className="w-5 h-5 mr-2 text-slate-400" /> Directorio Global ({usuarios.length})
           </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200 flex flex-col md:table-row hidden md:table-header-group">
                <th className="p-4 font-semibold">Usuario</th>
                <th className="p-4 font-semibold">Correo Electrónico</th>
                <th className="p-4 font-semibold">Registro</th>
                <th className="p-4 font-semibold text-center">Rol Actual y Edición</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="4" className="text-center p-10">Cargando usuarios...</td></tr>
              ) : usuarios.map(usuario => (
                <tr key={usuario.id_usuario} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                       <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${
                         usuario.id_rol === 1 ? 'bg-purple-600' :
                         usuario.id_rol === 2 ? 'bg-indigo-500' : 'bg-slate-400'
                       }`}>
                          {(usuario.nombre || '?').charAt(0).toUpperCase()}
                       </div>
                       <div>
                         <div className="font-bold text-slate-800">{usuario.nombre} {usuario.apellido}</div>
                         <div className="text-xs text-slate-400">ID: {usuario.id_usuario}</div>
                       </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-600 font-medium">
                    {usuario.email}
                  </td>
                  <td className="p-4 text-sm text-slate-500">
                    {new Date(usuario.fecha_registro).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center">
                      {updating === usuario.id_usuario ? (
                        <div className="animate-pulse text-indigo-500 font-bold text-sm">Actualizando...</div>
                      ) : (
                        <div className="relative flex items-center">
                          <select
                            value={usuario.id_rol}
                            onChange={(e) => cambiarRol(usuario.id_usuario, e.target.value)}
                            className={`appearance-none border-0 text-sm font-bold pl-4 pr-10 py-2 rounded-full cursor-pointer focus:ring-2 focus:ring-indigo-500 transition-colors ${
                              usuario.id_rol === 1 ? 'bg-purple-100 text-purple-700' :
                              usuario.id_rol === 2 ? 'bg-indigo-100 text-indigo-700' :
                              'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {roles.map(r => (
                              <option key={r.id_rol} value={r.id_rol}>{r.nombre_rol.toUpperCase()}</option>
                            ))}
                          </select>
                          <Edit2 className="w-3 h-3 absolute right-3 pointer-events-none opacity-50" />
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
