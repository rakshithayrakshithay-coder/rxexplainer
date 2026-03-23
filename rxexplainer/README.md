# Rx Explainer — React Frontend

## Tech Stack
- React 18 + Vite
- Tailwind CSS
- React Router v6
- @react-pdf/renderer (PDF export)
- Flask backend (unchanged)

## Folder Structure
```
prescriptionassistant/
├── backend/
│   ├── app.py          ← unchanged
│   ├── .env
│   └── faiss_db/
└── frontend/           ← this React app
    ├── src/
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Dashboard.jsx
    │   │   └── Explainer.jsx
    │   ├── components/
    │   │   ├── SideEffects.jsx
    │   │   ├── SimilarMedicines.jsx
    │   │   ├── DrugInteraction.jsx
    │   │   └── PrescriptionPDF.jsx
    │   ├── api.js
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── postcss.config.js
```

## Setup Steps

### 1. Copy files
Place all these files into your `frontend/` folder.

### 2. Install dependencies
```bash
cd frontend
npm install
```

### 3. Start Flask backend (in one terminal)
```bash
cd backend
python app.py
```
Flask runs on http://127.0.0.1:5000

### 4. Start React frontend (in another terminal)
```bash
cd frontend
npm run dev
```
React runs on http://localhost:3000

### 5. Open browser
Go to http://localhost:3000

## Notes
- The Vite proxy forwards /api requests to Flask automatically — no CORS issues
- No changes needed to app.py or .env
- PDF export uses @react-pdf/renderer instead of jsPDF
