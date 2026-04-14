import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Plus, BookOpen, FileText, CheckSquare, Trash2, X, HelpCircle } from 'lucide-react';

export default function CursoDetalleDocente() {
  const { id } = useParams();
  const { profile } = useAuth();
  const [curso, setCurso] = useState(null);
  const [unidades, setUnidades] = useState([]);
  const [cuestionarios, setCuestionarios] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados de Modales
  const [modalUnidad, setModalUnidad] = useState(false);
  const [modalMaterial, setModalMaterial] = useState(false);
  const [modalTarea, setModalTarea] = useState(false);
  const [modalCuestionario, setModalCuestionario] = useState(false);

  // Estados de Formularios
  const [unidadData, setUnidadData] = useState({ titulo: '', descripcion: '' });
  const [cuestionarioData, setCuestionarioData] = useState({ titulo: '', descripcion: '' });
  const [materialData, setMaterialData] = useState({ titulo: '', descripcion: '', tipo: 'enlace', contenido_url: '' });
  const [tareaData, setTareaData] = useState({ titulo: '', descripcion: '', fecha_limite: '' });

  const [activeUnidadId, setActiveUnidadId] = useState(null);
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
        .select('*')
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

      const { data: cuestionariosData, error: cuestionariosErr } = await supabase
        .from('cuestionarios')
        .select('*')
        .eq('id_curso', id)
        .order('fecha_creacion', { ascending: true });
      if (cuestionariosErr) throw cuestionariosErr;

      setCurso(cursoData);
      setUnidades(unidadesData || []);
      setCuestionarios(cuestionariosData || []);
    } catch (error) {
      console.error('Error fetching curso detalle:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCrearCuestionario = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('cuestionarios').insert({
        id_curso: id,
        titulo: cuestionarioData.titulo,
        descripcion: cuestionarioData.descripcion
      });
      if (error) throw error;
      alert("¡Cuestionario guardado exitosamente!");
      setModalCuestionario(false);
      setCuestionarioData({ titulo: '', descripcion: '' });
      fetchCursoDetalle();
    } catch (error) {
      console.error("Error creating cuestionario:", error);
      alert("Error al guardar: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCrearUnidad = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('unidades').insert({
        id_curso: id,
        titulo: unidadData.titulo,
        descripcion: unidadData.descripcion,
        orden: unidades.length + 1
      });
      if (error) throw error;
      setModalUnidad(false);
      setUnidadData({ titulo: '', descripcion: '' });
      fetchCursoDetalle();
    } catch (error) {
      console.error("Error creating unidad:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCrearMaterial = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('materiales').insert({
        id_unidad: activeUnidadId,
        titulo: materialData.titulo,
        descripcion: materialData.descripcion,
        tipo: materialData.tipo,
        contenido_url: materialData.contenido_url
      });

      if (error) throw error;

      alert("¡Material guardado exitosamente!");
      setModalMaterial(false);
      setMaterialData({ titulo: '', descripcion: '', tipo: 'enlace', contenido_url: '' });
      fetchCursoDetalle();

    } catch (err) {
      console.error("Error insertando material:", err);
      alert("Error al guardar: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCrearTarea = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('tareas').insert({
        id_unidad: activeUnidadId,
        titulo: tareaData.titulo,
        descripcion: tareaData.descripcion,
        fecha_limite: tareaData.fecha_limite || null
      });

      if (error) throw error;

      alert("¡Tarea guardada exitosamente!");
      setModalTarea(false);
      setTareaData({ titulo: '', descripcion: '', fecha_limite: '' });
      fetchCursoDetalle();

    } catch (err) {
      console.error("Error insertando tarea:", err);
      alert("Error al guardar: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openMaterialModal = (idUnidad) => {
    setActiveUnidadId(idUnidad);
    setModalMaterial(true);
  };

  const openTareaModal = (idUnidad) => {
    setActiveUnidadId(idUnidad);
    setModalTarea(true);
  };

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Cargando detalles del curso...</div>;
  if (!curso) return <div className="p-8 text-center text-red-500">Curso no encontrado.</div>;

  return (
    <div className="max-w-5xl mx-auto animate-fade-in pb-20">
      <Link to="/dashboard/cursos-docente" className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1"/> Volver a mis cursos
      </Link>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 mb-2">{curso.nombre}</h1>
            <p className="text-slate-600 max-w-2xl">{curso.descripcion}</p>
          </div>
          <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-3">
            <button 
              onClick={() => setModalCuestionario(true)}
              className="flex items-center px-4 py-2 bg-indigo-100 text-indigo-700 rounded-md text-sm font-semibold hover:bg-indigo-200 transition-colors">
              <Plus className="w-4 h-4 mr-1"/> Nuevo Cuestionario
            </button>
            <button 
              onClick={() => setModalUnidad(true)}
              className="flex items-center px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-semibold hover:bg-slate-800 transition-colors">
              <Plus className="w-4 h-4 mr-1"/> Nueva Unidad
            </button>
          </div>
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
            {cuestionarios.map((c) => (
              <div key={c.id_cuestionario} className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm hover:shadow-md transition">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-slate-800">{c.titulo}</h3>
                </div>
                <p className="text-sm text-slate-600 mb-4 line-clamp-2">{c.descripcion}</p>
                <Link to={`/dashboard/cursos-docente/${id}/cuestionario/${c.id_cuestionario}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center">
                  Gestionar Preguntas <ArrowLeft className="w-4 h-4 ml-1 transform rotate-180" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6 animate-fade-in">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Unidades del Curso</h2>
        
        {unidades.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3"/>
            <h3 className="text-lg font-medium text-slate-700">No hay unidades todavía</h3>
            <p className="text-slate-500 text-sm mt-1">Empieza creando la primera unidad para este curso.</p>
          </div>
        ) : (
          unidades.map((unidad, index) => (
            <div key={unidad.id_unidad} className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-800">
                  <span className="text-indigo-600 mr-2">Unidad {index + 1}:</span>
                  {unidad.titulo}
                </h3>
                <div className="flex space-x-2">
                  <button onClick={() => openMaterialModal(unidad.id_unidad)} className="text-xs font-medium bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded hover:bg-slate-50 flex items-center transition-colors">
                    <Plus className="w-3 h-3 mr-1"/> Material
                  </button>
                  <button onClick={() => openTareaModal(unidad.id_unidad)} className="text-xs font-medium bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded hover:bg-slate-50 flex items-center transition-colors">
                    <Plus className="w-3 h-3 mr-1"/> Tarea
                  </button>
                </div>
              </div>
              <div className="p-6">
                <p className="text-sm text-slate-600 mb-4">{unidad.descripcion}</p>
                
                <div className="space-y-4">
                  {/* Materiales */}
                  {unidad.materiales && unidad.materiales.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Materiales de Estudio</h4>
                      <ul className="space-y-2">
                        {unidad.materiales.map(mat => (
                          <li key={mat.id_material} className="flex items-center justify-between p-3 rounded-md bg-slate-50 border border-slate-100">
                            <div className="flex items-center group">
                              <FileText className="w-4 h-4 text-indigo-500 mr-3"/>
                              <div className="flex flex-col">
                                <a href={mat.contenido_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-indigo-700 hover:underline">
                                  {mat.titulo} <span className="text-xs text-slate-400 font-normal ml-1">({mat.tipo})</span>
                                </a>
                                {mat.descripcion && <span className="text-xs text-slate-500">{mat.descripcion}</span>}
                              </div>
                            </div>
                            <button className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Tareas */}
                  {unidad.tareas && unidad.tareas.length > 0 && (
                    <div className="pt-2">
                      <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Tareas Asignadas</h4>
                      <ul className="space-y-2">
                        {unidad.tareas.map(tarea => (
                          <li key={tarea.id_tarea} className="flex items-center justify-between p-3 rounded-md bg-amber-50 border border-amber-100">
                            <div className="flex items-center">
                              <CheckSquare className="w-4 h-4 text-amber-600 mr-3"/>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-amber-900">{tarea.titulo}</span>
                                {tarea.fecha_limite && <span className="text-xs text-amber-700 font-semibold">Vence: {new Date(tarea.fecha_limite).toLocaleDateString()}</span>}
                                {tarea.descripcion && <span className="text-xs text-amber-700/70">{tarea.descripcion}</span>}
                              </div>
                            </div>
                            <div className="flex space-x-3">
                              <button className="text-xs font-medium text-indigo-600 hover:text-indigo-800">Ver Entregas</button>
                              <button className="text-amber-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(!unidad.materiales?.length && !unidad.tareas?.length) && (
                    <p className="text-sm text-slate-400 italic">Esta unidad no tiene contenido agregado.</p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- MODAL DE CUESTIONARIO --- */}
      {modalCuestionario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Crear Nuevo Cuestionario</h3>
              <button onClick={() => setModalCuestionario(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleCrearCuestionario} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Título del Cuestionario</label>
                  <input required type="text" value={cuestionarioData.titulo} onChange={e => setCuestionarioData({...cuestionarioData, titulo: e.target.value})} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ej. Examen Parcial" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                  <textarea required rows="3" value={cuestionarioData.descripcion} onChange={e => setCuestionarioData({...cuestionarioData, descripcion: e.target.value})} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Instrucciones para el estudiante..."></textarea>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => setModalCuestionario(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {isSubmitting ? 'Guardando...' : 'Crear Cuestionario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL DE UNIDAD --- */}
      {modalUnidad && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Crear Nueva Unidad</h3>
              <button onClick={() => setModalUnidad(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleCrearUnidad} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Título de la Unidad</label>
                  <input required type="text" value={unidadData.titulo} onChange={e => setUnidadData({...unidadData, titulo: e.target.value})} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ej. Introducción a Python" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                  <textarea required rows="3" value={unidadData.descripcion} onChange={e => setUnidadData({...unidadData, descripcion: e.target.value})} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="¿Qué se abordará en esta unidad?"></textarea>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => setModalUnidad(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {isSubmitting ? 'Guardando...' : 'Crear Unidad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL DE MATERIAL --- */}
      {modalMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Añadir Material</h3>
              <button onClick={() => setModalMaterial(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleCrearMaterial} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Título del Recurso</label>
                  <input required type="text" value={materialData.titulo} onChange={e => setMaterialData({...materialData, titulo: e.target.value})} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ej. Video Explicativo" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">URL (Enlace)</label>
                  <input required type="url" value={materialData.contenido_url} onChange={e => setMaterialData({...materialData, contenido_url: e.target.value})} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="https://youtube.com/..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                    <select value={materialData.tipo} onChange={e => setMaterialData({...materialData, tipo: e.target.value})} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="video">Video</option>
                      <option value="lectura">Lectura/PDF</option>
                      <option value="enlace">Enlace Web</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Breve Descripción (Opcional)</label>
                  <textarea rows="2" value={materialData.descripcion} onChange={e => setMaterialData({...materialData, descripcion: e.target.value})} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Instrucciones breves..."></textarea>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => setModalMaterial(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {isSubmitting ? 'Guardando...' : 'Añadir Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL DE TAREA --- */}
      {modalTarea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Asignar Nueva Tarea</h3>
              <button onClick={() => setModalTarea(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleCrearTarea} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Título de la Tarea</label>
                  <input required type="text" value={tareaData.titulo} onChange={e => setTareaData({...tareaData, titulo: e.target.value})} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ej. Ejercicio Práctico 1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Instrucciones</label>
                  <textarea required rows="4" value={tareaData.descripcion} onChange={e => setTareaData({...tareaData, descripcion: e.target.value})} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Describe lo que el alumno debe entregar..."></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Límite</label>
                  <input required type="date" value={tareaData.fecha_limite} onChange={e => setTareaData({...tareaData, fecha_limite: e.target.value})} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => setModalTarea(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {isSubmitting ? 'Guardando...' : 'Asignar Tarea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
