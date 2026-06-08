// App.jsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import HandDetector from './components/HandDetector';
import DrawingCanvas from './components/DrawingCanvas';
import './App.css';

function App() {
  const [landmarks, setLandmarks] = useState(null);
  const appRef = useRef(null);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });
  
  const [theme, setTheme] = useState('dark');
  // State baru untuk Mode Kanvas (free = Gambar Bebas, cube = Kotak Kubus)
  const [canvasMode, setCanvasMode] = useState('free');

  useEffect(() => {
    const updateDimensions = () => {
      if (appRef.current) {
        setCanvasDimensions({
          width: appRef.current.clientWidth,
          height: appRef.current.clientHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const handleLandmarksDetected = useCallback((detectedLandmarks) => {
    setLandmarks(detectedLandmarks);
  }, []);

  return (
    <div 
      ref={appRef} 
      className={`relative min-h-screen overflow-hidden transition-colors duration-300 ${
        theme === 'dark' ? 'bg-[#0b0f19]' : 'bg-[#f3f4f6]'
      }`}
    >
      
      {/* 1. LAYER KANVAS */}
      {canvasDimensions.width > 0 && (
        <DrawingCanvas 
          landmarks={landmarks} 
          parentWidth={canvasDimensions.width} 
          parentHeight={canvasDimensions.height} 
          theme={theme}
          canvasMode={canvasMode} // Lempar mode ke kanvas
        />
      )}

      {/* 2. LAYER OVERLAY */}
      <div className="absolute inset-0 pointer-events-none z-10">
        
        {/* HEADER */}
        <header className="absolute top-5 left-1/2 -translate-x-1/2 text-center pointer-events-auto">
          <h1 className={`text-3xl md:text-4xl font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            🖐️ Hand Gesture Drawing
          </h1>
          <p className={`text-xs md:text-sm font-medium ${theme === 'dark' ? 'text-cyan-400' : 'text-indigo-600'}`}>
            {canvasMode === 'free' ? 'Mode: Free Drawing' : 'Mode: 3D Cube Grid (Ultra Responsive)'}
          </p>
        </header>

        {/* KAMERA (Pojok Kiri Atas) */}
        <div className="absolute top-4 left-4 pointer-events-auto z-20">
          <div className={`rounded-lg shadow-2xl overflow-hidden border-2 w-48 aspect-video md:w-64 transition-colors ${
            theme === 'dark' ? 'border-cyan-500 bg-black' : 'border-indigo-600 bg-white'
          }`}>
            <HandDetector onLandmarksDetected={handleLandmarksDetected} />
          </div>
        </div>

        {/* KONTROL PANEL UTAS (Pojok Kanan Atas) */}
        <div className="absolute top-4 right-4 flex gap-2 pointer-events-auto z-20">
          {/* Tombol Ganti Mode */}
          <button
            onClick={() => setCanvasMode((prev) => (prev === 'free' ? 'cube' : 'free'))}
            className={`px-4 py-2 rounded-lg font-bold text-xs md:text-sm shadow-md cursor-pointer border transition-all ${
              canvasMode === 'cube'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-transparent'
                : 'bg-emerald-500 text-white border-transparent hover:bg-emerald-600'
            }`}
          >
            {canvasMode === 'free' ? '⏹️ Switch to Cube' : '✏️ Switch to Free'}
          </button>

          {/* Tombol Ganti Tema */}
          <button
            onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
            className={`px-4 py-2 rounded-lg font-bold text-xs md:text-sm shadow-md cursor-pointer border transition-all ${
              theme === 'dark' 
                ? 'bg-white text-gray-900 border-white hover:bg-gray-100' 
                : 'bg-gray-900 text-white border-gray-900 hover:bg-gray-800'
            }`}
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>

        {/* FOOTER */}
        <footer className={`absolute bottom-4 left-1/2 -translate-x-1/2 text-center text-xs md:text-sm pointer-events-auto z-20 ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
        }`}>
          <p>💡 Thumb + Index = Write/Draw | Thumb + Middle = Erase</p>
        </footer>
      </div>
    </div>
  );
}

export default App;