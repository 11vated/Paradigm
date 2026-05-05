# Paradigm GSPL Engine Backend

This backend provides the seed persistence, evolution, GSPL parsing, composition, sovereignty signing, and library services for the Paradigm platform.

## Requirements
- Python 3.12+
- MongoDB running locally or remotely
- `pip install -r requirements.txt`

## Environment
Copy `backend/.env.example` to `backend/.env` and fill in your values.

Required variables:
- `MONGO_URL` - MongoDB connection URI
- `DB_NAME` - MongoDB database name
- `CORS_ORIGINS` - allowed frontend origins (comma-separated)
- `EMERGENT_LLM_KEY` - optional LLM provider key

For the frontend, also copy `frontend/.env.example` to `frontend/.env` and configure `REACT_APP_BACKEND_URL`.

## Run
From the `backend/` folder:

```bash
python -m venv .venv
source .venv/Scripts/activate   # Windows
pip install -r requirements.txt
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000/api/`.

## Testing

Use `pytest` to run the backend tests:

```bash
pytest backend/tests
```

## Notes
- The backend stores seeds as JSON strings in MongoDB to avoid reserved MongoDB field issues.
- The engine is designed to keep all seed operations deterministic and lineage-aware.
