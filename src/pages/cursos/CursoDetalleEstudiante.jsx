import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, BookOpen, FileText, CheckSquare, PlayCircle, ExternalLink, HelpCircle } from 'lucide-react';

export default function CursoDetalleEstudiante() {
  const { id } = useParams();
  const { profile } = useAuth();
  const [curso, setCurso] = useState(null);
  const [unidades, setUnidades] = useState([]);
  const [entregasHechas, setEntregasHechas] = useState([]);
  const [cuestionarios, setCuestionarios] = useState([]);
  const [intentosHechos, setIntentosHechos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados del Modal de Entrega
  const [modalEntrega, setModalEntrega] = useState(false);
  const [tareaActiva, setTareaActiva] = useState(null);
  const [entregaData, setEntregaData] = useState({ archivo: null, comentarios: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (profile && id) {
      fetchCursoDetalle();
    }
  }, [profile, id]);

  const fetchCursoDetalle = async () => {
    setLoading(true);
    try {
      const { data: cursoData, error: cursoErr } = await supabase
        .from('cursos')
        .select('*, docente:usuarios(nombre, apellido)')
        .eq('id_curso', id)
        .single();
      if (cursoErr) throw cursoErr;

      const { data: unidadesData, error: unidadesErr } = await supabase
        .from('unidades')
        .select(`
          *,
          materiales (*),
          tareas (*)
        `)
        .eq('id_curso', id)
        .order('orden', { ascending: true });
      if (unidadesErr) throw unidadesErr;

      // Obtener las entregas que ya hizo este estudiante
      const { data: entregasData } = await supabase
        .from('entregas')
        .select('*')
        .eq('id_usuario', profile.id_usuario);

      // Obtener cuestionarios del curso
      const { data: cuestionariosData } = await supabase
        .from('cuestionarios')
        .select('*')
        .eq('id_curso', id)
        .order('fecha_creacion', { ascending: true });

      // Obtener intentos de cuestionario del estudiante
      const { data: intentosData } = await supabase
        .from('intentos_cuestionario')
        .select('*')
        .eq('id_usuario', profile.id_usuario);

      setCurso(cursoData);
      setUnidades(unidadesData || []);
      setEntregasHechas(entregasData || []);
      setCuestionarios(cuestionariosData || []);
      setIntentosHechos(intentosData || []);
    } catch (error) {
      console.error('Error fetching curso detalle para estudiante:', error);
    } finally {
      setLoading(false);
    }
  };

  const abrirModalEntrega = (tarea) => {
    setTareaActiva(tarea);
    setEntregaData({ archivo: null, comentarios: '' });
    setModalEntrega(true);
  };

  const handleEnviarTarea = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    let finalUrl = null;

    try {
      // 1. Si hay un archivo, lo subimos al Storage
      if (entregaData.archivo) {
        const fileExt = entregaData.archivo.name.split('.').pop();
        const fileName = `${profile.id_usuario}_${tareaActiva.id_tarea}_${Date.now()}.${fileExt}`;
        const filePath = `archivos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('entregas')
          .upload(filePath, entregaData.archivo);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('entregas')
          .getPublicUrl(filePath);

        finalUrl = publicUrlData.publicUrl;
      }

      // 2. Registramos la entrega en la base de datos
      const { error } = await supabase.from('entregas').insert({
        id_tarea: tareaActiva.id_tarea,
        id_usuario: profile.id_usuario,
        contenido_entrega: finalUrl || 'Texto: ' + entregaData.comentarios,
        contenido_url: finalUrl,
        comentarios: entregaData.comentarios,
        estado: 'entregado',
        calificacion: null
      });

      if (error) throw error;
      
      alert("¡Tarea entregada con éxito!");
      setModalEntrega(false);
      setTareaActiva(null);
      fetchCursoDetalle(); // Refrescar para ver el estado de entregado
    } catch (error) {
      console.error("Error al enviar tarea:", error);
      alert("Hubo un problema al subir tu archivo. Verifica si el formato es correcto o intenta más tarde.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Entrando al curso...</div>;
  if (!curso) return <div className="p-8 text-center text-red-500">Curso no encontrado o sin acceso.</div>;

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <Link to="/dashboard/cursos" className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1"/> Volver a mis cursos
      </Link>

      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-xl shadow-lg border border-indigo-900 p-8 mb-8 text-white relative overflow-hidden">
        {curso.imagen_url && (
            <div className="absolute inset-0 opacity-20">
               <img src={curso.imagen_url} alt="Fondo" className="w-full h-full object-cover" />
            </div>
        )}
        <div className="relative z-10 flex flex-col md:flex-row md:justify-between md:items-end gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold mb-3">{curso.nombre}</h1>
            <p className="text-indigo-100 max-w-2xl text-lg mb-4">{curso.descripcion}</p>
            <div className="inline-flex items-center text-sm font-medium bg-white/20 px-3 py-1 rounded-full text-indigo-50 backdrop-blur-sm">
              Docente: {curso.docente?.nombre} {curso.docente?.apellido}
            </div>
          </div>
          
          {/* Requisito Avanzado: Barra de Progreso */}
          {(() => {
            const totalTareas = unidades.reduce((acc, u) => acc + (u.tareas ? u.tareas.length : 0), 0);
            const tareasEntregadas = unidades.reduce((acc, u) => {
              return acc + (u.tareas ? u.tareas.filter(t => entregasHechas.some(e => e.id_tarea === t.id_tarea)).length : 0);
            }, 0);
            const progreso = totalTareas === 0 ? 0 : Math.round((tareasEntregadas / totalTareas) * 100);

            return (
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-xl w-full md:w-64">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-indigo-50">Tu Progreso</span>
                  <span className="text-sm font-bold text-white">{progreso}%</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2.5">
                  <div className="bg-green-400 h-2.5 rounded-full transition-all duration-500 ease-out" style={{ width: `${progreso}%` }}></div>
                </div>
                <p className="text-xs text-indigo-200 mt-2 text-right">{tareasEntregadas} de {totalTareas} tareas</p>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Sección Cuestionarios Generales */}
      {cuestionarios.length > 0 && (
        <div className="mb-10 animate-fade-in">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
            <HelpCircle className="w-6 h-6 mr-2 text-indigo-600" />
            Evaluaciones y Cuestionarios
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cuestionarios.map((c) => {
              const intento = intentosHechos.find(i => i.id_cuestionario === c.id_cuestionario);
              return (
                <div key={c.id_cuestionario} className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm hover:shadow-md transition">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-800">{c.titulo}</h3>
                    {intento ? (
                      <span className="text-xs font-bold bg-green-100 text-green-800 px-2 py-1 rounded">
                        Calificación: {intento.calificacion}/100
                      </span>
                    ) : (
                      <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-1 rounded">
                        Pendiente
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">{c.descripcion}</p>
                  
                  {intento ? (
                    <div className="text-sm font-medium text-slate-500 flex items-center">
                       <CheckSquare className="w-4 h-4 mr-1 text-green-500" /> Realizado el {new Date(intento.fecha_intento).toLocaleDateString()}
                    </div>
                  ) : (
                    <Link to={`/dashboard/cursos/${id}/cuestionario/${c.id_cuestionario}/resolver`} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center">
                      Resolver Cuestionario <ArrowLeft className="w-4 h-4 ml-1 transform rotate-180" />
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="space-y-6">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Contenido del Curso</h2>
        
        {unidades.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200 shadow-sm">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3"/>
            <h3 className="text-lg font-medium text-slate-700">El curso aún no tiene unidades</h3>
            <p className="text-slate-500 text-sm mt-1">El docente está preparando el material, regresa pronto.</p>
          </div>
        ) : (
          unidades.map((unidad, index) => (
            <div key={unidad.id_unidad} className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden mb-6 hover:shadow-md transition">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-800">
                  <span className="text-indigo-600 mr-2">Unidad {index + 1}:</span>
                  {unidad.titulo}
                </h3>
              </div>
              <div className="p-6">
                <p className="text-sm text-slate-600 mb-6 leading-relaxed bg-slate-50 p-4 rounded text-justify border border-slate-100">{unidad.descripcion}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Materiales */}
                  <div>
                    <h4 className="flex items-center text-sm font-bold uppercase text-slate-500 mb-3 border-b border-slate-100 pb-2">
                      <FileText className="w-4 h-4 mr-2"/> Recursos de Estudio
                    </h4>
                    {unidad.materiales && unidad.materiales.length > 0 ? (
                      <ul className="space-y-3">
                        {unidad.materiales.map(mat => (
                          <li key={mat.id_material}>
                             <a 
                               href={mat.contenido_url || '#'} 
                               target="_blank" 
                               rel="noreferrer" 
                               className="flex items-center justify-between p-3 rounded-md bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-sm group transition"
                             >
                               <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-700">{mat.titulo}</span>
                               <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-indigo-500"/>
                             </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                       <p className="text-sm text-slate-400 italic p-3 bg-slate-50 rounded">Sin materiales.</p>
                    )}
                  </div>

                  {/* Tareas */}
                  <div>
                    <h4 className="flex items-center text-sm font-bold uppercase text-slate-500 mb-3 border-b border-slate-100 pb-2">
                       <CheckSquare className="w-4 h-4 mr-2"/> Evaluaciones / Tareas
                    </h4>
                    {unidad.tareas && unidad.tareas.length > 0 ? (
                      <ul className="space-y-3">
                        {unidad.tareas.map(tarea => {
                          const yaEntregado = entregasHechas.some(e => e.id_tarea === tarea.id_tarea);
                          return (
                          <li key={tarea.id_tarea} className="flex items-center justify-between p-3 rounded-md bg-white border border-slate-200 hover:border-amber-300 hover:shadow-sm group transition">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-700 group-hover:text-amber-700">{tarea.titulo}</span>
                              {tarea.fecha_limite ? (
                                <span className="text-xs text-amber-600 mt-1">
                                  Vence: {new Date(tarea.fecha_limite).toLocaleDateString()}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-500 mt-1">Sin límite de tiempo</span>
                              )}
                            </div>
                            
                            {yaEntregado ? (
                              <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded flex items-center">
                                <CheckSquare className="w-3 h-3 mr-1" /> Entregado
                              </span>
                            ) : (
                              <button 
                                onClick={() => abrirModalEntrega(tarea)}
                                className="flex items-center text-xs font-semibold bg-amber-100 text-amber-800 px-3 py-1.5 rounded hover:bg-amber-200 transition">
                                Entregar
                              </button>
                            )}
                          </li>
                        )})}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-400 italic p-3 bg-slate-50 rounded">Sin tareas.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL DE ENTREGA */}
      {modalEntrega && tareaActiva && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-slate-100 bg-amber-50">
              <h3 className="text-lg font-bold text-amber-800">Entregar: {tareaActiva.titulo}</h3>
              <p className="text-xs text-amber-600 mt-1 line-clamp-2">{tareaActiva.descripcion}</p>
            </div>
            
            <form onSubmit={handleEnviarTarea} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Subir Archivo de tu Tarea</label>
                  <input 
                    type="file" 
                    onChange={e => setEntregaData({...entregaData, archivo: e.target.files[0]})} 
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" 
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.zip"
                  />
                  <p className="text-xs text-slate-400 mt-1">Soporta PDF, Word, Excel, PowerPoint, Imágenes y ZIP.</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tus Respuestas / Comentarios</label>
                  <textarea 
                    rows="4" 
                    required={!entregaData.archivo} // Es obligatorio escribir si no hay archivo
                    value={entregaData.comentarios} 
                    onChange={e => setEntregaData({...entregaData, comentarios: e.target.value})} 
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                    placeholder="Escribe tus respuestas o comentarios adicionales aquí..."
                  ></textarea>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => setModalEntrega(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {isSubmitting ? 'Enviando...' : 'Enviar Asignación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
