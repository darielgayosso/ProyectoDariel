import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, CheckCircle, HelpCircle, AlertCircle } from 'lucide-react';

export default function ResolverCuestionario() {
  const { id: id_curso, id_cuestionario } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [cuestionario, setCuestionario] = useState(null);
  const [preguntas, setPreguntas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [yaRespondido, setYaRespondido] = useState(false);
  const [calificacionFinal, setCalificacionFinal] = useState(null);

  // keys = id_pregunta, values = id_opcion
  const [respuestas, setRespuestas] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Revisar si ya lo respondió
      const { data: intentoData } = await supabase
        .from('intentos_cuestionario')
        .select('*')
        .eq('id_cuestionario', id_cuestionario)
        .eq('id_usuario', profile.id_usuario)
        .maybeSingle();

      if (intentoData) {
        setYaRespondido(true);
        setCalificacionFinal(intentoData.calificacion);
      }

      // 2. Traer info del cuestionario y preguntas
      const { data: qData, error: qErr } = await supabase
        .from('cuestionarios')
        .select('*')
        .eq('id_cuestionario', id_cuestionario)
        .single();
      if (qErr) throw qErr;

      const { data: pData, error: pErr } = await supabase
        .from('preguntas')
        .select('*, opciones(*)')
        .eq('id_cuestionario', id_cuestionario)
        .order('id_pregunta', { ascending: true });
      if (pErr) throw pErr;

      setCuestionario(qData);
      setPreguntas(pData || []);
    } catch (error) {
      console.error('Error fetching cuestionario para resolver:', error);
    } finally {
      setLoading(false);
    }
  }, [id_cuestionario, profile]);

  useEffect(() => {
    if (profile && id_cuestionario) {
      fetchData();
    }
  }, [profile, id_cuestionario, fetchData]);

  const handleSeleccionarOpcion = (id_pregunta, id_opcion) => {
    if (yaRespondido) return;
    setRespuestas({
      ...respuestas,
      [id_pregunta]: id_opcion
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar si respondió todo
    if (Object.keys(respuestas).length < preguntas.length) {
      alert("Por favor responde todas las preguntas antes de enviar el cuestionario.");
      return;
    }

    if (!window.confirm("¿Estás seguro de enviar tus respuestas? Ya no podrás editarlas.")) return;

    setIsSubmitting(true);
    try {
      // Calcular calificación (sobre 100)
      let puntosObtenidos = 0;
      let puntosTotales = 0;

      preguntas.forEach(pregunta => {
        puntosTotales += Number(pregunta.puntos || 10);
        const opcionElegidaId = respuestas[pregunta.id_pregunta];
        if (opcionElegidaId) {
          const opcion = pregunta.opciones.find(o => o.id_opcion === opcionElegidaId);
          if (opcion && opcion.es_correcta) {
            puntosObtenidos += Number(pregunta.puntos || 10);
          }
        }
      });

      const calificacion_calculada = puntosTotales === 0 ? 0 : Math.round((puntosObtenidos / puntosTotales) * 100);

      // 1. Guardar Intento
      const { data: nuevoIntento, error: intentoError } = await supabase
        .from('intentos_cuestionario')
        .insert({
          id_cuestionario,
          id_usuario: profile.id_usuario,
          calificacion: calificacion_calculada
        })
        .select()
        .single();

      if (intentoError) throw intentoError;

      // 2. Guardar Respuestas Individuales
      const respuestasAGuardar = Object.keys(respuestas).map(idPregunta => ({
        id_intento: nuevoIntento.id_intento,
        id_pregunta: parseInt(idPregunta),
        id_opcion: respuestas[idPregunta]
      }));

      if (respuestasAGuardar.length > 0) {
        const { error: errorRespuestas } = await supabase
          .from('respuestas_usuario')
          .insert(respuestasAGuardar);
        if (errorRespuestas) throw errorRespuestas;
      }

      setYaRespondido(true);
      setCalificacionFinal(calificacion_calculada);
      window.scrollTo(0, 0);

    } catch (error) {
      console.error("Error al calificar cuestionario:", error);
      alert("Hubo un error al enviar el cuestionario. " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Cargando cuestionario...</div>;
  if (!cuestionario) return <div className="p-8 text-center text-red-500">Cuestionario no encontrado.</div>;

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-20">
      <Link to={`/dashboard/cursos/${id_curso}`} className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1"/> Volver al curso
      </Link>

      <div className="bg-indigo-700 rounded-t-xl shadow-sm p-8 text-white relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold flex items-center mb-3">
             <HelpCircle className="w-8 h-8 mr-3 text-indigo-200" />
             {cuestionario.titulo}
          </h1>
          <p className="text-indigo-100 max-w-2xl text-lg">{cuestionario.descripcion}</p>
        </div>
      </div>

      {yaRespondido && (
        <div className="bg-green-50 border-x border-b border-green-200 p-8 flex flex-col items-center justify-center text-center shadow-sm">
          <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
          <h2 className="text-2xl font-bold text-green-800 mb-2">¡Cuestionario Completado!</h2>
          <p className="text-green-700 mb-6">Tus respuestas ya han sido registradas y evaluadas.</p>
          <div className="bg-white px-8 py-4 rounded-xl shadow-sm border border-green-100 flex flex-col items-center">
             <span className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Calificación Obtenida</span>
             <span className={`text-5xl font-extrabold ${calificacionFinal >= 60 ? 'text-green-600' : 'text-red-500'}`}>
                {calificacionFinal}<span className="text-2xl text-slate-400">/100</span>
             </span>
          </div>
          <button 
             onClick={() => navigate(`/dashboard/cursos/${id_curso}`)}
             className="mt-8 px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition">
             Regresar al curso
          </button>
        </div>
      )}

      {!yaRespondido && (
        <div className="bg-white border-x border-b border-slate-200 shadow-sm rounded-b-xl p-8">
          {preguntas.length === 0 ? (
            <div className="text-center py-10">
              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3"/>
              <p className="text-slate-600 font-medium">Este cuestionario aún no tiene preguntas configuradas.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              {preguntas.map((pregunta, index) => (
                <div key={pregunta.id_pregunta} className="border border-slate-100 rounded-xl p-6 bg-slate-50">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-start">
                    <span className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3 flex-shrink-0">
                      {index + 1}
                    </span>
                    {pregunta.texto_pregunta}
                  </h3>
                  
                  <div className="space-y-3 pl-11">
                    {pregunta.opciones && pregunta.opciones.map(opt => (
                      <label 
                        key={opt.id_opcion} 
                        className={`flex items-center p-4 rounded-lg border cursor-pointer transition-all ${
                          respuestas[pregunta.id_pregunta] === opt.id_opcion 
                            ? 'bg-indigo-50 border-indigo-500 shadow-sm' 
                            : 'bg-white border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name={`pregunta_${pregunta.id_pregunta}`}
                          value={opt.id_opcion}
                          className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                          checked={respuestas[pregunta.id_pregunta] === opt.id_opcion}
                          onChange={() => handleSeleccionarOpcion(pregunta.id_pregunta, opt.id_opcion)}
                        />
                        <span className="ml-3 font-medium text-slate-700">{opt.texto_opcion}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <div className="pt-6 border-t border-slate-200 flex justify-end">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 hover:shadow-lg transition-all disabled:opacity-50">
                  {isSubmitting ? 'Evaluando...' : 'Enviar Respuestas'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
