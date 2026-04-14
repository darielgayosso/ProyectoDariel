import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Book, Layout, Users, Star } from 'lucide-react';

export default function Dashboard() {
  const { profile } = useAuth();
  const [quote, setQuote] = useState(null);

  const [metrics, setMetrics] = useState({
    cursos: 0,
    tareas: 0,
    entregasRevisar: 0,
    alumnos: 0,
    totalUsuarios: 0,
    totalCursosPlatform: 0
  });

  // Requisito Avanzado: Consumo de Frases Motivacionales (Local en Español para mayor velocidad)
  useEffect(() => {
    const frases = [
      { content: "La educación es el arma más poderosa que puedes usar para cambiar el mundo.", author: "Nelson Mandela" },
      { content: "La mente que se abre a una nueva idea, jamás vuelve a su tamaño original.", author: "Albert Einstein" },
      { content: "Dime y lo olvido, enséñame y lo recuerdo, involúcrame y lo aprendo.", author: "Benjamin Franklin" },
      { content: "El aprendizaje nunca agota la mente.", author: "Leonardo da Vinci" },
      { content: "Lo que con mucho trabajo se adquiere, más se ama.", author: "Aristóteles" },
      { content: "Vivir es aprender, y aprender es crecer.", author: "Anónimo" },
      { content: "El éxito es la suma de pequeños esfuerzos repetidos día tras día.", author: "Robert Collier" },
      { content: "Las raíces de la educación son amargas, pero la fruta es dulce.", author: "Aristóteles" },
      { content: "La inteligencia no solo consiste en el conocimiento, sino en la destreza de aplicarlo.", author: "Aristóteles" },
      { content: "Siembra un pensamiento y cosecharás una acción.", author: "Samuel Smiles" }
    ];
    
    // Seleccionar una frase aleatoria
    const randomIndex = Math.floor(Math.random() * frases.length);
    setQuote(frases[randomIndex]);
  }, []);

  useEffect(() => {
    if (profile) {
      cargarMetricas();
    }
  }, [profile]);

  const cargarMetricas = async () => {
    try {
      if (profile?.id_rol === 3) {
        // --- ESTUDIANTE ---
        // 1. Número de cursos
        const { count: cursosCount } = await supabase
          .from('inscripciones')
          .select('*', { count: 'exact', head: true })
          .eq('id_usuario', profile.id_usuario);

        // 2. Tareas entregadas y promedio
        const { data: entregas } = await supabase
          .from('entregas')
          .select('calificacion, id_tarea')
          .eq('id_usuario', profile.id_usuario);
        
        let localPromedio = 'N/A';
        if (entregas && entregas.length > 0) {
          const vals = entregas.map(e => e.calificacion).filter(c => c !== null);
          if (vals.length > 0) {
            const sum = vals.reduce((a, b) => a + b, 0);
            localPromedio = (sum / vals.length).toFixed(1);
          }
        }

        // 3. Tareas pendientes (Total tareas del curso - entregas de esas tareas)
        const { data: inscripciones } = await supabase.from('inscripciones').select('id_curso').eq('id_usuario', profile.id_usuario);
        let tareasPendientes = 0;
        if(inscripciones && inscripciones.length > 0) {
           const cursoIds = inscripciones.map(i => i.id_curso);
           const { data: unidades } = await supabase.from('unidades').select('id_unidad').in('id_curso', cursoIds);
           if(unidades && unidades.length > 0) {
              const unidadIds = unidades.map(u => u.id_unidad);
              const { data: totalTareas } = await supabase.from('tareas').select('id_tarea').in('id_unidad', unidadIds);
              if (totalTareas) {
                 const enviadas = entregas ? entregas.length : 0;
                 tareasPendientes = totalTareas.length - enviadas;
                 if(tareasPendientes < 0) tareasPendientes = 0;
              }
           }
        }

        setMetrics(m => ({ ...m, cursos: cursosCount || 0, tareas: tareasPendientes, promedio: localPromedio }));

      } else if (profile?.id_rol === 2) {
        // --- DOCENTE ---
        // 1. Cursos
        const { count: cursosCount } = await supabase
          .from('cursos')
          .select('*', { count: 'exact', head: true })
          .eq('id_docente', profile.id_usuario);

        // 2. Entregas por revisar
        const { data: misCursos } = await supabase.from('cursos').select('id_curso').eq('id_docente', profile.id_usuario);
        let revisarCount = 0;
        let totalAlumnos = 0;
        if (misCursos && misCursos.length > 0) {
          const cursoIds = misCursos.map(c => c.id_curso);
          
          // Alumnos unicos: Seleccionamos los ID de usuario y usamos un Set para contar únicos
          const { data: inscripciones } = await supabase
            .from('inscripciones')
            .select('id_usuario')
            .in('id_curso', cursoIds);
          
          if (inscripciones) {
            const uniqueAlumnos = new Set(inscripciones.map(i => i.id_usuario));
            totalAlumnos = uniqueAlumnos.size;
          }

          const { data: unidades } = await supabase.from('unidades').select('id_unidad').in('id_curso', cursoIds);
          if (unidades && unidades.length > 0) {
             const unidadIds = unidades.map(u => u.id_unidad);
             const { data: tareas } = await supabase.from('tareas').select('id_tarea').in('id_unidad', unidadIds);
             if (tareas && tareas.length > 0) {
                const tareaIds = tareas.map(t => t.id_tarea);
                const { count: reqCount } = await supabase.from('entregas').select('*', {count: 'exact', head: true}).in('id_tarea', tareaIds).is('calificacion', null);
                revisarCount = reqCount || 0;
             }
          }
        }

        setMetrics(m => ({ ...m, cursos: cursosCount || 0, entregasRevisar: revisarCount, alumnos: totalAlumnos }));
      } else if (profile?.id_rol === 1) {
        // --- ADMINISTRADOR ---
        const { count: userCount } = await supabase.from('usuarios').select('*', { count: 'exact', head: true });
        const { count: allCursosCount } = await supabase.from('cursos').select('*', { count: 'exact', head: true });
        setMetrics(m => ({ ...m, totalUsuarios: userCount || 0, totalCursosPlatform: allCursosCount || 0 }));
      }
    } catch(err) {
      console.error("Error al cargar métricas", err);
    }
  };

  const getRoleWidgets = () => {
    if (profile?.id_rol === 3) { // Estudiante
      return (
        <div className="grid gap-6 mb-8 md:grid-cols-2 lg:grid-cols-3">
          <WidgetCard title="Mis Cursos" icon={Book} bgColor="bg-blue-100" textColor="text-blue-600" value={metrics.cursos} />
          <WidgetCard title="Tareas Pendientes" icon={Layout} bgColor="bg-orange-100" textColor="text-orange-600" value={metrics.tareas} />
          <WidgetCard title="Promedio Escolar" icon={Star} bgColor="bg-green-100" textColor="text-green-600" value={metrics.promedio} />
        </div>
      );
    } else if (profile?.id_rol === 2) { // Docente
      return (
        <div className="grid gap-6 mb-8 md:grid-cols-2 lg:grid-cols-3">
          <WidgetCard title="Cursos Activos" icon={Book} bgColor="bg-blue-100" textColor="text-blue-600" value={metrics.cursos} />
          <WidgetCard title="Entregas por Revisar" icon={Layout} bgColor="bg-orange-100" textColor="text-orange-600" value={metrics.entregasRevisar} />
          <WidgetCard title="Alumnos Totales" icon={Users} bgColor="bg-purple-100" textColor="text-purple-600" value={metrics.alumnos} />
        </div>
      );
    } else { // Administrador
      return (
        <div className="grid gap-6 mb-8 md:grid-cols-2 lg:grid-cols-3">
          <WidgetCard title="Total Usuarios" icon={Users} bgColor="bg-blue-100" textColor="text-blue-600" value={metrics.totalUsuarios} />
          <WidgetCard title="Cursos en Plataforma" icon={Book} bgColor="bg-green-100" textColor="text-green-600" value={metrics.totalCursosPlatform} />
        </div>
      );
    }
  }

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">
          Hola, {profile?.nombre} 👋
        </h1>
        <p className="mt-1 text-slate-500">
          Panel principal de tu perfil como <span className="font-semibold capitalize">{profile?.roles?.nombre_rol}</span>
        </p>
      </div>

      {quote && (
        <div className="mb-8 p-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-md text-white">
          <h3 className="text-sm font-semibold uppercase tracking-wider mb-2 opacity-80">Frase Educativa del Día</h3>
          <p className="text-lg italic font-medium">"{quote.content}"</p>
          <p className="text-sm mt-2 text-indigo-100">— {quote.author}</p>
        </div>
      )}

      {getRoleWidgets()}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-semibold mb-4 text-slate-800">Actividad Reciente</h2>
        <div className="flex flex-col items-center justify-center py-10 text-slate-500">
             <Layout className="w-12 h-12 text-slate-300 mb-3" />
             <p>Aún no hay actividad para mostrar en tu portal.</p>
        </div>
      </div>
    </div>
  );
}

function WidgetCard({ title, icon: Icon, bgColor, textColor, value }) {
  return (
    <div className="flex items-center p-4 bg-white rounded-xl shadow-sm border border-slate-100">
      <div className={`p-3 mr-4 rounded-full ${bgColor} ${textColor}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-700">{value}</p>
      </div>
    </div>
  );
}
