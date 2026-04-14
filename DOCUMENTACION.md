# Documentación del Proyecto: Sistema de Gestión de Aprendizaje (LMS)

## 1. Introducción
El **Proyecto LMS** es una plataforma educativa integral diseñada para facilitar la interacción entre administradores, docentes y estudiantes. El sistema permite la gestión completa de cursos, desde la creación de contenidos y actividades evaluativas hasta el seguimiento del progreso y la comunicación en tiempo real.

## 2. Arquitectura Técnica
La aplicación está construida sobre un stack moderno y escalable:

*   **Frontend**: React (v19) - Biblioteca de JavaScript para construir interfaces de usuario.
*   **Enrutamiento**: React Router DOM (v7) - Gestión de navegación y rutas protegidas.
*   **Backend & Base de Datos**: Supabase - Plataforma Backend-as-a-Service basada en PostgreSQL.
*   **Estilos y Diseño**: Tailwind CSS - Framework de utilidades CSS para un diseño premium y responsive.
*   **Iconografía**: Lucide React - Conjunto de iconos vectoriales limpios y consistentes.
*   **Autenticación**: Supabase Auth (incluyendo integración con Google OAuth).

## 3. Estructura de Roles y Funcionalidades

### 3.1. Administrador
El administrador tiene el control global del sistema para garantizar el orden y la correcta configuración.
*   **Gestión de Usuarios**: Visualización de la lista completa de usuarios, edición de perfiles y asignación/modificación de roles.
*   **Gestión de Cursos**: Capacidad para supervisar todos los cursos creados en la plataforma.
*   **Panel de Control Global**: Visualización de métricas generales del sistema.

### 3.2. Docente
El docente es el creador de contenido y el facilitador del aprendizaje.
*   **Creación y Gestión de Cursos**: Crear la estructura del curso mediante **Unidades**.
*   **Gestión de Contenido**: Subir materiales de estudio (videos, lecturas, enlaces externos).
*   **Evaluaciones**:
    *   **Tareas**: Creación de actividades con fecha límite y descripción.
    *   **Cuestionarios**: Editor avanzado de preguntas de opción múltiple con asignación de puntajes.
*   **Revisión y Calificación**: Sistema de retroalimentación para las tareas entregadas por los alumnos.
*   **Comunicación**: Publicación de anuncios y moderación del muro de clase.

### 3.3. Estudiante
El estudiante es el centro del proceso educativo.
*   **Inscripción y Catálogo**: Exploración de cursos disponibles e inscripción.
*   **Consumo de Contenido**: Acceso organizado a materiales por unidades.
*   **Realización de Actividades**:
    *   **Entregas**: Envío de tareas dentro de los plazos establecidos.
    *   **Exámenes**: Resolución de cuestionarios con calificación automática.
*   **Seguimiento**:
    *   **Tareas Pendientes**: Vista centralizada de todas las actividades por entregar.
    *   **Calificaciones**: Acceso a las notas y retroalimentación recibida.
*   **Participación**: Interacción en el muro del curso y foros de discusión.

## 4. Características Avanzadas Implementedas
*   **Modo Oscuro (Dark Mode)**: Interfaz adaptable que mejora la accesibilidad y reduce la fatiga visual.
*   **Búsqueda y Filtrado Dinámico**: Localización rápida de cursos por nombre o categoría en tiempo real.
*   **Sistema de Notificaciones/Tareas**: Alertas sobre actividades próximas a vencer.
*   **Diseño Premium**: Uso de transiciones suaves, micro-animaciones y layouts optimizados para móviles y escritorio.

## 5. Diseño de la Base de Datos (Supabase)
El sistema utiliza una base de datos relacional con las siguientes tablas principales:

*   `usuarios`: Almacena perfiles (nombre, email, rol).
*   `roles`: Define los permisos (Admin, Docente, Estudiante).
*   `cursos`: Información principal de las materias.
*   `unidades`: Secciones lógicas dentro de cada curso.
*   `materiales`: Enlaces a recursos de estudio.
*   `tareas`: Definición de actividades calificables.
*   `entregas_tarea`: Registro de los envíos de los estudiantes.
*   `cuestionarios`: Estructura superior de los exámenes.
*   `preguntas` y `opciones`: Detalle técnico de las evaluaciones.
*   `foros` y `respuestas`: Sistema de comunicación en el muro.

## 6. Guía de Instalación Local

1.  **Clonar el repositorio**.
2.  **Instalar dependencias**:
    ```bash
    npm install
    ```
3.  **Configurar variables de entorno**: 
    Crear un archivo `.env` en la raíz con las siguientes claves de Supabase:
    ```env
    REACT_APP_SUPABASE_URL=tu_url_de_supabase
    REACT_APP_SUPABASE_ANON_KEY=tu_clave_anon_de_supabase
    ```
4.  **Iniciar la aplicación**:
    ```bash
    npm start
    ```
5.  **Abrir en el navegador**: [http://localhost:3000](http://localhost:3000)

---
*Documentación generada para la entrega de Proyecto LMS - Abril 2026*
