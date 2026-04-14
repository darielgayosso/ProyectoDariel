import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Edit2, Archive, Activity, Image as ImageIcon, UploadCloud } from 'lucide-react';

export default function CursosDocente() {
  const { profile } = useAuth();
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Estado del formulario nuevo curso
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    imagen_url: '',
    id_categoria: ''
  });

  useEffect(() => {
    if (profile) {
      fetchCursos();
      fetchCategorias();
    }
  }, [profile]);

  const fetchCursos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cursos')
        .select(`
          id_curso, nombre, descripcion, imagen_url, estado, fecha_creacion, id_categoria,
          categoria:categorias(nombre_categoria)
        `)
        .eq('id_docente', profile.id_usuario)
        .order('fecha_creacion', { ascending: false });

      if (error) throw error;
      setCursos(data || []);
    } catch (error) {
      console.error('Error fetching mis cursos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategorias = async () => {
    try {
      const { data, error } = await supabase.from('categorias').select('*');
      if (error) {
        console.error("Error fetching categorias:", error);
      }
      if (data) {
        setCategorias(data);
      }
    } catch(e) {
      console.error("Excepción en fetchCategorias:", e);
    }
  };

  const handleSubirPortada = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Límite de 2MB para evitar saturar la base de datos (pues lo guardaremos en Base64)
    if (file.size > 2 * 1024 * 1024) {
       alert("Amigo, por el momento la imagen debe pesar menos de 2MB para esta demostración. Intenta con una más pequeña.");
       return;
    }

    setUploadingImage(true);
    
    try {
      // Magia de Frontend: Convertimos la imagen a un string Base64 para guardarlo directo en la BD
      // saltándonos la necesidad de crear permisos de buckers en el servidor.
      const reader = new FileReader();
      reader.onloadend = () => {
         const base64String = reader.result;
         setFormData(prev => ({ ...prev, imagen_url: base64String }));
         setUploadingImage(false);
      };
      reader.onerror = () => {
         alert("Hubo un error leyendo el archivo.");
         setUploadingImage(false);
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error global al procesar portada:", error);
      alert("Error procesando imagen");
      setUploadingImage(false);
    }
  };

  const handleCrearCurso = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        imagen_url: formData.imagen_url,
        id_docente: profile.id_usuario,
        estado: 'activo'
      };
      
      if (formData.id_categoria) {
        payload.id_categoria = parseInt(formData.id_categoria);
      }

      if (editandoId) {
        const { error } = await supabase.from('cursos').update(payload).eq('id_curso', editandoId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('cursos').insert(payload);
        if (error) throw error;
      }
      
      cerrarModal();
      fetchCursos();
    } catch (err) {
      console.error("Error exacto Supabase:", err);
      alert("Error al guardar curso: " + (err.message || JSON.stringify(err)));
    }
  };

  const abrirModalCrear = () => {
    setEditandoId(null);
    setFormData({nombre:'', descripcion:'', imagen_url:'', id_categoria:''});
    setMostrarModal(true);
  };

  const abrirModalEditar = (curso) => {
    setEditandoId(curso.id_curso);
    setFormData({
      nombre: curso.nombre || '',
      descripcion: curso.descripcion || '',
      imagen_url: curso.imagen_url || '',
      id_categoria: curso.id_categoria || ''
    });
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setEditandoId(null);
    setFormData({nombre:'', descripcion:'', imagen_url:'', id_categoria:''});
  };

  const handleArchivar = async (id_curso, estado_actual) => {
    const nuevoEstado = estado_actual === 'activo' ? 'inactivo' : 'activo';
    if(window.confirm(`¿Seguro que deseas cambiar el estado a ${nuevoEstado.toUpperCase()}?`)) {
      try {
        const { error } = await supabase.from('cursos').update({ estado: nuevoEstado }).eq('id_curso', id_curso);
        if (error) throw error;
        fetchCursos();
      } catch (err) {
        alert("Error al archivar");
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Mis Cursos Impartidos</h1>
          <p className="mt-1 text-slate-500">Gestiona los cursos que ofreces a los estudiantes.</p>
        </div>
        <button 
          onClick={abrirModalCrear}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm transition-colors"
        >
          <Plus className="-ml-1 mr-2 h-5 w-5" />
          Crear Nuevo Curso
        </button>
      </div>

      {loading ? (
        <div className="text-slate-500 animate-pulse">Cargando tus cursos...</div>
      ) : cursos.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">
           <Activity className="w-16 h-16 mx-auto mb-4 text-slate-300"/>
           <h3 className="text-xl font-medium text-slate-800 mb-2">Aún no tienes cursos</h3>
           <p>Anímate a compartir tus conocimientos creando tu primer curso virtual.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cursos.map(curso => {
             const nombreCat = Array.isArray(curso.categoria) 
                ? (curso.categoria[0]?.nombre_categoria || 'General') 
                : (curso.categoria?.nombre_categoria || 'General');

             return (
               <div key={curso.id_curso} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col transition hover:shadow-md">
                 
                 {/* Portada Superior */}
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
                         {nombreCat}
                       </span>
                       <span className={`text-xs font-bold px-2 py-1 rounded-full shadow-sm text-white ${curso.estado === 'activo' ? 'bg-green-500/90' : 'bg-red-500/90'}`}>
                         {curso.estado.toUpperCase()}
                       </span>
                    </div>
                 </div>

                 <div className="p-5 flex-1 bg-white">
                   <h3 className="text-lg font-bold text-slate-800 mb-1">{curso.nombre}</h3>
                   <p className="text-sm text-slate-500 line-clamp-2">{curso.descripcion}</p>
                 </div>
                 <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex justify-between items-center">
                   <Link to={`/dashboard/cursos-docente/${curso.id_curso}`} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center">
                     <Activity className="w-4 h-4 mr-1"/> Gestionar Contenido
                   </Link>
                   <div className="flex space-x-3">
                     <button onClick={() => abrirModalEditar(curso)} className="text-sm font-medium text-slate-500 hover:text-indigo-600 flex items-center" title="Editar detalles">
                       <Edit2 className="w-4 h-4"/>
                     </button>
                     <button onClick={() => handleArchivar(curso.id_curso, curso.estado)} className={`text-sm font-medium flex items-center ${curso.estado === 'activo' ? 'text-slate-500 hover:text-orange-600' : 'text-orange-500 hover:text-green-600'}`} title={curso.estado === 'activo' ? "Archivar curso" : "Activar curso"}>
                       <Archive className="w-4 h-4"/>
                     </button>
                   </div>
                 </div>
               </div>
             );
          })}
        </div>
      )}

      {/* Modal Crear Curso */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-slate-500 bg-opacity-75" onClick={cerrarModal}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleCrearCurso}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-slate-900 mb-4">{editandoId ? 'Editar Curso' : 'Detalles del Nuevo Curso'}</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Nombre del Curso</label>
                      <input required type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Categoría (Opcional)</label>
                      <select value={formData.id_categoria} onChange={e => setFormData({...formData, id_categoria: e.target.value})} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                        <option value="">Sin categoría</option>
                        {categorias.map(cat => (
                          <option key={cat.id_categoria} value={cat.id_categoria}>{cat.nombre_categoria}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Descripción Corta</label>
                      <textarea rows="3" value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Portada del Curso</label>
                      
                      {formData.imagen_url ? (
                        <div className="mt-2 relative rounded-lg overflow-hidden h-32 border border-slate-200 flex items-center justify-center bg-slate-50">
                           <img src={formData.imagen_url} alt="Portada" className="absolute inset-0 w-full h-full object-cover opacity-80" />
                           <div className="relative z-10 flex space-x-2">
                             <a href={formData.imagen_url} target="_blank" rel="noreferrer" className="bg-white/90 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold shadow-md hover:bg-indigo-50">Ver Tamaño Completo</a>
                             <button type="button" onClick={() => setFormData({...formData, imagen_url: ''})} className="bg-white/90 text-red-500 px-3 py-1 rounded-full text-xs font-bold shadow-md hover:bg-red-50">Eliminar</button>
                           </div>
                        </div>
                      ) : (
                        <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md hover:bg-slate-50 transition-colors">
                          <div className="space-y-1 text-center">
                            {uploadingImage ? (
                               <div className="animate-pulse text-indigo-500 flex flex-col items-center">
                                  <UploadCloud className="mx-auto h-12 w-12 mb-2" />
                                  <p>Subiendo portada de alta calidad...</p>
                               </div>
                            ) : (
                               <>
                                 <ImageIcon className="mx-auto h-12 w-12 text-slate-400" />
                                 <div className="flex text-sm text-slate-600 justify-center">
                                   <label htmlFor="file-upload-portada" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                                     <span>Sube un archivo de imagen</span>
                                     <input id="file-upload-portada" name="file-upload-portada" type="file" accept="image/*" className="sr-only" onChange={handleSubirPortada} />
                                   </label>
                                 </div>
                                 <p className="text-xs text-slate-500">PNG, JPG, GIF hasta 5MB</p>
                               </>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-4">
                        <label className="block text-xs text-slate-500 ml-1">O si prefieres, pega la URL directa de internet:</label>
                        <input type="url" value={formData.imagen_url} onChange={e => setFormData({...formData, imagen_url: e.target.value})} placeholder="https://ejemplo.com/imagen.jpg" className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-slate-200">
                  <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm">
                    {editandoId ? 'Actualizar Curso' : 'Guardar Curso'}
                  </button>
                  <button type="button" onClick={cerrarModal} className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
