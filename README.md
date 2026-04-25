# Mortgage IDP Workbench (Local Foundation)

This project is a high-performance Intelligent Document Processing (IDP) platform designed to run entirely on local infrastructure.

## Architecture
- **Frontend**: React + Vite (Port 5173)
- **Backend Orchestration**: Node.js + Express + Prisma + SQLite (Port 3001)
- **AI Engine**: Python FastAPI + PaddleOCR + PyMuPDF (Port 8000)
- **Storage**: Local filesystem (`/storage`)

## Prerequisites
- Node.js v18+
- Python 3.10+

## Getting Started

### 1. Backend Setup
```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run dev
```

### 2. AI Engine Setup (Python)
```bash
cd engine
# Ensure .venv is active
.\.venv\Scripts\activate
cd engine   
python -m pip install cryptography
python main.py  


```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Features Implemented
- **Task 1: Foundation**: Local storage in `/storage`, SQLite database via Prisma.
- **Task 2: AI Brain**: PaddleOCR integration with local PDF-to-image conversion.
- **Task 3: HITL UI**: Workspace with virtualized capture strip, multi-select stapling, and split/merge logic.
- **Task 4: Export & Auditing**: Automatic audit logging for all manual actions. Final PDF re-assembly engine using PyMuPDF.

## Folder Structure
- `/storage/blobs`: Raw uploaded PDFs.
- `/storage/pages`: Extracted page images (PNG/JPG).
- `/storage/final`: Re-assembled final output PDFs.
- `/backend/src/routes`: API endpoints.
- `/engine/main.py`: AI processing and Export engine.

## Hotkeys (In Workspace)
- `Arrow Up/Down`: Navigate pages.
- `V`: Verify & Lock.
- `Staple`: Select multiple pages holding Ctrl/Cmd and click "Staple" in sidebar.

---
*Created by Antigravity AI @ Google Deepmind*
