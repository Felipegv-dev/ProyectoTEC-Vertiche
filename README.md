# Vertiche — Contract Intelligence Platform

Plataforma de inteligencia de contratos de arrendamiento para empresas de retail con múltiples sucursales. Utiliza IA para extraer, indexar y consultar información de contratos en lenguaje natural, reduciendo el tiempo de consulta de ~2 horas a segundos.

---

## Descripción del Proyecto

Vertiche es una empresa de fast fashion con 316+ sucursales en México. Cada sucursal opera bajo un contrato de arrendamiento comercial con términos específicos (rentas, fechas de vencimiento, cláusulas, penalizaciones, etc.). Consultar esta información manualmente implica revisar PDFs extensos, lo cual toma aproximadamente 2 horas por consulta.

Esta plataforma resuelve ese problema mediante un pipeline de IA que:

1. **Digitaliza** contratos PDF usando OCR (AWS Textract)
2. **Extrae** entidades estructuradas del texto (Claude AI)
3. **Indexa** el contenido en una base de datos vectorial (ChromaDB)
4. **Responde** preguntas en lenguaje natural sobre los contratos (RAG + Claude)
5. **Visualiza** métricas y alertas en un dashboard interactivo

---

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                  │
│          Vite + TypeScript + TailwindCSS             │
│                   shadcn/ui + Recharts               │
├──────────────────────┬──────────────────────────────┤
│        /api proxy    │         Supabase Auth         │
├──────────────────────┴──────────────────────────────┤
│                   Backend (FastAPI)                   │
├──────────┬───────────┬──────────┬───────────────────┤
│   AWS S3 │  Textract │  Claude  │    ChromaDB       │
│ (storage)│   (OCR)   │   (AI)   │   (vectores)      │
├──────────┴───────────┴──────────┴───────────────────┤
│              Supabase PostgreSQL (DB)                 │
└─────────────────────────────────────────────────────┘
```

---

## Stack Tecnológico

### Frontend
| Tecnología | Versión | Propósito |
|---|---|---|
| **React** | 19 | Framework de UI |
| **Vite** | 7 | Build tool y dev server |
| **TypeScript** | 5.7 | Tipado estático |
| **TailwindCSS** | 4 | Utilidades CSS |
| **shadcn/ui** | — | Componentes UI (Radix + Tailwind) |
| **React Router** | 7 | Enrutamiento SPA |
| **Recharts** | 2 | Gráficas del dashboard |
| **Framer Motion** | 11 | Animaciones y transiciones |
| **React Markdown** | 9 | Renderizado de respuestas del chat |
| **React Dropzone** | 14 | Upload drag-and-drop de PDFs |
| **Leaflet + React Leaflet** | 1.9 / 5 | Mapa interactivo en detalle de contrato |
| **Lucide React** | — | Iconografía |

### Backend
| Tecnología | Versión | Propósito |
|---|---|---|
| **Python** | 3.11+ | Lenguaje del servidor |
| **FastAPI** | 0.115+ | Framework web async |
| **Uvicorn** | 0.30+ | Servidor ASGI |
| **Pydantic** | 2.9+ | Validación de datos y schemas |
| **Boto3** | 1.35+ | SDK de AWS (S3, Textract) |
| **PyJWT** | 2.8+ | Verificación de tokens JWT |
| **HTTPX** | 0.27+ | Cliente HTTP async |

### Inteligencia Artificial
| Tecnología | Propósito |
|---|---|
| **Claude Sonnet (Anthropic API)** | Extracción de entidades de contratos y generación de respuestas RAG |
| **sentence-transformers** (`paraphrase-multilingual-MiniLM-L12-v2`) | Modelo de embeddings multilingüe (384 dimensiones) |
| **ChromaDB** | Base de datos vectorial local con persistencia |
| **LangChain Text Splitters** | Chunking de texto (1000 chars, 200 overlap) |
| **AWS Textract** | OCR asíncrono para extracción de texto de PDFs |

### Infraestructura y Servicios
| Servicio | Propósito |
|---|---|
| **Supabase** | Autenticación (Auth), base de datos (PostgreSQL), Row Level Security |
| **AWS S3** | Almacenamiento de archivos PDF |
| **AWS Textract** | Servicio de OCR para digitalización de contratos |
| **Docker** | Containerización para despliegue |

---

## Pipeline RAG (Retrieval-Augmented Generation)

### Fase de Ingesta (al subir un PDF)
```
PDF → S3 Upload → Textract OCR → Texto crudo
                                      │
                    ┌─────────────────┤
                    ▼                 ▼
            Claude Extraction    Text Splitter
            (JSON estructurado)  (chunks 1000 chars)
                    │                 │
                    ▼                 ▼
            contract_metadata    sentence-transformers
            (Supabase DB)        (embeddings 384d)
                                      │
                                      ▼
                                  ChromaDB
                                  (vector store)
