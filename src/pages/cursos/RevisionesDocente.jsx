import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle, Clock, ExternalLink, Download, FileText, Activity } from 'lucide-react';

export default function RevisionesDocente() {
  const { profile } = useAuth();
  const [entregas, setEntregas] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para modal de calificación
  const [modalAbierto, setModalAbierto] = useState(false);
  const [entregaActiva, setEntregaActiva] = useState(null);
  const [calificacionData, setCalificacionData] = useState({ nota: '', observacion: '' });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchEntregasArbol();
    }
  }, [profile]);

  const fetchEntregasArbol = async () => {
    setLoading(true);
    try {
      // 1. Cursos del docente
      const { data: misCursos } = await supabase
        .from('cursos')
        .select('id_curso, nombre')
        .eq('id_docente', profile.id_usuario);
      
      if (!misCursos || misCursos.length === 0) {
        setEntregas([]);
        setLoading(false);
        return;
      }

      const cursoIds = misCursos.map(c => c.id_curso);

      // 2. Unidades de esos cursos
      const { data: misUnidades } = await supabase
        .from('unidades')
        .select('id_unidad, id_curso, titulo')
        .in('id_curso', cursoIds);

      if (!misUnidades || misUnidades.length === 0) {
        setEntregas([]);
        setLoading(false);
        return;
      }

      const unidadIds = misUnidades.map(u => u.id_unidad);

      // 3. Tareas de esas unidades
      const { data: misTareas } = await supabase
        .from('tareas')
        .select('id_tarea, titulo, id_unidad')
        .in('id_unidad', unidadIds);

      if (!misTareas || misTareas.length === 0) {
        setEntregas([]);
        setLoading(false);
        return;
      }

      const tareaIds = misTareas.map(t => t.id_tarea);

      // 4. Entregas de esas tareas
      const { data: misEntregas } = await supabase
        .from('entregas')
        .select(`
          *,
          estudiante:usuarios!id_usuario(nombre, apellido, email)
        `)
        .in('id_tarea', tareaIds)
        .order('fecha_entrega', { ascending: false });

      // Enriquecer las entregas incrustando datos de la Tarea y del Curso
      const entregasEnriquecidas = (misEntregas || []).map(entrega => {
         const tareaRel = misTareas.find(t => t.id_tarea === entrega.id_tarea);
         const unidadRel = tareaRel ? misUnidades.find(u => u.id_unidad === tareaRel.id_unidad) : null;
         const cursoRel = unidadRel ? misCursos.find(c => c.id_curso === unidadRel.id_curso) : null;
         return {
            ...entrega,
            tarea_info: tareaRel,
            curso_info: cursoRel
         };
      });

      setEntregas(entregasEnriquecidas);
    } catch (error) {
      console.error("Error cargando entregas:", error);
    } finally {
      setLoading(false);
    }
  };

  const abrirModal = (entrega) => {
    setEntregaActiva(entrega);
    setCalificacionData({ 
      nota: entrega.calificacion || '', 
      observacion: '' 
    });
    setModalAbierto(true);
  };

  const handleGuardarCalificacion = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const notaFinal = parseFloat(calificacionData.nota);
      if (isNaN(notaFinal) || notaFinal < 0 || notaFinal > 100) {
         alert("La calificación debe ser un número entre 0 y 100");
         return;
      }

      const { error } = await supabase
        .from('entregas')
        .update({
          calificacion: notaFinal,
          estado: 'calificado'
        })
        .eq('id_entrega', entregaActiva.id_entrega);

      if (error) throw error;
      
      setModalAbierto(false);
      alert("¡Calificación guardada exitosamente!");
      fetchEntregasArbol(); // Recargar datos
    } catch (error) {
       console.error(error);
       alert("Error guardando la calificación.");
    } finally {
       setGuardando(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Revisión de Tareas</h1>
        <p className="mt-1 text-slate-500">Evalúa los trabajos enviados por tus estudiantes.</p>
      </div>

      {loading ? (
        <div className="text-center py-10 animate-pulse text-slate-500">Buscando entregas nuevas...</div>
      ) : entregas.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">
           <Activity className="w-16 h-16 mx-auto mb-4 text-slate-300"/>
           <h3 className="text-xl font-medium text-slate-800 mb-2">Buzón vacío</h3>
           <p>Aún no hay entregas pendientes de revisar en tus cursos.</p>
        </div>
      ) : (
        <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Estudiante</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Curso / Tarea</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Calificación</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acción</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {entregas.map((entrega) => (
                  <tr key={entrega.id_entrega} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold">
                          {(entrega.estudiante?.nombre || '?').charAt(0)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-slate-900">{entrega.estudiante?.nombre} {entrega.estudiante?.apellido}</div>
                          <div className="text-sm text-slate-500">{entrega.estudiante?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-indigo-600">{entrega.curso_info?.nombre}</div>
                      <div className="text-sm text-slate-600 truncate max-w-xs">{entrega.tarea_info?.titulo}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {new Date(entrega.fecha_entrega).toLocaleDateString()}
                      <br/>
                      <span className="text-xs">{new Date(entrega.fecha_entrega).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {entrega.estado === 'entregado' ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800">
                          <Clock className="w-3 h-3 mr-1 mt-0.5" /> Pendiente
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-100 text-emerald-800">
                          <CheckCircle className="w-3 h-3 mr-1 mt-0.5" /> Revisado
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-slate-700">
                       {entrega.calificacion !== null ? `${entrega.calificacion}/100` : '--'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => abrirModal(entrega)}
                        className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1.5 rounded-md hover:bg-indigo-100 transition">
                        Evaluar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Calificación */}
      {modalAbierto && entregaActiva && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-4 border-b border-slate-100 bg-indigo-50 flex justify-between items-center">
              <div>
                 <h3 className="text-lg font-bold text-indigo-900">Revisando Trabajo</h3>
                 <p className="text-sm text-indigo-600">{entregaActiva.estudiante?.nombre} - {entregaActiva.tarea_info?.titulo}</p>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
               {/* Sección del archivo / enlace evidenciado */}
               <div className="mb-6 p-4 border border-slate-200 rounded-lg bg-slate-50">
                  <h4 className="text-sm font-bold text-slate-500 uppercase mb-3">Evidencia Enviada</h4>
                  {entregaActiva.contenido_url ? (
                     <div className="flex items-center space-x-3">
                         <FileText className="w-8 h-8 text-indigo-500" />
                         <a 
                           href={entregaActiva.contenido_url} 
                           target="_blank" rel="noreferrer"
                           className="flex-1 text-sm font-medium text-indigo-600 hover:text-indigo-800 underline truncate"
                         >
                           Desplegar archivo/enlace de la entrega adjunta
                         </a>
                         <a href={entregaActiva.contenido_url} target="_blank" rel="noreferrer" className="p-2 bg-indigo-100 rounded hover:bg-indigo-200 text-indigo-700">
                            <ExternalLink className="w-4 h-4"/>
                         </a>
                     </div>
                  ) : (
                     <div className="p-3 bg-amber-50 text-amber-700 text-sm rounded border border-amber-200">
                        El estudiante no adjuntó ningún archivo. Solo texto.
                     </div>
                  )}
               </div>

               <div className="mb-6">
                  <h4 className="text-sm font-bold text-slate-500 uppercase mb-2">Comentarios del Alumno</h4>
                  <p className="p-3 bg-slate-50 rounded border border-slate-200 text-slate-700 text-sm whitespace-pre-wrap">
                     {entregaActiva.comentarios || 'Sin comentarios adicionales.'}
                  </p>
               </div>

               <hr className="my-6 border-slate-200" />

               <form id="evalForm" onSubmit={handleGuardarCalificacion}>
                  <h4 className="text-sm font-bold text-slate-500 uppercase mb-3">Asignar Calificación</h4>
                  <div className="flex items-center space-x-4 mb-4">
                     <div className="flex-1">
                       <label className="text-xs text-slate-500 block mb-1">Puntos (0 a 100)</label>
                       <input 
                         required
                         type="number" 
                         min="0" max="100" step="0.1"
                         value={calificacionData.nota}
                         onChange={e => setCalificacionData({...calificacionData, nota: e.target.value})}
                         className="w-full text-lg font-bold border border-slate-300 rounded px-3 py-2 text-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                         placeholder="Ej: 90"
                       />
                     </div>
                     <div className="flex-[2]">
                       <label className="text-xs text-slate-500 block mb-1">Feedback Privado</label>
                       <input type="text" className="w-full text-sm border border-slate-300 rounded px-3 py-2 bg-slate-50 focus:outline-none cursor-not-allowed" placeholder="Próximamente..." disabled />
                     </div>
                  </div>
               </form>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3">
              <button onClick={() => setModalAbierto(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded transition">Cerrar</button>
              <button type="submit" form="evalForm" disabled={guardando} className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center">
                {guardando ? 'Guardando...' : <><CheckCircle className="w-4 h-4 mr-2" /> Guardar Calificación</>}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
