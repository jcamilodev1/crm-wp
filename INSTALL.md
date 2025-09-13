# 🚀 CRM WhatsApp - Guía de Instalación

## 📋 Requisitos Previos

- **Node.js** (versión 16 o superior)
- **npm** o **yarn**
- **Git**

## 🛠️ Instalación Paso a Paso

### 1. Clonar el Repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd crm-wp
```

### 2. Configurar el Backend

```bash
# Navegar al directorio backend
cd backend

# Instalar dependencias
npm install

# Copiar archivo de configuración
cp .env.example .env

# Inicializar la base de datos
npm run init-db
```

### 3. Configurar el Frontend

```bash
# Navegar al directorio frontend (desde la raíz del proyecto)
cd ../frontend

# Instalar dependencias
npm install
```

### 4. Configurar Variables de Entorno

Edita el archivo `backend/.env` con tus configuraciones:

```env
# Variables del servidor
PORT=3001
NODE_ENV=development

# Configuración de la base de datos
DB_PATH=./data/crm.db

# Configuración de WhatsApp
WA_SESSION_PATH=./sessions

# Configuración de CORS
FRONTEND_URL=http://localhost:5173
```

## 🚀 Ejecutar el Proyecto

### Opción 1: Ejecutar cada servicio por separado

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Opción 2: Script automatizado (desde la raíz)

```bash
# Instalar todo y configurar
npm run setup

# Ejecutar en modo desarrollo
npm run dev
```

## 📱 Conectar WhatsApp

1. Abre el navegador en `http://localhost:5173`
2. Ve a la sección "WhatsApp"
3. Haz clic en "Conectar WhatsApp"
4. Escanea el código QR con tu teléfono
5. ¡Listo! Ya puedes gestionar tus conversaciones

## 🔧 Scripts Disponibles

### Backend (`backend/`)

```bash
npm start          # Ejecutar en producción
npm run dev        # Ejecutar en desarrollo con nodemon
npm run init-db    # Inicializar base de datos
npm run setup      # Instalar dependencias e inicializar DB
npm run stats      # Ver estadísticas del CRM
```

### Frontend (`frontend/`)

```bash
npm run dev        # Servidor de desarrollo
npm run build      # Construir para producción
npm run preview    # Vista previa de la construcción
```

### Raíz del proyecto

```bash
npm run setup      # Configura todo el proyecto
npm run dev        # Ejecuta frontend y backend
npm run build      # Construye todo para producción
```

## 📁 Estructura del Proyecto

```
crm-wp/
├── backend/                 # API y lógica del servidor
│   ├── src/
│   │   ├── controllers/     # Controladores de rutas
│   │   ├── database/        # Configuración de base de datos
│   │   ├── routes/          # Definición de rutas
│   │   ├── services/        # Servicios de WhatsApp
│   │   └── utils/           # Utilidades
│   ├── scripts/
│   │   └── init-db.js       # Script de inicialización de DB
│   ├── data/                # Base de datos SQLite (gitignored)
│   ├── sessions/            # Sesiones de WhatsApp (gitignored)
│   └── package.json
├── frontend/                # Interfaz de usuario React
│   ├── src/
│   │   ├── components/      # Componentes reutilizables
│   │   ├── pages/           # Páginas de la aplicación
│   │   ├── lib/             # Utilidades y configuraciones
│   │   └── types/           # Tipos de TypeScript
│   └── package.json
└── README.md
```

## ❓ Solución de Problemas Comunes

### Error: "EADDRINUSE: address already in use :::3001"

El puerto 3001 ya está en uso. Opciones:

1. **Terminar el proceso:**
   ```bash
   lsof -ti:3001 | xargs kill -9
   ```

2. **Cambiar el puerto** en `backend/.env`:
   ```env
   PORT=3002
   ```

### Error: "Database file not found" o "SQLite error"

La base de datos no está inicializada:

```bash
cd backend
npm run init-db
```

### Error: "Cannot connect to WhatsApp"

1. Asegúrate de que el backend esté ejecutándose
2. Verifica que no haya otros procesos de WhatsApp Web activos
3. Reinicia el servicio:
   ```bash
   cd backend
   npm run dev
   ```

### Error: "CORS policy"

Verifica que el `FRONTEND_URL` en `backend/.env` coincida con la URL del frontend (normalmente `http://localhost:5173`).

## 🧪 Verificar la Instalación

1. **Backend funcionando:** `http://localhost:3001/health`
2. **Frontend funcionando:** `http://localhost:5173`
3. **API funcionando:** `http://localhost:3001/api/stats`

## 🛡️ Consideraciones de Seguridad

- El archivo `.env` contiene información sensible y **NO** debe subirse a Git
- Las sesiones de WhatsApp se guardan localmente y **NO** deben compartirse
- La base de datos SQLite está en la carpeta `data/` y **NO** se sube a Git

## 📞 Soporte

Si tienes problemas:

1. Verifica que cumples todos los requisitos previos
2. Revisa los logs en la consola
3. Asegúrate de que todos los puertos estén disponibles
4. Verifica que las variables de entorno estén correctamente configuradas

---

¡Disfruta usando tu CRM WhatsApp! 🎉