import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Book, Star, FileText, CheckCircle, Clock } from 'lucide-react';

export default function CalificacionesEstudiante() {
  const { profile } = useAuth();
  const [calificaciones, setCalificaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id_rol === 3) {
      cargarCalificaciones();
    }
  }, [profile]);

  const cargarCalificaciones = async () => {
    setLoading(true);
    try {
      // 1. Obtener todas las entregas de tareas del usuario
      const { data: misEntregas } = await supabase
        .from('entregas')
        .select('*')
        .eq('id_usuario', profile.id_usuario);

      // 2. Obtener todos los intentos de cuestionarios del usuario
      const { data: misIntentos } = await supabase
        .from('intentos_cuestionario')
        .select('*')
        .eq('id_usuario', profile.id_usuario);

      const actividadesFinales = [];

      // 3. Enriquecer Entregas de Tareas
      if (misEntregas && misEntregas.length > 0) {
        const tareaIds = misEntregas.map(e => e.id_tarea);
        const { data: tareas } = await supabase
          .from('tareas')
          .select('id_tarea, titulo, id_unidad, unidades(id_curso, cursos(nombre))')
          .in('id_tarea', tareaIds);
        
        misEntregas.forEach(entrega => {
          const t = tareas?.find(x => x.id_tarea === entrega.id_tarea);
          actividadesFinales.push({
            id: `tarea-${entrega.id_entrega}`,
            tipo: 'Tarea',
            titulo: t?.titulo || 'Tarea',
            fecha: entrega.fecha_entrega,
            calificacion: entrega.calificacion,
            comentarios: entrega.comentarios,
            curso: t?.unidades?.cursos?.nombre || 'General'
          });
        });
      }

      // 4. Enriquecer Intentos de Cuestionarios
      if (misIntentos && misIntentos.length > 0) {
        const cuestionarioIds = misIntentos.map(i => i.id_cuestionario);
        const { data: cuestionarios } = await supabase
          .from('cuestionarios')
          .select('id_cuestionario, titulo, id_curso, cursos(nombre)')
          .in('id_cuestionario', cuestionarioIds);
        
        misIntentos.forEach(intento => {
          const c = cuestionarios?.find(x => x.id_cuestionario === intento.id_cuestionario);
          actividadesFinales.push({
            id: `quiz-${intento.id_intento}`,
            tipo: 'Examen',
            titulo: c?.titulo || 'Cuestionario',
            fecha: intento.fecha_intento,
            calificacion: intento.calificacion,
            comentarios: 'Calificación automática del sistema',
            curso: c?.cursos?.nombre || 'General'
          });
        });
      }

      // Ordenar por fecha descendente
      actividadesFinales.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      setCalificaciones(actividadesFinales);
    } catch (error) {
      console.error("Error al cargar calificaciones:", error);
    } finally {
      setLoading(false);
    }
  };

  // Agrupar por cursos para renderizar de manera limpia
  const cursosAgrupados = calificaciones.reduce((acc, current) => {
    if (!acc[current.curso]) {
      acc[current.curso] = { actividades: [], total: 0, calificados: 0 };
    }
    acc[current.curso].actividades.push(current);
    if (current.calificacion !== null && current.calificacion !== undefined) {
       acc[current.curso].total += Number(current.calificacion);
       acc[current.curso].calificados += 1;
    }
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto animate-fade-in p-4">
      <div className="mb-10">
        <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-3">Mi Progreso Académico</h1>
        <p className="text-lg text-slate-500 max-w-2xl">
          Visualiza tus calificaciones de tareas y exámenes. Mantén un seguimiento de tu rendimiento en cada curso.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="spinner-premium mb-4"></div>
          <p className="text-slate-400 font-medium animate-pulse">Cargando tus notas...</p>
        </div>
      ) : calificaciones.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-16 text-center max-w-2xl mx-auto mt-10">
          <div className="w-24 h-24 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Book className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Sin registros todavía</h2>
          <p className="text-slate-500 text-lg">
            Aún no tienes actividades entregadas o evaluadas. ¡Sigue adelante con tus cursos!
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {Object.keys(cursosAgrupados).map((nombreCurso) => {
             const cursoData = cursosAgrupados[nombreCurso];
             const promedioCurso = cursoData.calificados > 0 
                ? (cursoData.total / cursoData.calificados).toFixed(1) 
                : 'N/A';

             return (
               <div key={nombreCurso} className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden transform transition-all hover:shadow-2xl">
                 {/* Header del Curso con Gradiente */}
                 <div className="bg-gradient-to-r from-slate-900 to-indigo-900 px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center">
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mr-4 backdrop-blur-md">
                          <Book className="w-6 h-6 text-indigo-300" />
                        </div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">
                          {nombreCurso}
                        </h2>
                    </div>
                    <div className="bg-indigo-500/20 backdrop-blur-xl border border-indigo-400/30 text-indigo-100 px-6 py-2 rounded-2xl font-black text-lg flex items-center shadow-lg">
                        <Star className="w-5 h-5 mr-2 text-yellow-400 fill-yellow-400" /> 
                        <span className="opacity-70 text-sm mr-2 uppercase tracking-widest font-bold">Promedio:</span> {promedioCurso}
                    </div>
                 </div>

                 {/* Lista de Actividades (Tareas y Exámenes) */}
                 <div className="divide-y divide-slate-50">
                   {cursoData.actividades.map((act) => (
                     <div key={act.id} className="p-8 hover:bg-slate-50/80 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6 group">
                        <div className="flex-1">
                           <div className="flex items-center gap-3 mb-2">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${act.tipo === 'Tarea' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                                {act.tipo}
                              </span>
                              <span className="text-xs text-slate-400 font-medium flex items-center">
                                <Clock className="w-3 h-3 mr-1"/> {new Date(act.fecha).toLocaleDateString()}
                              </span>
                           </div>
                           <h3 className="text-xl font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                              {act.titulo}
                           </h3>
                           
                           <div className="mt-3 text-sm text-slate-500 bg-slate-50 p-4 rounded-2xl border border-slate-100 italic">
                             <span className="font-bold text-slate-700 not-italic mr-1 block mb-1">Feedback:</span>
                             "{act.comentarios || 'Sin comentarios adicionales.'}"
                           </div>
                        </div>

                        {/* Calificación Visual Premium */}
                        <div className="flex items-center bg-slate-50 lg:bg-transparent p-4 lg:p-0 rounded-2xl border border-slate-100 lg:border-none">
                           {act.calificacion !== null ? (
                             <div className="flex items-center space-x-6">
                                <div className="text-right">
                                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 leading-none">Puntuación</div>
                                  <div className={`text-4xl font-black tracking-tighter ${Number(act.calificacion) >= 60 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                     {act.calificacion}<span className="text-base text-slate-300 ml-1 font-bold">/100</span>
                                  </div>
                                </div>
                                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-white shadow-2xl transform rotate-3 group-hover:rotate-0 transition-transform ${Number(act.calificacion) >= 60 ? 'bg-gradient-to-br from-emerald-400 to-teal-500' : 'bg-gradient-to-br from-rose-400 to-orange-500'}`}>
                                   <CheckCircle className="w-8 h-8" />
                                </div>
                             </div>
                           ) : (
                             <div className="flex items-center space-x-6 opacity-40">
                                <div className="text-right">
                                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 leading-none">Estado</div>
                                  <div className="text-xl font-black text-slate-600 tracking-tight uppercase">Pendiente</div>
                                </div>
                                <div className="w-16 h-16 rounded-3xl flex items-center justify-center bg-slate-100 text-slate-300 shadow-inner">
                                   <Clock className="w-8 h-8" />
                                </div>
                             </div>
                           )}
                        </div>
                     </div>
                   ))}
                 </div>
               </div>
             );
          })}
        </div>
      )}
    </div>
  );
}
