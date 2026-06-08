// components/DrawingCanvas.jsx
import React, { useRef, useEffect, useState } from 'react';

const DrawingCanvas = ({ landmarks, parentWidth, parentHeight, theme, canvasMode }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [gestureState, setGestureState] = useState(null);

  const [pointerPos, setPointerPos] = useState({ x: 0, y: 0, visible: false });

  const missingGestureCountRef = useRef(0);
  const lastXRef = useRef(null);
  const lastYRef = useRef(null);
  const smoothedXRef = useRef(null);
  const smoothedYRef = useRef(null);

  // Ukuran satu block kubus (pixel)
  const CUBE_SIZE = 30; 

  const getDistance = (point1, point2) => {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const detectGesture = (lms) => {
    if (!lms || lms.length < 17) return null;
    const thumbTip = lms[4];
    const indexTip = lms[8];
    const middleTip = lms[12];

    const thumbIndexDist = getDistance(thumbTip, indexTip);
    const thumbMiddleDist = getDistance(thumbTip, middleTip);

    const TOUCH_THRESHOLD = 0.085;

    if (thumbIndexDist < TOUCH_THRESHOLD && thumbIndexDist <= thumbMiddleDist) {
      return 'write';
    } else if (thumbMiddleDist < TOUCH_THRESHOLD && thumbMiddleDist < thumbIndexDist) {
      return 'erase';
    }
    return null;
  };

  // Update koordinat kursor penanda jari
  useEffect(() => {
    if (landmarks && landmarks.length > 0) {
      const indexTip = landmarks[8];
      const targetX = (1 - indexTip.x) * parentWidth;
      const targetY = indexTip.y * parentHeight;

      if (smoothedXRef.current === null || smoothedYRef.current === null) {
        smoothedXRef.current = targetX;
        smoothedYRef.current = targetY;
      } else {
        // Jika mode kubus, kursor dibuat 100% instan/tanpa delay filter agar terasa ultra-responsif
        const cursorAlpha = canvasMode === 'cube' ? 1.0 : 0.3;
        smoothedXRef.current += cursorAlpha * (targetX - smoothedXRef.current);
        smoothedYRef.current += cursorAlpha * (targetY - smoothedYRef.current);
      }

      setPointerPos({
        x: smoothedXRef.current,
        y: smoothedYRef.current,
        visible: true
      });

      const gesture = detectGesture(landmarks);
      if (gesture === 'write') {
        missingGestureCountRef.current = 0;
        setIsDrawing(true);
        setIsErasing(false);
        setGestureState('writing');
      } else if (gesture === 'erase') {
        missingGestureCountRef.current = 0;
        setIsDrawing(false);
        setIsErasing(true);
        setGestureState('erasing');
      } else {
        missingGestureCountRef.current += 1;
        // Mode kubus tidak butuh banyak buffer karena sifatnya per grid block
        const maxFrames = canvasMode === 'cube' ? 2 : 4;
        if (missingGestureCountRef.current >= maxFrames) {
          setIsDrawing(false);
          setIsErasing(false);
          setGestureState(null);
        }
      }
    } else {
      setIsDrawing(false);
      setIsErasing(false);
      setGestureState(null);
      setPointerPos((prev) => ({ ...prev, visible: false }));
      lastXRef.current = null;
      lastYRef.current = null;
      smoothedXRef.current = null;
      smoothedYRef.current = null;
    }
  }, [landmarks, parentWidth, parentHeight, canvasMode]);

  // Fungsi khusus menggambar balok kubus 2.5D/Grid Kotak (Ultra Responsif)
  const drawCubeBlock = (ctx, x, y, color, isDark) => {
    // Cari koordinat grid terdekat (snapping effect)
    const gridX = Math.floor(x / CUBE_SIZE) * CUBE_SIZE;
    const gridY = Math.floor(y / CUBE_SIZE) * CUBE_SIZE;

    ctx.save();
    ctx.shadowBlur = 0; // Matikan blur bawaan agar performa meningkat tajam

    // Sisi depan kubus (Main Square)
    ctx.fillStyle = color;
    ctx.fillRect(gridX, gridY, CUBE_SIZE - 2, CUBE_SIZE - 2);

    // Efek 3D Sisi Samping & Atas Balok (Hanya jika di mode gelap agar estetis neon)
    if (isDark) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      ctx.moveTo(gridX, gridY);
      ctx.lineTo(gridX + 4, gridY - 4);
      ctx.lineTo(gridX + CUBE_SIZE + 2, gridY - 4);
      ctx.lineTo(gridX + CUBE_SIZE - 2, gridY);
      ctx.fill();
    }

    ctx.restore();
  };

  // Logic Render Utama Kanvas Gambar
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !landmarks || landmarks.length < 9) return;

    const ctx = canvas.getContext('2d');
    const indexTip = landmarks[8];

    const currentX = (1 - indexTip.x) * canvas.width;
    const currentY = indexTip.y * canvas.height;

    const isDark = theme === 'dark';
    const mainColor = isDark ? '#00f3ff' : '#000000';

    if (isDrawing) {
      // MODE 2: KOTAK KUBUS (Sangat Ringan & Responsif)
      if (canvasMode === 'cube') {
        drawCubeBlock(ctx, currentX, currentY, mainColor, isDark);
      } 
      // MODE 1: GAMBAR BEBAS (Sesuai modifikasi versi stabil sebelumnya)
      else {
        if (isDark) {
          ctx.strokeStyle = '#00f3ff';
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#00f3ff';
        } else {
          ctx.strokeStyle = '#000000';
          ctx.shadowBlur = 0;
        }

        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (lastXRef.current === null || lastYRef.current === null) {
          ctx.beginPath();
          ctx.moveTo(currentX, currentY);
          lastXRef.current = currentX;
          lastYRef.current = currentY;
        } else {
          const dist = Math.sqrt(Math.pow(currentX - lastXRef.current, 2) + Math.pow(currentY - lastYRef.current, 2));
          const maxAllowedJump = parentWidth * 0.08; 
          if (dist > maxAllowedJump) return;

          const filterWeight = dist > 20 ? 0.40 : 0.15;
          const finalX = lastXRef.current + filterWeight * (currentX - lastXRef.current);
          const finalY = lastYRef.current + filterWeight * (currentY - lastYRef.current);

          const midX = (lastXRef.current + finalX) / 2;
          const midY = (lastYRef.current + finalY) / 2;
          
          ctx.beginPath();
          ctx.moveTo(lastXRef.current, lastYRef.current);
          ctx.quadraticCurveTo(lastXRef.current, lastYRef.current, midX, midY);
          ctx.lineTo(finalX, finalY);
          ctx.stroke();

          lastXRef.current = finalX;
          lastYRef.current = finalY;
        }
      }
    } else if (isErasing) {
      const eraserSize = canvasMode === 'cube' ? 80 : 75; // Penghapus mode kubus dibuat kotak presisi grid
      ctx.shadowBlur = 0;

      if (canvasMode === 'cube') {
        const gridX = Math.floor(currentX / CUBE_SIZE) * CUBE_SIZE;
        const gridY = Math.floor(currentY / CUBE_SIZE) * CUBE_SIZE;
        ctx.clearRect(gridX - CUBE_SIZE, gridY - CUBE_SIZE, CUBE_SIZE * 3, CUBE_SIZE * 3);
      } else {
        ctx.clearRect(currentX - eraserSize / 2, currentY - eraserSize / 2, eraserSize, eraserSize);
      }
      
      lastXRef.current = null;
      lastYRef.current = null;
    } else {
      lastXRef.current = null;
      lastYRef.current = null;
    }
  }, [landmarks, isDrawing, isErasing, theme, parentWidth, canvasMode]);

  // Handler resize window
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && parentWidth > 0 && parentHeight > 0) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(canvas, 0, 0);

      canvas.width = parentWidth;
      canvas.height = parentHeight;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(tempCanvas, 0, 0);
    }
  }, [parentWidth, parentHeight]);

  // Kalkulasi pembungkus posisi kursor kotak snapping untuk mode kubus
  const getPointerStyle = () => {
    if (canvasMode === 'cube') {
      const gridX = Math.floor(pointerPos.x / CUBE_SIZE) * CUBE_SIZE;
      const gridY = Math.floor(pointerPos.y / CUBE_SIZE) * CUBE_SIZE;
      return {
        left: `${gridX}px`,
        top: `${gridY}px`,
        transform: 'none' // Matikan translate bawaan bulat biasa
      };
    }
    return {
      left: `${pointerPos.x}px`,
      top: `${pointerPos.y}px`,
    };
  };

  return (
    <div className="absolute inset-0 min-h-screen z-0 pointer-events-none">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      
      {/* INDIKATOR KURSOR DINAMIS */}
      {pointerPos.visible && (
        <div 
          className={`absolute pointer-events-none transition-all duration-75 ${
            canvasMode === 'cube'
              ? `border-2 ${theme === 'dark' ? 'border-cyan-400 bg-cyan-400/10' : 'border-black bg-black/10'}` // Kursor Kotak Grid untuk Mode Kubus
              : gestureState === 'writing' 
              ? 'rounded-full w-3 h-3 bg-green-400 ring-4 ring-green-400/30 -translate-x-1/2 -translate-y-1/2' 
              : gestureState === 'erasing'
              ? 'rounded-full w-16 h-16 bg-red-500/20 border-2 border-red-500 -translate-x-1/2 -translate-y-1/2'
              : theme === 'dark'
              ? 'rounded-full w-4 h-4 bg-cyan-400 ring-4 ring-cyan-400/20 -translate-x-1/2 -translate-y-1/2'
              : 'rounded-full w-4 h-4 bg-indigo-600 ring-4 ring-indigo-600/20 -translate-x-1/2 -translate-y-1/2'
          }`}
          style={{
            ...getPointerStyle(),
            width: canvasMode === 'cube' ? `${CUBE_SIZE}px` : undefined,
            height: canvasMode === 'cube' ? `${CUBE_SIZE}px` : undefined,
          }}
        />
      )}
      
      {/* CONTROL BUTTONS */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 pointer-events-auto z-20">
        <div className="flex justify-center items-center h-12">
          {gestureState === 'writing' && (
            <span className="px-4 py-2 rounded-full font-bold text-sm bg-green-500 text-white shadow-lg">
              ✏️ {canvasMode === 'cube' ? 'Block Placing' : 'Writing'}
            </span>
          )}
          {gestureState === 'erasing' && (
            <span className="px-4 py-2 rounded-full font-bold text-sm bg-red-500 text-white shadow-lg">
              🗑️ Erasing
            </span>
          )}
          {!gestureState && (
            <span className={`px-4 py-2 rounded-full font-bold text-sm shadow-md transition-colors ${
              theme === 'dark' ? 'bg-cyan-500 text-slate-900' : 'bg-yellow-400 text-gray-800'
            }`}>
              Ready
            </span>
          )}
        </div>
        <button
          className={`px-6 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all shadow-lg hover:-translate-y-1 active:translate-y-0 ${
            theme === 'dark'
              ? 'bg-cyan-500 text-slate-900 hover:bg-cyan-400'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
          onClick={() => {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }}
        >
          Clear Canvas
        </button>
      </div>
    </div>
  );
};

export default DrawingCanvas;