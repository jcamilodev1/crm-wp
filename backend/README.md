# CRM WhatsApp Backend - MVP

Un sistema CRM completo integrado con WhatsApp usando whatsapp-web.js.

## 🚀 Características

- **Integración WhatsApp**: Conecta con WhatsApp Web usando whatsapp-web.js
- **Gestión de Contactos**: Almacena y gestiona contactos automáticamente
- **Conversaciones**: Rastrea y organiza todas las conversaciones
- **Respuestas Automáticas**: Sistema configurable de respuestas automáticas
- **API REST**: API completa para gestionar el CRM
- **Base de Datos**: SQLite para almacenamiento local
- **Etiquetado**: Sistema de tags para organizar contactos
- **Reportes**: Estadísticas y análisis de actividad

## 📋 Requisitos

- Node.js 16+
- NPM o Yarn
- WhatsApp instalado en tu teléfono

## 🛠️ Instalación

1. **Clonar e instalar dependencias:**
```bash
cd backend
npm install
```

2. **Configurar variables de entorno:**
```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

3. **Inicializar base de datos:**
```bash
npm run init-db
```

4. **Iniciar servidor:**
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## 📱 Configuración de WhatsApp

1. Ejecuta `npm run dev`
2. Escanea el código QR que aparece en la consola con WhatsApp
3. El sistema se conectará automáticamente

## 🔧 API Endpoints

### WhatsApp
- `GET /api/whatsapp/status` - Estado del cliente
- `GET /api/whatsapp/qr` - Código QR para conexión
- `POST /api/whatsapp/send-message` - Enviar mensaje
- `GET /api/whatsapp/contacts` - Contactos de WhatsApp
- `GET /api/whatsapp/chats` - Chats activos

### Contactos
- `GET /api/contacts` - Listar contactos
- `GET /api/contacts/:id` - Obtener contacto
- `PUT /api/contacts/:id` - Actualizar contacto
- `GET /api/contacts/stats` - Estadísticas

### Conversaciones
- `GET /api/conversations` - Listar conversaciones
- `GET /api/conversations/:id` - Obtener conversación con mensajes
- `PUT /api/conversations/:id` - Actualizar conversación
- `GET /api/conversations/stats` - Estadísticas

### CRM
- `GET /api/crm/auto-responses` - Respuestas automáticas
- `POST /api/crm/auto-responses` - Crear respuesta automática
- `PUT /api/crm/auto-responses/:id` - Actualizar respuesta
- `DELETE /api/crm/auto-responses/:id` - Eliminar respuesta
- `GET /api/crm/settings` - Configuraciones
- `PUT /api/crm/settings/:key` - Actualizar configuración
- `POST /api/crm/contacts/:id/tags` - Agregar tag a contacto
- `DELETE /api/crm/contacts/:id/tags` - Remover tag de contacto
- `GET /api/crm/reports/activity` - Reporte de actividad
- `GET /api/crm/reports/top-contacts` - Contactos más activos

### General
- `GET /health` - Estado del servidor
- `GET /api/stats` - Estadísticas generales

## 📊 Base de Datos

El sistema usa SQLite con las siguientes tablas:

- **contacts**: Información de contactos
- **conversations**: Conversaciones activas
- **messages**: Historial de mensajes
- **auto_responses**: Respuestas automáticas
- **activity_logs**: Logs de actividad
- **settings**: Configuraciones del sistema

## 🔄 Respuestas Automáticas

El sistema incluye respuestas automáticas configurables:

```json
{
  "trigger_text": "hola",
  "response_text": "¡Hola! Bienvenido a nuestro CRM",
  "match_type": "contains",
  "priority": 1,
  "is_active": true
}
```

**Tipos de coincidencia:**
- `exact`: Coincidencia exacta
- `contains`: Contiene el texto
- `regex`: Expresión regular

## 🏷️ Sistema de Etiquetas

Los contactos pueden tener múltiples tags para organización:

```bash
# Agregar tag
POST /api/crm/contacts/1/tags
{"tag": "cliente-vip"}

# Remover tag
DELETE /api/crm/contacts/1/tags
{"tag": "cliente-vip"}
```

## 📈 Reportes y Análisis

- **Actividad diaria**: Mensajes enviados/recibidos por día
- **Top contactos**: Contactos más activos
- **Estadísticas generales**: Resumen del CRM

## 🔒 Seguridad

- Helmet.js para headers de seguridad
- CORS configurado
- Variables de entorno para configuración sensible
- Validación de entrada en endpoints

## 🚀 Producción

Para despliegue en producción:

1. Configurar variables de entorno de producción
2. Usar un gestor de procesos como PM2
3. Configurar nginx como proxy reverso
4. Configurar respaldos de la base de datos

```bash
# Con PM2
npm install -g pm2
pm2 start src/index.js --name "crm-backend"
pm2 save
pm2 startup
```

## 📝 Variables de Entorno

```env
PORT=3001
NODE_ENV=development
DB_PATH=./data/crm.db
WA_SESSION_PATH=./sessions
FRONTEND_URL=http://localhost:5173
```

## 🤝 Desarrollo

### Estructura del Proyecto
```
src/
├── controllers/     # Controladores de la API
├── database/        # Configuración de base de datos
├── routes/          # Rutas de la API
├── services/        # Servicios de negocio
├── utils/           # Utilidades
└── index.js         # Entrada principal
```

### Scripts Disponibles
- `npm start`: Ejecutar en producción
- `npm run dev`: Ejecutar en desarrollo con nodemon
- `npm run init-db`: Inicializar base de datos

## 🔧 Troubleshooting

### Problemas Comunes

1. **Error de conexión a WhatsApp**
   - Verificar que el teléfono tenga internet
   - Escanear nuevamente el código QR
   - Verificar que WhatsApp Web esté disponible

2. **Error de base de datos**
   - Verificar permisos de escritura en la carpeta data/
   - Ejecutar `npm run init-db`

3. **Puppeteer no funciona**
   - Instalar dependencias del sistema para Chrome
   - Verificar configuración de sandboxing

### Logs

Los logs se muestran en consola con timestamps y niveles:
```
2024-01-01T12:00:00.000Z - GET /api/contacts
📱 Código QR generado
✅ Cliente de WhatsApp listo!
📨 Mensaje recibido de 1234567890@c.us: Hola
```

## 📄 Licencia

MIT License - Ver archivo LICENSE para más detalles.

## 🆘 Soporte

Para soporte y preguntas:
- Abrir un issue en el repositorio
- Consultar la documentación de whatsapp-web.js
- Verificar los logs del servidor

---

**Nota**: Este es un MVP (Producto Mínimo Viable) diseñado para demostrar las capacidades básicas de un CRM integrado con WhatsApp. Para uso en producción, considera implementar funcionalidades adicionales como autenticación, autorización, rate limiting, y respaldos automáticos.