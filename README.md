# 📱 CRM WhatsApp Project

Un sistema CRM completo con integración de WhatsApp Web para gestión de contactos, conversaciones y automatización de mensajes.

## 🚀 Características Principales

- **Frontend Moderno**: React con TypeScript, Vite y Tailwind CSS
- **Backend Robusto**: Node.js con Express y SQLite
- **Integración WhatsApp**: Automatización completa con WhatsApp Web
- **Gestión de Contactos**: CRUD completo de contactos
- **Conversaciones**: Seguimiento y gestión de chats
- **QR Code**: Generación automática para conexión WhatsApp
- **Responsive**: Diseño adaptable para móviles y desktop

## 📂 Estructura del Proyecto

```
crm-wp/
├── backend/              # Servidor API Express
│   ├── src/
│   │   ├── controllers/  # Controladores de la API
│   │   ├── routes/       # Rutas de la API
│   │   ├── services/     # Servicios de WhatsApp y mensajería
│   │   ├── database/     # Configuración de base de datos
│   │   └── utils/        # Utilidades del CRM
│   ├── package.json
│   └── README.md
├── frontend/             # Aplicación React
│   ├── src/
│   │   ├── components/   # Componentes reutilizables
│   │   ├── pages/        # Páginas de la aplicación
│   │   ├── lib/          # API y utilidades
│   │   └── types/        # Tipos de TypeScript
│   ├── package.json
│   └── README.md
├── package.json          # Configuración principal
└── README.md
```

## 🛠️ Tecnologías Utilizadas

### Frontend
- **React 18** - Biblioteca de UI
- **TypeScript** - Tipado estático
- **Vite** - Build tool y dev server
- **Tailwind CSS** - Framework de CSS
- **Lucide React** - Iconos
- **TanStack Query** - Gestión de estado de servidor

### Backend
- **Node.js** - Runtime de JavaScript
- **Express** - Framework web
- **SQLite** - Base de datos ligera
- **whatsapp-web.js** - Integración WhatsApp Web
- **Puppeteer** - Automatización de navegador

## 🚀 Instalación y Configuración

### 1. Clonar el repositorio
```bash
git clone <tu-repo-url>
cd crm-wp
```

### 2. Instalar dependencias globales
```bash
npm install
```

### 3. Configurar Backend
```bash
cd backend
npm install
cp .env.example .env
# Editar .env con tus configuraciones
```

### 4. Configurar Frontend
```bash
cd frontend
npm install
```

### 5. Ejecutar en desarrollo

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

### 6. Acceder a la aplicación
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## 📱 Uso de WhatsApp

1. **Conectar WhatsApp:**
   - Ve a la página de WhatsApp en la aplicación
   - Haz clic en "Conectar WhatsApp"
   - Escanea el código QR con tu teléfono
   
2. **Gestionar Contactos:**
   - Agrega, edita y elimina contactos
   - Sincronización automática con WhatsApp
   
3. **Conversaciones:**
   - Ve todas las conversaciones activas
   - Envía mensajes directamente desde el CRM

## 🔧 Scripts Disponibles

### Scripts Globales
```bash
npm run install:all    # Instalar deps backend y frontend
npm run dev            # Ejecutar ambos en desarrollo
npm run build          # Build de producción
```

### Scripts del Backend
```bash
npm run dev            # Servidor de desarrollo
npm start              # Servidor de producción
npm run test           # Ejecutar tests
```

### Scripts del Frontend
```bash
npm run dev            # Servidor de desarrollo
npm run build          # Build de producción
npm run preview        # Vista previa del build
```

## 🌐 API Endpoints

### WhatsApp
- `GET /api/whatsapp/status` - Estado de conexión
- `GET /api/whatsapp/qr` - Código QR para conexión
- `POST /api/whatsapp/initialize` - Inicializar WhatsApp
- `POST /api/whatsapp/disconnect` - Desconectar

### Contactos
- `GET /api/contacts` - Listar contactos
- `POST /api/contacts` - Crear contacto
- `PUT /api/contacts/:id` - Actualizar contacto
- `DELETE /api/contacts/:id` - Eliminar contacto

### Conversaciones
- `GET /api/conversations` - Listar conversaciones
- `GET /api/conversations/:id` - Obtener conversación
- `PUT /api/conversations/:id` - Actualizar conversación

## 🔒 Variables de Entorno

Crear archivo `.env` en la carpeta `backend/` con:

```env
# Puerto del servidor
PORT=3001

# Configuración de base de datos
DATABASE_PATH=./data/crm.db

# Configuración de WhatsApp
WHATSAPP_SESSION_PATH=./sessions
WHATSAPP_TIMEOUT=60000

# Configuración de CORS
FRONTEND_URL=http://localhost:5173
```

## 📦 Dependencias Principales

### Backend
- express
- sqlite3
- whatsapp-web.js
- cors
- dotenv

### Frontend
- react
- react-dom
- typescript
- vite
- tailwindcss
- @tanstack/react-query
- lucide-react

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 🆘 Soporte

Si tienes problemas o preguntas:

1. Revisa la documentación en las carpetas `backend/` y `frontend/`
2. Verifica que todas las dependencias estén instaladas
3. Asegúrate de que los puertos 3001 y 5173 estén disponibles
4. Revisa los logs del servidor para errores

## 🔮 Roadmap

- [ ] Autenticación de usuarios
- [ ] Respuestas automáticas inteligentes
- [ ] Métricas y analytics
- [ ] Integración con más plataformas
- [ ] API de webhooks
- [ ] Modo multi-tenant

---

**Desarrollado con ❤️ para gestión eficiente de WhatsApp Business**