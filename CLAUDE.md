# Vertiche - Contract Intelligence Platform

## Project Structure
- `frontend/` - React + Vite + TypeScript + TailwindCSS + shadcn/ui
- `backend/` - Python FastAPI

## Development
- Frontend: `cd frontend && npm run dev` (port 5173)
- Backend: `cd backend && uvicorn app.main:app --reload --port 8000`
- Frontend proxies /api to backend via Vite config

## Key Conventions
- Backend uses Supabase for auth (JWT verification) and PostgreSQL
- Frontend uses Supabase client for auth, API calls go through /api proxy
- All API endpoints require Bearer token auth
- File uploads go to AWS S3, processed via Textract + Claude + ChromaDB
- Chat uses SSE streaming for real-time responses
- UI follows shadcn/ui patterns with Vertiche purple branding (#6d28d9)
