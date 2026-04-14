import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Layout, Calendar, AlertCircle, ArrowRight, CheckCircle } from 'lucide-react';

export default function TareasPendientesEstudiante() {
  const { profile } = useAuth();
  const [tareasPendientes, setTareasPendientes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id_rol === 3) {
      cargarTareasPendientes();
    }
  }, [profile]);

  const cargarTareasPendientes = async () => {
    setLoading(true);
    try {
      // 1. Obtener los cursos en los que está inscrito el estudiante
      const { data: inscripciones } = await supabase
        .from('inscripciones')
        .select(`
          id_curso,
          cursos (nombre)
        `)
        .eq('id_usuario', profile.id_usuario);

      if (!inscripciones || inscripciones.length === 0) {
        setTareasPendientes([]);
        return;
      }

      const cursoIds = inscripciones.map(i => i.id_curso);

      // 2. Obtener las unidades de esos cursos
      const { data: unidades } = await supabase
        .from('unidades')
        .select('id_unidad, id_curso')
        .in('id_curso', cursoIds);

      if (!unidades || unidades.length === 0) {
         setTareasPendientes([]);
         return;
      }

      const unidadIds = unidades.map(u => u.id_unidad);

      // 3. Obtener TODAS las tareas de esas unidades
      const { data: todasLasTareas } = await supabase
        .from('tareas')
        .select('*')
        .in('id_unidad', unidadIds);

      // 4. Obtener las entregas ya realizadas por el estudiante
      const { data: misEntregas } = await supabase
        .from('entregas')
        .select('id_tarea')
        .eq('id_usuario', profile.id_usuario);

      const tareasEntregadasIds = new Set((misEntregas || []).map(e => e.id_tarea));

      // 5. Filtrar solo las que NO están entregadas y mapearles el curso
      const pendientes = (todasLasTareas || [])
        .filter(t => !tareasEntregadasIds.has(t.id_tarea))
        .map(t => {
           const unidad = unidades.find(u => u.id_unidad === t.id_unidad);
           const inscripcion = inscripciones.find(i => i.id_curso === unidad?.id_curso);
           return {
              ...t,
              id_curso: unidad?.id_curso,
              curso_nombre: inscripcion?.cursos?.nombre || 'Curso Desconocido'
           };
        });

      // Ordenar por fecha límite (asumiendo que puedan tener fecha en un futuro, o solo por creación)
      pendientes.sort((a, b) => new Date(a.fecha_creacion) - new Date(b.fecha_creacion));

      setTareasPendientes(pendientes);
    } catch (error) {
      console.error("Error al cargar tareas pendientes:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center">
          <Layout className="w-8 h-8 text-orange-500 mr-3" />
          Centro de Tareas Pendientes
        </h1>
        <p className="mt-2 text-slate-500">
          Un resumen global de todas las actividades que tienes por entregar en tus cursos.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : tareasPendientes.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-10 text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-700">¡Todo al día!</h2>
          <p className="text-slate-500 mt-2">
            No tienes ninguna tarea vencida ni pendiente por entregar. ¡Excelente trabajo!
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tareasPendientes.map((tarea) => (
            <div key={tarea.id_tarea} className="bg-white rounded-xl border border-orange-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
               <div className="bg-orange-50 p-4 border-b border-orange-100">
                  <div className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">
                     {tarea.curso_nombre}
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg line-clamp-1">{tarea.titulo}</h3>
               </div>
               <div className="p-5 flex-1">
                  <p className="text-slate-600 text-sm line-clamp-3 mb-4">
                     {tarea.descripcion || 'Sin descripción detallada.'}
                  </p>
                  <div className="flex items-center text-xs text-slate-500 space-x-2">
                     <AlertCircle className="w-4 h-4 text-orange-400" />
                     <span>Pendiente de envío</span>
                  </div>
               </div>
               <div className="p-4 border-t border-slate-100 bg-slate-50">
                  <Link 
                     to={`/dashboard/cursos/${tarea.id_curso}`}
                     className="w-full flex items-center justify-center py-2 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
                  >
                     Ir al curso para entregar <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
