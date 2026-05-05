import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { StudioPage } from '@/pages/StudioPage';
import SeedChat from '@/components/studio/SeedChat';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/studio" replace />} />
        <Route path="/studio" element={<StudioPage />} />
        <Route path="/worldseed" element={<div>WorldSeed</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
