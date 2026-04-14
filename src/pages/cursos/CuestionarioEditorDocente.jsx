import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Plus, CheckCircle, Circle, Trash2, Save, HelpCircle } from 'lucide-react';

export default function CuestionarioEditorDocente() {
  const { id: id_curso, id_cuestionario } = useParams();
  const [cuestionario, setCuestionario] = useState(null);
  const [preguntas, setPreguntas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados Formulario Pregunta
  const [nuevaPregunta, setNuevaPregunta] = useState('');
  const [puntosPregunta, setPuntosPregunta] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados Formulario Opciones
  const [opcionData, setOpcionData] = useState({ texto: '', es_correcta: false, id_pregunta: null });

  useEffect(() => {
    fetchCuestionario();
  }, [id_cuestionario]);

  const fetchCuestionario = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Fetch cuestionario info
      const { data: qData, error: qErr } = await supabase
        .from('cuestionarios')
        .select('*')
        .eq('id_cuestionario', id_cuestionario)
        .single();
      if (qErr) throw qErr;

      // Fetch preguntas + opciones
      const { data: pData, error: pErr } = await supabase
        .from('preguntas')
        .select('*, opciones(*)')
        .eq('id_cuestionario', id_cuestionario)
        .order('id_pregunta', { ascending: true });
      if (pErr) throw pErr;

      setCuestionario(qData);
      setPreguntas(pData || []);
    } catch (error) {
      console.error('Error fetching cuestionario details:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleCrearPregunta = async () => {
    const texto = nuevaPregunta.trim();
    if (!texto) {
      alert("Por favor escribe el texto de la pregunta.");
      return;
    }

    setIsSubmitting(true);
    try {
      const q_id = parseInt(id_cuestionario);
      const points = parseInt(puntosPregunta) || 10;

      const { error } = await supabase
        .from('preguntas')
        .insert({
          id_cuestionario: q_id,
          texto_pregunta: texto,
          puntos: points,
          tipo: 'opcion_multiple'
        });

      if (error) {
        throw error;
      }
      
      setNuevaPregunta('');
      setPuntosPregunta(10);
      alert('¡Pregunta guardada exitosamente!');
      
      await fetchCuestionario(true);
    } catch (error) {
      console.error("Error creating pregunta:", error);
      alert("Error al guardar la pregunta: " + (error.message || "Error desconocido"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCrearOpcion = async (e, id_pregunta) => {
    e.preventDefault();
    if (!opcionData.texto.trim()) return;
    setIsSubmitting(true);
    try {
      // 1. Si esta es marcada como correcta, asegurar que las demás opciones de esta pregunta sean falsas
      if (opcionData.es_correcta) {
        const { error: resetError } = await supabase.from('opciones')
          .update({ es_correcta: false })
          .eq('id_pregunta', id_pregunta);
        if (resetError) throw resetError;
      }

      // 2. Insertar la nueva opción
      const { error: insertError } = await supabase.from('opciones').insert({
        id_pregunta: id_pregunta,
        texto_opcion: opcionData.texto,
        es_correcta: opcionData.es_correcta
      });
      if (insertError) throw insertError;
      
      setOpcionData({ texto: '', es_correcta: false, id_pregunta: null });
      alert('¡Opción guardada exitosamente!');
      await fetchCuestionario(true);
    } catch (error) {
      console.error("Error creating opcion:", error);
      alert("Error al guardar la opción: " + (error.message || error.details || "Error desconocido"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEliminarPregunta = async (id_pregunta) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta pregunta y sus opciones?")) return;
    try {
      const { error } = await supabase.from('preguntas').delete().eq('id_pregunta', id_pregunta);
      if (error) throw error;
      fetchCuestionario();
    } catch (err) {
      console.error("Error deleting pregunta", err);
    }
  };

  const handleEliminarOpcion = async (id_opcion) => {
    try {
      const { error } = await supabase.from('opciones').delete().eq('id_opcion', id_opcion);
      if (error) throw error;
      fetchCuestionario();
    } catch (err) {
      console.error("Error deleting opcion", err);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Cargando editor...</div>;
  if (!cuestionario) return <div className="p-8 text-center text-red-500">Cuestionario no encontrado.</div>;

  return (
    <div className="max-w-5xl mx-auto animate-fade-in pb-20">
      <Link to={`/dashboard/cursos-docente/${id_curso}`} className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1"/> Volver al curso
      </Link>

      <div className="bg-indigo-700 rounded-xl shadow-md p-8 mb-8 text-white">
        <div className="flex items-center mb-4">
          <HelpCircle className="w-8 h-8 mr-3 text-indigo-200" />
          <h1 className="text-3xl font-extrabold">{cuestionario.titulo}</h1>
        </div>
        <p className="text-indigo-100 max-w-3xl">{cuestionario.descripcion}</p>
      </div>

      <div className="space-y-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-800">Preguntas del Cuestionario</h2>
          </div>
          <div className="p-6">
            {preguntas.length === 0 ? (
              <div className="text-center py-8 text-slate-500 italic">No hay preguntas creadas.</div>
            ) : (
              <div className="space-y-6">
                {preguntas.map((pregunta, index) => (
                  <div key={pregunta.id_pregunta} className="border border-slate-200 rounded-lg p-5 bg-white relative">
                    <button 
                      onClick={() => handleEliminarPregunta(pregunta.id_pregunta)}
                      className="absolute top-4 right-4 text-slate-400 hover:text-red-500">
                      <Trash2 className="w-5 h-5"/>
                    </button>
                    <h3 className="font-bold text-slate-800 pr-10">
                      <span className="text-indigo-600 mr-2">{index + 1}.</span>
                      {pregunta.texto_pregunta}
                    </h3>
                    <div className="text-xs text-slate-400 mt-1 mb-4 font-medium uppercase tracking-wide">
                      Puntos: {pregunta.puntos}
                    </div>

                    <div className="pl-6 space-y-2 mt-4 border-l-2 border-indigo-100">
                      {pregunta.opciones && pregunta.opciones.map(opt => (
                        <div key={opt.id_opcion} className={`flex items-center justify-between p-3 rounded-md border ${opt.es_correcta ? 'bg-green-50 border-green-200 shadow-sm' : 'bg-slate-50 border-slate-200'}`}>
                          <div className="flex items-center text-sm">
                            {opt.es_correcta ? (
                               <CheckCircle className="w-4 h-4 mr-3 text-green-600" />
                            ) : (
                               <Circle className="w-4 h-4 mr-3 text-slate-300" />
                            )}
                            <span className={opt.es_correcta ? 'font-semibold text-green-900' : 'text-slate-700'}>{opt.texto_opcion}</span>
                          </div>
                          <button onClick={() => handleEliminarOpcion(opt.id_opcion)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                        </div>
                      ))}

                      {/* Add Opcion form for this specific pregunta */}
                      <form 
                        onSubmit={(e) => handleCrearOpcion(e, pregunta.id_pregunta)}
                        className="mt-4 flex flex-col sm:flex-row items-center gap-3">
                        <input 
                          type="text" 
                          placeholder="Añadir nueva opción..."
                          className="flex-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:bg-slate-800 dark:text-white dark:border-slate-600"
                          value={opcionData.id_pregunta === pregunta.id_pregunta ? opcionData.texto : ''}
                          onChange={e => setOpcionData({ ...opcionData, id_pregunta: pregunta.id_pregunta, texto: e.target.value })}
                          required={opcionData.id_pregunta === pregunta.id_pregunta}
                        />
                        <label className="flex items-center text-sm text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                          <input 
                            type="checkbox" 
                            className="mr-2 rounded text-indigo-600 focus:ring-indigo-500"
                            checked={opcionData.id_pregunta === pregunta.id_pregunta ? opcionData.es_correcta : false}
                            onChange={e => setOpcionData({ ...opcionData, id_pregunta: pregunta.id_pregunta, es_correcta: e.target.checked })}
                          />
                          Es correcta
                        </label>
                        <button 
                          type="submit" 
                          disabled={isSubmitting || opcionData.id_pregunta !== pregunta.id_pregunta || !opcionData.texto}
                          className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-400 disabled:opacity-70 text-sm font-semibold rounded-md transition-colors flex items-center whitespace-nowrap">
                          <Plus className="w-4 h-4 mr-1"/> Guardar Opción
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Nueva Pregunta Form */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center">
            <Plus className="w-5 h-5 mr-2 text-indigo-600"/> Añadir Pregunta
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Texto de la pregunta</label>
              <textarea 
                rows="2" 
                value={nuevaPregunta} 
                onChange={(e) => setNuevaPregunta(e.target.value)} 
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" 
                placeholder="Escribe la pregunta aquí..."
              />
            </div>
            <div className="w-1/3">
              <label className="block text-sm font-medium text-slate-700 mb-1">Puntos asignados</label>
              <input 
                type="number" 
                value={puntosPregunta} 
                onChange={(e) => setPuntosPregunta(Number(e.target.value))} 
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" 
              />
            </div>
            <div className="flex justify-end pt-2">
              <button 
                type="button"
                onClick={handleCrearPregunta} 
                disabled={isSubmitting} 
                className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center transition-colors">
                {isSubmitting ? (
                  <>Guardando...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2"/> Guardar Pregunta</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
