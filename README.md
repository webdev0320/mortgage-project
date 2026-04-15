# Mortgage IDP Workbench (Local Storage + SQLite)

A full-stack **Intelligent Document Processing** platform for mortgage packages.
Upload multi-page PDFs → AI classifies every page → Human analyst reviews in the HITL workspace.

---

## Architecture (Local Version)

```
/backend    Node.js / Express — REST API + orchestration (Serving local storage)
/engine     Python / FastAPI  — PDF explosion + AI classification (Local disk access)
/frontend   React / Vite      — 3-pane HITL workspace
/storage    Local folder      — Stores blobs and processed page images
```

---

## Quick Start (No Docker Required)

### 1. Initialize Storage
The system will automatically create `storage/blobs` and `storage/pages` if they don't exist.

### 2. Backend setup
```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run dev
# → http://localhost:3001
```

### 3. Python Engine setup
```bash
cd engine
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# → http://localhost:8000
```

### 4. Frontend setup
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## Environment Configuration

### Backend (`backend/.env`)
- `DATABASE_URL`: `file:./dev.db` (SQLite)
- `STORAGE_PATH`: `../storage`
- `STORAGE_URL`: `http://localhost:3001/storage`

### Frontend (`frontend/.env`)
- `VITE_STORAGE_BASE`: `http://localhost:3001/storage/pages`

---

## AI Pipeline
The engine uses PyMuPDF for "exploding" PDFs and a mock classifier. To use real AI (Google Doc AI / Textract), update `engine/classifier.py`.
