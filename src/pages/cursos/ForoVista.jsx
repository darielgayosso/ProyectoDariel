import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { MessageSquare, Send, BookOpen, Clock, User } from 'lucide-react';

export default function ForoVista() {
  const { profile } = useAuth();
  const [misCursos, setMisCursos] = useState([]);
  const [cursoActivo, setCursoActivo] = useState(null);
  
  const [foros, setForos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para nuevo foro (solo Docente)
  const [nuevoForo, setNuevoForo] = useState({ titulo: '', mensaje: '' });
  const [enviandoForo, setEnviandoForo] = useState(false);

  // Estados para nueva respuesta
  const [respuestaAbierta, setRespuestaAbierta] = useState(null); // id_foro
  const [textoRespuesta, setTextoRespuesta] = useState('');
  const [enviandoRespuesta, setEnviandoRespuesta] = useState(false);

  const isDocente = profile?.id_rol === 2 || profile?.id_rol === 1;

  const cargarCursos = useCallback(async () => {
    setLoading(true);
    try {
      if (isDocente) {
        const { data } = await supabase.from('cursos').select('id_curso, nombre').eq('id_docente', profile.id_usuario);
        setMisCursos(data || []);
        if (data && data.length > 0) setCursoActivo(data[0].id_curso);
      } else {
        // Estudiante
        const { data: insc } = await supabase.from('inscripciones').select('id_curso').eq('id_usuario', profile.id_usuario);
        if (insc && insc.length > 0) {
          const ids = insc.map(i => i.id_curso);
          const { data } = await supabase.from('cursos').select('id_curso, nombre').in('id_curso', ids);
          setMisCursos(data || []);
          if (data && data.length > 0) setCursoActivo(data[0].id_curso);
        } else {
           setMisCursos([]);
        }
      }
    } catch(e) {
      console.error(e);
    }
  }, [isDocente, profile]);

  useEffect(() => {
    if (profile) {
      cargarCursos();
    }
  }, [profile, cargarCursos]);

  const cargarForos = useCallback(async (id_curso) => {
    setLoading(true);
    try {
      // 1. Cargar foros
      const { data: dataForos } = await supabase
        .from('foros')
        .select(`
          *,
          autor:usuarios!id_usuario(nombre, apellido)
        `)
        .eq('id_curso', id_curso)
        .order('fecha_publicacion', { ascending: false });

      if (!dataForos || dataForos.length === 0) {
        setForos([]);
        setLoading(false);
        return;
      }

      const forosIds = dataForos.map(f => f.id_foro);

      // 2. Cargar respuestas
      const { data: dataRespuestas } = await supabase
        .from('respuestas')
        .select(`
          *,
          autor:usuarios!id_usuario(nombre, apellido, id_rol)
        `)
        .in('id_foro', forosIds)
        .order('fecha_respuesta', { ascending: true });

      // Clasificamos respuestas dentro de cada foro
      const forosCompletos = dataForos.map(f => ({
         ...f,
         respuestas: dataRespuestas ? dataRespuestas.filter(r => r.id_foro === f.id_foro) : []
      }));

      setForos(forosCompletos);
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (cursoActivo) {
      cargarForos(cursoActivo);
    } else {
      setForos([]);
      setLoading(false);
    }
  }, [cursoActivo, cargarForos]);

  const handleCrearForo = async (e) => {
    e.preventDefault();
    if (!cursoActivo || !nuevoForo.titulo || !nuevoForo.mensaje) return;
    
    setEnviandoForo(true);
    try {
      const { error } = await supabase.from('foros').insert({
         id_curso: cursoActivo,
         id_usuario: profile.id_usuario,
         titulo: nuevoForo.titulo,
         mensaje: nuevoForo.mensaje
      });
      if (error) throw error;
      
      setNuevoForo({ titulo: '', mensaje: '' });
      cargarForos(cursoActivo);
    } catch(error) {
      console.error(error);
      alert("Error al publicar en el foro.");
    } finally {
      setEnviandoForo(false);
    }
  };

  const handleResponder = async (e, id_foro) => {
    e.preventDefault();
    if (!textoRespuesta) return;
    
    setEnviandoRespuesta(true);
    try {
      const { error } = await supabase.from('respuestas').insert({
         id_foro: id_foro,
         id_usuario: profile.id_usuario,
         mensaje: textoRespuesta
      });
      if(error) throw error;

      setTextoRespuesta('');
      setRespuestaAbierta(null);
      cargarForos(cursoActivo); // refrescar para ver el comnetario
    } catch(error) {
      console.error(error);
      alert("Error enviando respuesta");
    } finally {
      setEnviandoRespuesta(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Muro y Anuncios</h1>
          <p className="mt-2 text-slate-500">Mantente al tanto de la comunicación en tus cursos.</p>
        </div>
        
        {misCursos.length > 0 && (
          <div className="flex items-center space-x-3">
             <div className="bg-slate-50 border border-slate-200 rounded-lg flex items-center pl-3">
               <BookOpen className="w-4 h-4 text-slate-400" />
               <select 
                 className="bg-transparent border-0 py-2 focus:ring-0 text-slate-700 text-sm font-medium w-48"
                 value={cursoActivo || ''}
                 onChange={(e) => setCursoActivo(parseInt(e.target.value))}
               >
                 {misCursos.map(c => (
                   <option key={c.id_curso} value={c.id_curso}>{c.nombre}</option>
                 ))}
               </select>
             </div>
          </div>
        )}
      </div>

      {!loading && misCursos.length === 0 ? (
         <div className="bg-white p-10 mt-6 rounded-xl border border-slate-200 text-center shadow-sm">
            <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4"/>
            <h3 className="text-xl font-bold text-slate-700">No hay cursos disponibles</h3>
            <p className="text-slate-500 mt-2">Aún no tienes cursos asignados o inscritos para participar en el muro.</p>
         </div>
      ) : (
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <div className="lg:col-span-2 space-y-6">
               {/* Hilo de foros */}
               {loading ? (
                  <div className="text-center py-10 animate-pulse text-indigo-500 font-medium">Buscando publicaciones...</div>
               ) : foros.length === 0 ? (
                  <div className="bg-white p-8 rounded-xl border border-slate-200 text-center flex flex-col items-center">
                    <MessageSquare className="w-10 h-10 text-slate-200 mb-3"/>
                    <p className="text-slate-600">Este muro está muy tranquilo.</p>
                    <p className="text-sm text-slate-400 mt-1">Aún no hay anuncios del docente.</p>
                  </div>
               ) : (
                 foros.map(foro => (
                   <div key={foro.id_foro} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition">
                      <div className="px-6 py-5 border-b border-slate-100 flex items-start space-x-4">
                         <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md">
                            {(foro.autor?.nombre || '?').charAt(0)}
                         </div>
                         <div className="flex-1">
                            <h3 className="text-lg font-bold text-slate-800">{foro.titulo}</h3>
                            <div className="text-sm text-slate-500 flex items-center space-x-2 mt-1">
                               <span className="font-medium text-indigo-600">{foro.autor?.nombre} {foro.autor?.apellido}</span>
                               <span className="text-slate-300">•</span>
                               <span className="flex items-center text-xs"><Clock className="w-3 h-3 mr-1"/> {new Date(foro.fecha_publicacion).toLocaleDateString()}</span>
                            </div>
                         </div>
                      </div>
                      <div className="p-6 text-slate-700 leading-relaxed bg-slate-50/50">
                         {foro.mensaje}
                      </div>

                      {/* RESPUESTAS */}
                      <div className="bg-slate-50 px-6 py-4 border-t border-slate-100">
                         <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Comentarios de Clase ({foro.respuestas.length})</h4>
                         
                         <div className="space-y-4 mb-4">
                           {foro.respuestas.map(r => (
                             <div key={r.id_respuesta} className="flex space-x-3">
                               <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs ring-2 ring-white">
                                  {(r.autor?.nombre || '?').charAt(0)}
                               </div>
                               <div className="flex-1 bg-white p-3 rounded-lg border border-slate-200 shadow-sm relative group">
                                  <div className="flex justify-between items-start">
                                    <span className="text-sm font-bold text-slate-800 flex items-center">
                                       {r.autor?.nombre} {r.autor?.apellido}
                                       {r.autor?.id_rol === 2 && <span className="ml-2 text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded uppercase font-extrabold tracking-wider">Mtro</span>}
                                    </span>
                                    <span className="text-xs text-slate-400">{new Date(r.fecha_respuesta).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                  </div>
                                  <p className="text-sm text-slate-600 mt-1">{r.mensaje}</p>
                               </div>
                             </div>
                           ))}
                         </div>

                         {/* CAJA DE NUEVA RESPUESTA */}
                         {respuestaAbierta === foro.id_foro ? (
                           <form onSubmit={(e) => handleResponder(e, foro.id_foro)} className="mt-2 flex space-x-2">
                             <input 
                               autoFocus
                               type="text" 
                               value={textoRespuesta}
                               onChange={(e) => setTextoRespuesta(e.target.value)}
                               className="flex-1 border border-indigo-200 focus:border-indigo-500 rounded-full px-4 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none transition" 
                               placeholder="Escribe tu comentario de clase..."
                             />
                             <button type="submit" disabled={enviandoRespuesta} className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 focus:ring-2 focus:ring-offset-1 focus:ring-indigo-600 transition disabled:opacity-50">
                               <Send className="w-4 h-4 ml-0.5" />
                             </button>
                             <button type="button" onClick={() => {setRespuestaAbierta(null); setTextoRespuesta('');}} className="w-10 h-10 rounded-full text-slate-400 flex items-center justify-center hover:bg-slate-200 transition">
                               ✕
                             </button>
                           </form>
                         ) : (
                           <button onClick={() => setRespuestaAbierta(foro.id_foro)} className="text-sm text-indigo-600 font-medium tracking-wide hover:text-indigo-800 flex items-center py-2 transition group">
                              <MessageSquare className="w-4 h-4 mr-2 group-hover:-translate-y-0.5 transition-transform" /> Agregar un comentario...
                           </button>
                         )}
                      </div>
                   </div>
                 ))
               )}
            </div>

            {/* FORMULARIO PARA CREAR TEMAS AL LADO DERECHO (Solo si es Docente) */}
            <div className="hidden lg:block relative">
              <div className="sticky top-24">
                 {isDocente ? (
                   <form onSubmit={handleCrearForo} className="bg-indigo-600 rounded-2xl shadow-xl overflow-hidden animate-fade-in-up">
                     <div className="px-6 py-5 border-b border-indigo-500/50 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-white flex items-center">
                          <MessageSquare className="w-5 h-5 mr-2" /> Nuevo Anuncio
                        </h2>
                     </div>
                     <div className="p-6 space-y-4">
                        <div>
                          <input 
                            required
                            type="text" 
                            name="titulo_foro"
                            autoComplete='off'
                            value={nuevoForo.titulo}
                            onChange={e => setNuevoForo({...nuevoForo, titulo: e.target.value})}
                            className="w-full bg-indigo-700/50 border-0 focus:ring-2 focus:ring-white rounded-lg px-4 py-3 text-white placeholder-indigo-300 font-medium transition" 
                            placeholder="Título del anuncio..."
                          />
                        </div>
                        <div>
                          <textarea 
                            required
                            rows="5"
                            value={nuevoForo.mensaje}
                            onChange={e => setNuevoForo({...nuevoForo, mensaje: e.target.value})}
                            className="w-full bg-indigo-700/50 border-0 focus:ring-2 focus:ring-white resize-y rounded-lg px-4 py-3 text-white placeholder-indigo-300 text-sm transition leading-relaxed" 
                            placeholder="Escribe las instrucciones o aviso para tus alumnos..."
                          ></textarea>
                        </div>
                        <button type="submit" disabled={enviandoForo} className="w-full py-3 bg-white text-indigo-700 rounded-lg font-extrabold hover:bg-indigo-50 transition shadow-md disabled:bg-slate-300 disabled:text-slate-500">
                          {enviandoForo ? 'Publicando...' : 'Publicar Anuncio en Clase'}
                        </button>
                     </div>
                   </form>
                 ) : (
                   <div className="bg-slate-100 rounded-xl p-8 text-center border-2 border-dashed border-slate-200">
                      <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <h3 className="text-slate-600 font-bold mb-1">Rol de Estudiante</h3>
                      <p className="text-sm text-slate-400">Tú solo puedes responder a los anuncios creados por tu profesor desde este tablón.</p>
                   </div>
                 )}
              </div>
            </div>

            {/* Formulario móvil duplicado abajo para docentes */}
            {isDocente && (
              <div className="block lg:hidden w-full order-first mt-6">
                   <form onSubmit={handleCrearForo} className="bg-indigo-600 rounded-2xl shadow-lg p-5">
                     <h2 className="text-white font-bold mb-4">Nuevo Anuncio de Clase</h2>
                     <input required type="text" value={nuevoForo.titulo} onChange={e=>setNuevoForo({...nuevoForo, titulo: e.target.value})} className="w-full mb-3 bg-indigo-500 border-0 text-white placeholder-indigo-300 px-3 py-2 rounded focus:ring-2" placeholder="Título"/>
                     <textarea required rows="3" value={nuevoForo.mensaje} onChange={e=>setNuevoForo({...nuevoForo, mensaje: e.target.value})} className="w-full mb-3 bg-indigo-500 border-0 text-white placeholder-indigo-300 px-3 py-2 rounded focus:ring-2" placeholder="Cuerpo del mensaje..."></textarea>
                     <button type="submit" disabled={enviandoForo} className="w-full bg-white text-indigo-700 font-bold py-2 rounded">Publicar Anuncio</button>
                   </form>
              </div>
            )}

         </div>
      )}
    </div>
  );
}
