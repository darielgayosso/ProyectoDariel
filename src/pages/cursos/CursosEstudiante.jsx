import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Search, BookOpen, Clock, PlayCircle } from 'lucide-react';

export default function CursosEstudiante() {
  const { profile } = useAuth();
  const [cursos, setCursos] = useState([]);
  const [inscripciones, setInscripciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [mensaje, setMensaje] = useState(null);

  useEffect(() => {
    if (profile) fetchData();
  }, [profile]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Obtener todos los cursos activos, junto con el nombre de la categoria y el docente
      const { data: cursosData, error: errCursos } = await supabase
        .from('cursos')
        .select(`
          id_curso, nombre, descripcion, imagen_url, estado, fecha_creacion,
          categoria:categorias(nombre_categoria),
          docente:usuarios(nombre, apellido)
        `)
        .eq('estado', 'activo');

      if (errCursos) throw errCursos;

      // Obtener inscripciones activas del estudiante actual
      const { data: inscripcionesData, error: errInscripciones } = await supabase
        .from('inscripciones')
        .select('id_curso')
        .eq('id_usuario', profile.id_usuario);

      if (errInscripciones) throw errInscripciones;

      // Obtener todas las categorías para el filtro
      const { data: catData, error: errCat } = await supabase
        .from('categorias')
        .select('*');
      if (!errCat) setCategorias(catData || []);

      setCursos(cursosData || []);
      setInscripciones((inscripcionesData || []).map(i => i.id_curso));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const matricularse = async (id_curso) => {
    try {
      setMensaje(null);
      const { error } = await supabase.from('inscripciones').insert({
        id_usuario: profile.id_usuario,
        id_curso: id_curso,
        estado: 'activo'
      });

      if (error) throw error;
      
      setMensaje({ tipo: 'success', texto: '¡Te has inscrito exitosamente en el curso!' });
      // Refrescar inscripciones
      fetchData();
    } catch (error) {
      setMensaje({ tipo: 'error', texto: 'Hubo un error al intentar inscribirte.' });
    }
  };

  const cursosFiltrados = cursos.filter(curso => {
    const nombreCat = Array.isArray(curso.categoria) ? curso.categoria[0]?.nombre_categoria : curso.categoria?.nombre_categoria;
    
    // Filtro por texto
    const textMatch = curso.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                      (nombreCat || '').toLowerCase().includes(searchTerm.toLowerCase());
                      
    // Filtro por categoría seleccionada
    const catMatch = selectedCategoria === '' || nombreCat === selectedCategoria;
    
    return textMatch && catMatch;
  });

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Catálogo de Cursos</h1>
        <p className="mt-1 text-slate-500">Explora e inscríbete en nuestros cursos disponibles.</p>
      </div>

      {mensaje && (
        <div className={`p-4 mb-6 rounded-md ${mensaje.tipo === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {mensaje.texto}
        </div>
      )}

      {/* Requisito Avanzado: Buscador de Cursos y Filtro de Categorías */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="w-5 h-5 text-slate-400" />
          </div>
          <input 
            type="text" 
            className="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 p-2.5 shadow-sm" 
            placeholder="Buscar por nombre..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex-1 max-w-xs">
          <select
            value={selectedCategoria}
            onChange={(e) => setSelectedCategoria(e.target.value)}
            className="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5 shadow-sm"
          >
            <option value="">Todas las categorías</option>
            {categorias.map(cat => (
              <option key={cat.id_categoria} value={cat.nombre_categoria}>
                {cat.nombre_categoria}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3].map(i => (
             <div key={i} className="animate-pulse bg-slate-200 h-64 rounded-xl"></div>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cursosFiltrados.length === 0 ? (
            <div className="col-span-full text-center py-10 text-slate-500">
              No se encontraron cursos activos con esos criterios.
            </div>
          ) : (
             cursosFiltrados.map(curso => {
               const estaInscrito = inscripciones.includes(curso.id_curso);
               const nombreCat = Array.isArray(curso.categoria) ? curso.categoria[0]?.nombre_categoria : curso.categoria?.nombre_categoria;

               return (
                 <div key={curso.id_curso} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
                   <div 
                      className="h-32 bg-indigo-500 relative flex items-end p-4 border-b border-indigo-600/20"
                      style={curso.imagen_url ? {
                        backgroundImage: `url('${curso.imagen_url}')`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      } : {
                        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)'
                      }}
                   >
                      {/* Shadow overlay para mejor lectura */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
                      <div className="relative z-10 w-full flex items-center justify-between">
                         <span className="bg-white text-indigo-800 text-xs font-bold px-2.5 py-0.5 rounded shadow-sm">
                           {nombreCat || 'General'}
                         </span>
                      </div>
                   </div>

                   <div className="p-5 flex-1 bg-white">
                     <h3 className="text-lg font-bold text-slate-900 mb-1">{curso.nombre}</h3>
                     <p className="text-sm text-slate-500 line-clamp-2 mb-4">{curso.descripcion || 'Sin descripción detallada.'}</p>
                     
                     <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                        <span className="flex items-center"><Clock className="w-4 h-4 mr-1"/> Indefinido</span>
                        <span className="font-medium text-slate-700">Docente: {curso.docente?.nombre || 'TBD'}</span>
                     </div>
                     
                     {estaInscrito ? (
                       <Link to={`/dashboard/cursos/${curso.id_curso}`} className="w-full flex items-center justify-center text-white bg-green-600 hover:bg-green-700 font-medium rounded-lg text-sm px-5 py-2.5 transition-colors">
                         <PlayCircle className="w-4 h-4 mr-2" /> Entrar al Curso
                       </Link>
                     ) : (
                       <button 
                         onClick={() => matricularse(curso.id_curso)}
                         className="w-full text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 font-medium rounded-lg text-sm px-5 py-2.5 transition-colors"
                       >
                         Inscribirse ahora
                       </button>
                     )}
                   </div>
                 </div>
               )
             })
          )}
        </div>
      )}
    </div>
  );
}
