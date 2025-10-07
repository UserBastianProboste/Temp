# Sistema de Gestión de Prácticas Profesionales

Sistema web para gestionar prácticas profesionales de estudiantes universitarios.

## 🚀 Características

- ✅ Registro y autenticación de estudiantes y coordinadores
- ✅ Gestión de empresas para prácticas
- ✅ Solicitud y seguimiento de prácticas profesionales
- ✅ Dashboard diferenciado por rol de usuario
- ✅ Estados de práctica (pendiente, aprobada, en progreso, completada)

## 🛠️ Tecnologías

- **Frontend:** React + TypeScript + Material-UI + Vite
- **Backend:** Supabase (Auth + Database + RLS)
- **Estilo:** Material-UI v6

## 📋 Requisitos Previos

- Node.js 18+
- Cuenta en [Supabase](https://supabase.com)
- Git

## ⚙️ Configuración de Supabase

### 1. Crear proyecto en Supabase
1. Ve a [supabase.com](https://supabase.com)
2. Crea una cuenta y un nuevo proyecto
3. Anota la URL y la clave pública (anon key)

### 2. Configurar variables de entorno
Crea un archivo `.env` en la carpeta `frontend`:

```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_publica_de_supabase
```

### 3. Crear tablas en Supabase

Ve a **SQL Editor** en tu dashboard de Supabase y ejecuta:

```sql
-- 1. Crear tabla estudiantes
CREATE TABLE IF NOT EXISTS estudiantes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT,
  carrera TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear tabla coordinadores  
CREATE TABLE IF NOT EXISTS coordinadores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT,
  departamento TEXT,
  domicilio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Crear tabla empresas
CREATE TABLE IF NOT EXISTS empresas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  razon_social TEXT NOT NULL,
  direccion TEXT NOT NULL,
  jefe_directo TEXT NOT NULL,
  cargo_jefe TEXT NOT NULL,
  telefono TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Crear tabla practicas
CREATE TABLE IF NOT EXISTS practicas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  estudiante_id UUID REFERENCES estudiantes(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  coordinador_id UUID REFERENCES coordinadores(id) ON DELETE SET NULL,
  
  tipo_practica TEXT CHECK (tipo_practica IN ('Práctica I', 'Práctica II', 'Práctica Profesional')) NOT NULL,
  
  fecha_inicio DATE NOT NULL,
  fecha_termino DATE NOT NULL,
  horario_trabajo TEXT NOT NULL,
  colacion TEXT NOT NULL,
  cargo_por_desarrollar TEXT NOT NULL,
  departamento TEXT NOT NULL,
  actividades TEXT NOT NULL,
  
  fecha_firma DATE,
  firma_alumno TEXT,
  estado TEXT CHECK (estado IN ('pendiente', 'aprobada', 'en_progreso', 'completada', 'rechazada')) DEFAULT 'pendiente',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Habilitar RLS
ALTER TABLE estudiantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE coordinadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE practicas ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS
-- Estudiantes
CREATE POLICY "Usuarios pueden ver su perfil de estudiante" ON estudiantes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuarios pueden crear su perfil de estudiante" ON estudiantes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuarios pueden actualizar su perfil de estudiante" ON estudiantes
  FOR UPDATE USING (auth.uid() = user_id);

-- Coordinadores  
CREATE POLICY "Usuarios pueden ver su perfil de coordinador" ON coordinadores
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuarios pueden crear su perfil de coordinador" ON coordinadores
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuarios pueden actualizar su perfil de coordinador" ON coordinadores
  FOR UPDATE USING (auth.uid() = user_id);

-- Empresas
CREATE POLICY "Permitir lectura de empresas" ON empresas FOR SELECT USING (true);
CREATE POLICY "Permitir inserción de empresas" ON empresas FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualización de empresas" ON empresas FOR UPDATE USING (true);

-- Prácticas
CREATE POLICY "Estudiantes pueden ver sus prácticas" ON practicas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM estudiantes 
      WHERE estudiantes.id = practicas.estudiante_id 
      AND estudiantes.user_id = auth.uid()
    )
  );

CREATE POLICY "Estudiantes pueden crear sus prácticas" ON practicas
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM estudiantes 
      WHERE estudiantes.id = practicas.estudiante_id 
      AND estudiantes.user_id = auth.uid()
    )
  );

CREATE POLICY "Coordinadores pueden ver prácticas asignadas" ON practicas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM coordinadores 
      WHERE coordinadores.user_id = auth.uid()
      AND (coordinadores.id = practicas.coordinador_id OR practicas.coordinador_id IS NULL)
    )
  );

-- 7. Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_estudiantes_user_id ON estudiantes(user_id);
CREATE INDEX IF NOT EXISTS idx_coordinadores_user_id ON coordinadores(user_id);
CREATE INDEX IF NOT EXISTS idx_practicas_estudiante_id ON practicas(estudiante_id);
CREATE INDEX IF NOT EXISTS idx_practicas_coordinador_id ON practicas(coordinador_id);
CREATE INDEX IF NOT EXISTS idx_practicas_estado ON practicas(estado);

-- 8. Vista con información completa
CREATE OR REPLACE VIEW vista_practicas_completa AS
SELECT 
  p.*,
  e.nombre as estudiante_nombre,
  e.apellido as estudiante_apellido,
  e.carrera as estudiante_carrera,
  emp.razon_social as empresa_nombre,
  c.nombre as coordinador_nombre,
  c.apellido as coordinador_apellido
FROM practicas p
LEFT JOIN estudiantes e ON p.estudiante_id = e.id
LEFT JOIN empresas emp ON p.empresa_id = emp.id
LEFT JOIN coordinadores c ON p.coordinador_id = c.id;

-- 9. Por nombrar
ALTER TABLE estudiantes DISABLE ROW LEVEL SECURITY;

```

## 🚀 Instalación y Uso

```bash
# 1. Clonar repositorio
git clone [url-del-repositorio]
cd consultoria_informatica

# 2. Instalar dependencias
cd frontend
npm install

# 3. Configurar variables de entorno (ver arriba)

# 4. Iniciar servidor de desarrollo  
npm run dev
```

## 📱 Funcionalidades por Rol

### 👨‍🎓 Estudiante
- Registrar cuenta
- Crear solicitudes de práctica
- Ver estado de sus prácticas
- Editar información personal

### 👨‍🏫 Coordinador  
- Ver todas las prácticas
- Aprobar/rechazar solicitudes
- Asignarse prácticas
- Gestionar empresas

## 🔐 Estructura de la Base de Datos

- **auth.users** - Usuarios (Supabase Auth)
- **estudiantes** - Perfiles de estudiantes
- **coordinadores** - Perfiles de coordinadores
- **empresas** - Empresas disponibles
- **practicas** - Solicitudes de prácticas

## 🤝 Contribuir

1. Fork del proyecto
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abrir Pull Request