```

### Fase de Consulta (al enviar un mensaje en el chat)
```
Pregunta del usuario
        │
        ▼
sentence-transformers (embed query)
        │
        ▼
ChromaDB similarity search (top 8 chunks)
        │
        ▼
Contexto armado con chunks relevantes
        │
        ▼
Claude Sonnet (streaming response)
        │
        ▼
SSE (Server-Sent Events) → Frontend
```

---

## Módulos de la Aplicación

### 1. Autenticación
- Login y registro con Supabase Auth
- Verificación de JWT (ES256) en cada request del backend
- Row Level Security en todas las tablas de PostgreSQL
- Contexto de autenticación en React con manejo de sesión automático

### 2. Gestión Documental
- Upload drag-and-drop de PDFs (hasta 50MB)
- Pipeline de procesamiento en background (OCR → Extracción → Embeddings)
- Polling de estado en tiempo real (pending → processing → ready)
- Vista previa de PDF embebida en la aplicación
- Mapa interactivo con geocodificación automática de la dirección del contrato (Leaflet + OpenStreetMap/Nominatim)
- Extracción automática de 21 campos estructurados por contrato:
  - Partes (arrendador, arrendatario, fiador)
  - Ubicación (dirección, ciudad, estado, código postal, metros cuadrados)
  - Términos financieros (renta, incremento anual, depósito, moneda)
  - Fechas (inicio, vencimiento, duración)
  - Cláusulas (renovación, penalización, mantenimiento, seguros, uso permitido)

### 3. Chat Inteligente (RAG)
- Múltiples sesiones de conversación
- Streaming de respuestas en tiempo real via SSE
- Renderizado de markdown en respuestas
- Citación de fuentes con fragmentos del contrato original
- Sugerencias de preguntas predefinidas
- Filtrado opcional por contratos específicos

### 4. Dashboard Analítico
- **Métricas clave**: total de contratos, contratos activos, por vencer (90 días), renta mensual total
- **Timeline de vencimientos**: gráfica de barras con contratos por vencer por mes
- **Renta por estado**: gráfica horizontal con promedio de renta/m² por estado
- **Alertas automáticas**: generadas según proximidad de vencimiento y renta por m²
- **Próximos vencimientos**: lista de contratos próximos a vencer con días restantes

---

## Base de Datos

### Tablas
| Tabla | Descripción |
|---|---|
| `contracts` | Contratos subidos (archivo, status, s3_key) |
| `contract_metadata` | Datos extraídos por IA (25 campos estructurados) |
| `chat_sessions` | Sesiones de conversación del chat |
| `chat_messages` | Mensajes (user/assistant) con sources en JSONB |
| `dashboard_alerts` | Alertas generadas automáticamente |

Todas las tablas tienen **Row Level Security (RLS)** habilitado, garantizando que cada usuario solo accede a sus propios datos.

---

## Estructura del Proyecto

```
ProyectoTEC/
├── frontend/                     # React SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/               # 17 componentes shadcn/ui
│   │   │   ├── layout/           # Sidebar, Header, AppLayout, ProtectedRoute
│   │   │   ├── chat/             # ChatWindow, ChatSidebar, ChatMessage, ChatInput, ChatWelcome
│   │   │   ├── dashboard/        # StatsGrid, ExpirationTimeline, RentChart, AlertsList
│   │   │   └── documents/        # UploadZone, ContractTable, ContractDetail, AddressMap
│   │   ├── pages/                # LoginPage, ChatPage, DashboardPage, DocumentsPage
│   │   ├── hooks/                # useContracts, useChat, useDashboard
│   │   ├── context/              # AuthContext, ThemeContext
│   │   └── lib/                  # supabase.ts, api.ts, utils.ts
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI app + CORS + routers
│   │   ├── config.py             # Settings (pydantic-settings)
│   │   ├── api/
│   │   │   ├── auth.py           # JWT verification (ES256 via JWKS)
│   │   │   ├── contracts.py      # Upload, list, detail, delete + background processing
│   │   │   ├── chat.py           # Sessions, messages, SSE streaming
│   │   │   └── dashboard.py      # Stats, alerts, analytics
│   │   ├── services/
│   │   │   ├── s3_service.py     # AWS S3 upload/download/delete
│   │   │   ├── textract_service.py   # OCR async pipeline
│   │   │   ├── extraction_service.py # Claude entity extraction
│   │   │   ├── embedding_service.py  # sentence-transformers + ChromaDB
│   │   │   ├── rag_service.py    # RAG query + Claude streaming
│   │   │   ├── supabase_service.py   # Database CRUD
│   │   │   └── alert_service.py  # Alert generation
│   │   └── models/schemas.py     # Pydantic models
│   ├── Dockerfile
│   ├── pyproject.toml
│   └── requirements.txt
├── database/
│   └── migration.sql             # Schema SQL para Supabase
├── .env.example                  # Template de variables de entorno
├── docker-compose.yml            # Orquestación de contenedores
├── CLAUDE.md                     # Instrucciones para Claude Code
└── README.md                     # Este archivo
```

---

## API Endpoints

### Contracts (`/api/contracts`)
| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/upload` | Subir PDF → S3 → pipeline en background |
| `GET` | `/` | Listar contratos (paginación + búsqueda) |
| `GET` | `/{id}` | Detalle + metadata extraída |
| `GET` | `/{id}/status` | Status de procesamiento (polling) |
| `GET` | `/{id}/download-url` | URL presignada de S3 |
| `DELETE` | `/{id}` | Eliminar contrato + S3 + vectores |

