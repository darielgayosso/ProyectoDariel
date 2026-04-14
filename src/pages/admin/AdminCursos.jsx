import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Book, Shield, Trash2, AlertTriangle, Users } from 'lucide-react';

export default function AdminCursos() {
  const { profile } = useAuth();
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (profile?.id_rol === 1) {
      cargarCursos();
    }
  }, [profile]);

  const cargarCursos = async () => {
    setLoading(true);
    try {
      // Obtener todos los cursos con información del docente asociado
      const { data, error } = await supabase
        .from('cursos')
        .select(`
          *,
          docente:usuarios!id_docente(nombre, apellido, email)
        `)
        .order('fecha_creacion', { ascending: false });

      if (error) throw error;
      
      // Enriquecer cursos con número de alumnos inscritos para mayor poder al admin
      const enriquecidos = await Promise.all(
         (data || []).map(async (curso) => {
            const { count } = await supabase.from('inscripciones').select('*', {count: 'exact', head: true}).eq('id_curso', curso.id_curso);
            return { ...curso, alumnosInscritos: count || 0 };
         })
      );

      setCursos(enriquecidos);
    } catch (error) {
      console.error("Error cargando cursos:", error);
    } finally {
      setLoading(false);
    }
  };

  const eliminarCurso = async (id_curso, nombre) => {
    if (window.confirm(`ESTADO DE ALERTA: ¿Estás completamente seguro de ELIMINAR el curso "${nombre}"?\nEsta acción es moderación administrativa. Borrará permanentemente unidades, tareas, archivos y foros asociados a este curso para todos los estudiantes y el docente.`)) {
      setDeleting(id_curso);
      try {
        const { error } = await supabase
          .from('cursos')
          .delete()
          .eq('id_curso', id_curso);

        if (error) throw error;
        
        setCursos(prev => prev.filter(c => c.id_curso !== id_curso));
      } catch (error) {
        console.error("Error al eliminar curso:", error);
        alert("Error de permisos administrativos al intentar borrar.");
      } finally {
        setDeleting(null);
      }
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
          Moderación de Cursos Globales
        </h1>
        <p className="mt-2 text-slate-500">
          Supervisa el contenido académico y mantén la integridad de la plataforma. Pistas de moderación en vivo.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
           <h2 className="font-bold text-slate-700 flex items-center">
              <Book className="w-5 h-5 mr-2 text-slate-400" /> Repositorio ({cursos.length} activos)
           </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="p-4 font-semibold">Curso</th>
                <th className="p-4 font-semibold">Docente Titular</th>
                <th className="p-4 font-semibold text-center">Matrícula</th>
                <th className="p-4 font-semibold">Creación</th>
                <th className="p-4 font-semibold text-right">Moderación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="5" className="text-center p-10 font-bold text-indigo-500 animate-pulse">Escaneando plataforma...</td></tr>
              ) : cursos.length === 0 ? (
                <tr><td colSpan="5" className="text-center p-10 text-slate-400">No hay cursos creados en la plataforma.</td></tr>
              ) : cursos.map(curso => (
                <tr key={curso.id_curso} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <div className="flex flex-col">
                       <span className="font-bold text-slate-800">{curso.nombre}</span>
                       <span className="text-xs text-indigo-500 font-bold uppercase tracking-widest">{curso.categoria}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-600 font-medium">
                    {curso.docente ? (
                       <span className="flex flex-col">
                          <span>{curso.docente.nombre} {curso.docente.apellido}</span>
                          <span className="text-xs text-slate-400 font-normal">{curso.docente.email}</span>
                       </span>
                    ) : (
                       <span className="text-red-400 italic font-semibold flex items-center"><AlertTriangle className="w-3 h-3 mr-1"/> Sin asignar</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <div className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm font-bold">
                       <Users className="w-3 h-3 mr-1" /> {curso.alumnosInscritos}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-500">
                    {new Date(curso.fecha_creacion).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => eliminarCurso(curso.id_curso, curso.nombre)}
                      disabled={deleting === curso.id_curso}
                      className="inline-flex items-center justify-center p-2 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors focus:ring-2 focus:ring-red-200 disabled:opacity-50"
                      title="Eliminar curso por completo"
                    >
                      {deleting === curso.id_curso ? 'Borrando...' : <Trash2 className="w-5 h-5" />}
                    </button>
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
