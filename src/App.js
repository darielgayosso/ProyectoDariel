import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ForgotPassword from './components/auth/ForgotPassword';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
import CursosEstudiante from './pages/cursos/CursosEstudiante';
import CursosDocente from './pages/cursos/CursosDocente';
import CursoDetalleEstudiante from './pages/cursos/CursoDetalleEstudiante';
import CursoDetalleDocente from './pages/cursos/CursoDetalleDocente';
import RevisionesDocente from './pages/cursos/RevisionesDocente';
import ForoVista from './pages/cursos/ForoVista';
import CalificacionesEstudiante from './pages/cursos/CalificacionesEstudiante';
import TareasPendientesEstudiante from './pages/cursos/TareasPendientesEstudiante';
import AdminUsuarios from './pages/admin/AdminUsuarios';
import CuestionarioEditorDocente from './pages/cursos/CuestionarioEditorDocente';
import ResolverCuestionario from './pages/cursos/ResolverCuestionario';
import AdminCursos from './pages/admin/AdminCursos';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red' }}>
          <h1>Algo salió mal en el código de React.</h1>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children; 
  }
}

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando aplicación...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              
              {/* Rutas de Gestión de Cursos */}
              <Route path="cursos" element={<CursosEstudiante />} />
              <Route path="cursos/:id" element={<CursoDetalleEstudiante />} />
              <Route path="cursos-docente" element={<CursosDocente />} />
              <Route path="cursos-docente/:id" element={<CursoDetalleDocente />} />
              <Route path="cursos-docente/:id/cuestionario/:id_cuestionario" element={<CuestionarioEditorDocente />} />
              <Route path="cursos/:id/cuestionario/:id_cuestionario/resolver" element={<ResolverCuestionario />} />
              <Route path="revisiones" element={<RevisionesDocente />} />
              <Route path="foros" element={<ForoVista />} />
              <Route path="calificaciones" element={<CalificacionesEstudiante />} />
              <Route path="tareas" element={<TareasPendientesEstudiante />} />
              
              {/* Rutas de Administrador */}
              <Route path="usuarios" element={<AdminUsuarios />} />
              <Route path="admin-cursos" element={<AdminCursos />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
