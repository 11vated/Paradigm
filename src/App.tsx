import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { StudioPage } from '@/pages/StudioPage';
import { PhotorealisticRendererDemo } from '@/components/rendering/PhotorealisticRendererDemo';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/studio" replace />} />
        <Route path="/studio" element={<StudioPage />} />
        <Route path="/worldseed" element={<div>WorldSeed</div>} />
        <Route path="/rendering-demo" element={
          <div className="min-h-screen bg-gray-900 p-8">
            <PhotorealisticRendererDemo />
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