### Chat (`/api/chat`)
| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/sessions` | Crear sesión de chat |
| `GET` | `/sessions` | Listar sesiones |
| `GET` | `/sessions/{id}` | Historial de mensajes |
| `POST` | `/sessions/{id}/messages` | Enviar mensaje → SSE streaming |
| `DELETE` | `/sessions/{id}` | Eliminar sesión |

### Dashboard (`/api/dashboard`)
| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/stats` | Métricas agregadas |
| `GET` | `/expiring` | Contratos por vencer |
| `GET` | `/alerts` | Alertas activas |
| `GET` | `/rent-analytics` | Renta promedio/m² por estado |
| `GET` | `/timeline` | Vencimientos por mes |

---

## Instalación y Ejecución

### Prerrequisitos
- Node.js 20+
- Python 3.11+
- Cuenta de Supabase (Auth + PostgreSQL)
- Cuenta de AWS (S3 + Textract)
- API key de Anthropic

### Setup

1. **Clonar el repositorio**
```bash
git clone <repo-url>
cd ProyectoTEC
```

2. **Configurar variables de entorno**
```bash
cp .env.example .env
# Editar .env con tus credenciales
```

3. **Crear tablas en Supabase**
   - Ir a Supabase Dashboard → SQL Editor
   - Ejecutar `database/migration.sql`

4. **Backend**
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

5. **Frontend**
```bash
cd frontend
npm install
npm run dev
```

6. Abrir **http://localhost:5173**

### Con Docker
```bash
docker compose up --build
```
La app estará disponible en **http://localhost**.

---

## Seguridad

- Autenticación JWT con verificación ES256 via JWKS de Supabase
- Row Level Security (RLS) en todas las tablas
- Service Role Key solo en el backend (nunca expuesta al frontend)
- URLs presignadas de S3 con expiración de 1 hora
- CORS configurado para ambientes de desarrollo y producción
- Variables sensibles excluidas del repositorio via `.gitignore`
