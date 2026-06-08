import React, { useRef, useEffect, useState } from 'react';

const HandDetector = ({ onLandmarksDetected }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    let camera = null;
    let hands = null;

    const init = async () => {
      try {
        // Wait for MediaPipe scripts to load
        let waitCount = 0;
        while (!window.Hands && waitCount < 100) {
          await new Promise(resolve => setTimeout(resolve, 50));
          waitCount++;
        }

        if (!window.Hands) {
          throw new Error('MediaPipe failed to load');
        }

        if (!mounted) return;

        const { Hands: HandsClass, HAND_CONNECTIONS } = window;
        const { Camera: CameraClass } = window;
        const { drawConnectors, drawLandmarks } = window;

        // Create Hands instance
        hands = new HandsClass({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`;
          },
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        // Handle results
        hands.onResults((results) => {
          if (!mounted) return;
          
          const canvasElement = canvasRef.current;
          if (!canvasElement) return;

          const ctx = canvasElement.getContext('2d');
          ctx.save();
          ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

          // Draw video
          if (results.image) {
            ctx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
          }

          // Draw landmarks
          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
              color: '#00FF00',
              lineWidth: 2,
            });
            drawLandmarks(ctx, landmarks, {
              color: '#FF0000',
              lineWidth: 1,
              radius: 3,
            });
            onLandmarksDetected(landmarks);
          } else {
            onLandmarksDetected(null);
          }

          ctx.restore();
        });

        // Create Camera
        if (videoRef.current && mounted) {
          try {
            camera = new CameraClass(videoRef.current, {
              onFrame: async () => {
                if (mounted && videoRef.current && hands) {
                  await hands.send({ image: videoRef.current });
                }
              },
              width: 640,
              height: 480,
            });

            if (mounted) {
              camera.start();
              setTimeout(() => {
                if (mounted) {
                  setLoading(false);
                }
              }, 500);
            }
          } catch (cameraErr) {
            if (mounted) {
              console.error('Camera error:', cameraErr);
              setError('Camera access denied or not available');
              setLoading(false);
            }
          }
        }
      } catch (err) {
        if (mounted) {
          console.error('Initialization error:', err);
          setError(err.message || 'Failed to initialize');
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
      if (camera) {
        try {
          camera.stop();
        } catch (e) {
          console.error('Error stopping camera:', e);
        }
      }
    };
  }, [onLandmarksDetected]);

  return (
    <div className="flex justify-center w-full relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 rounded-lg z-10">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-700 mb-2">Loading...</div>
            <div className="text-sm text-gray-600">Please allow camera access</div>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-100 rounded-lg p-4 z-20">
          <div className="text-center">
            <div className="text-lg font-bold text-red-700 mb-2">Error</div>
            <div className="text-sm text-red-600">{error}</div>
          </div>
        </div>
      )}

      <div className="w-full max-w-2xl aspect-video relative">
        <video 
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ visibility: 'hidden' }}
          autoPlay
          playsInline
        />
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="w-full h-full border-2 border-indigo-600 rounded-lg bg-black"
          style={{ transform: 'scaleX(-1)' }}
        />
      </div>
    </div>
  );
};

export default HandDetector;
