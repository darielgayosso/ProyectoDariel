import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null); // Dato de public.usuarios
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = process.env.REACT_APP_SUPABASE_URL;
    const key = process.env.REACT_APP_SUPABASE_ANON_KEY ? "Cargada (empieza con " + process.env.REACT_APP_SUPABASE_ANON_KEY.substring(0, 5) + "...)" : "FALTA";
    console.log("AuthContext Variables - URL:", url, "| KEY:", key);
    
    if (!url || url.includes("undefined")) {
      console.error("¡ERROR CRÍTICO! La URL de Supabase es inválida o no existe. Deteniendo ejecución.");
      setLoading(false);
      return;
    }

    // El timeout de 4 segundos protege TODA la carga, incluyendo la base de datos!
    const fallbackTimeout = setTimeout(() => {
        console.warn("AuthContext: Timeout alcanzado (4s). Forzando limpieza.");
        localStorage.clear();
        setProfile(null);
        setUser(null);
        setLoading(false);
    }, 4000);

    // Guardar referencia en window para poder cancelarlo desde fetchProfile
    window.__authTimeout = fallbackTimeout;

    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.email);
        } else {
          clearTimeout(window.__authTimeout);
          setLoading(false);
        }
      } catch (err) {
        console.error("AuthContext: Error al revisar sesión:", err);
        clearTimeout(window.__authTimeout);
        setLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        console.log("AuthContext: Evento Auth:", _event);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.email);
        } else {
          setProfile(null);
          clearTimeout(window.__authTimeout);
          setLoading(false);
        }
      } catch (err) {
        console.error("AuthContext: Error en onAuthStateChange:", err);
        clearTimeout(window.__authTimeout);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(window.__authTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (emailDeSesion) => {
    try {
      if (!emailDeSesion) {
        throw new Error("No hay un email válido en la sesión");
      }

      // 1. Interceptar rol pendiente de Google si existe
      const intendedRole = localStorage.getItem('oauth_intended_role');
      if (intendedRole) {
        console.log("Aplicando rol pendiente desde selección de registro:", intendedRole);
        await supabase
           .from('usuarios')
           .update({ id_rol: parseInt(intendedRole) })
           .eq('email', emailDeSesion);
        
        localStorage.removeItem('oauth_intended_role');
      }

      // 2. Traer el perfil (ahora actualizado)
      const { data, error } = await supabase
        .from('usuarios')
        .select(`
          *,
          roles:id_rol (
            nombre_rol
          )
        `)
        .eq('email', emailDeSesion)
        .single();
      
      let userData = data;

      if (error && error.code === 'PGRST116') {
         console.warn("Usuario no encontrado en public.usuarios. Intentando auto-generar perfil...");
         const newRole = intendedRole ? parseInt(intendedRole) : 3;
         const fallbackName = emailDeSesion.split('@')[0];
         
         const { error: insErr } = await supabase.from('usuarios').insert({
            email: emailDeSesion,
            nombre: fallbackName,
            apellido: '',
            id_rol: newRole,
            password_hash: 'oauth_google'
         });

         if (!insErr) {
            const { data: retryData, error: retryErr } = await supabase
              .from('usuarios')
              .select('*, roles:id_rol(nombre_rol)')
              .eq('email', emailDeSesion)
              .single();
            if (!retryErr) userData = retryData;
            else throw retryErr;
         } else {
            throw insErr;
         }
      } else if (error) {
         throw error;
      }

      setProfile(userData);
    } catch (error) {
      console.error('AuthContext: Error logueando perfil:', error);
    } finally {
      clearTimeout(window.__authTimeout);
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const loginWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/dashboard'
      }
    });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) console.error("Error remoto en logout:", error);
    } catch (e) {
      console.error("Error en logout:", e);
    } finally {
      setUser(null);
      setProfile(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, login, loginWithGoogle, logout, loading }}>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: '20px', textAlign: 'center', backgroundColor: '#f8fafc' }}>
          <div className="spinner-premium mb-6 shadow-indigo-200 shadow-lg"></div>
          <h2 className="animate-pulse-soft" style={{ fontSize: '1.25rem', fontWeight: '700', color: '#4f46e5', maxWidth: '400px', margin: '0 0 24px 0' }}>
            Cargando...
          </h2>
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 max-w-sm fade-in">
             <p className="text-sm text-slate-500 mb-4">
               Si la pantalla no desaparece, es posible que la conexión remota esté demorando.
             </p>
             <button 
               onClick={() => { localStorage.clear(); window.location.reload(); }}
               className="w-full py-3 px-6 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-indigo-600 font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-200"
             >
               Reintentar
             </button>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
