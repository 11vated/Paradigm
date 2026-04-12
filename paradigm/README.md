# Paradigm GSPL Engine

Paradigm is a seed-first creative platform for generative content, composable evolution, cryptographic sovereignty, and cross-domain creative synthesis.

## Repository Layout
- `backend/` — FastAPI backend with seed CRUD, evolution, composition, GSPL parsing, sovereignty, and library services.
- `frontend/` — React-based creative studio and management UI.
- `backend/tests/` — backend API and unit tests.
- `backend/.env.example` — backend environment configuration example.

## Getting Started
1. Copy `backend/.env.example` to `backend/.env` and update values.
2. Copy `frontend/.env.example` to `frontend/.env` and update the backend URL if needed.
3. Install backend dependencies:
   ```bash
   cd backend
   python -m venv .venv
   .\.venv\Scripts\activate
   python -m pip install -r requirements.txt
   ```
4. Install frontend dependencies:
   ```bash
   cd frontend
   yarn install
   ```

## Run the Platform
- Backend: `cd backend && .\.venv\Scripts\activate && uvicorn server:app --reload --host 0.0.0.0 --port 8000`
- Frontend: `cd frontend && yarn start`

The backend API is available at `http://localhost:8000/api/`.

## Testing
From the repository root:
```bash
cd backend
pytest
```

## Notes
- Backend seeds are stored as JSON strings in MongoDB to avoid reserved field conflicts.
- Use `backend/.env.example` as the template for secrets and local configuration.
- Avoid committing `.env` files or private keys.
