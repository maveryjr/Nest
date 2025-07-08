import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Square, Circle, ArrowRight, Type, Palette, Download, X, Undo, Redo, Save } from 'lucide-react';

interface ScreenshotToolProps {
  isVisible: boolean;
  onClose: () => void;
}

interface Annotation {
  id: string;
  type: 'rectangle' | 'circle' | 'arrow' | 'text';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  text?: string;
  color: string;
  strokeWidth: number;
}

const ScreenshotTool: React.FC<ScreenshotToolProps> = ({ isVisible, onClose }) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [selectedTool, setSelectedTool] = useState<'rectangle' | 'circle' | 'arrow' | 'text'>('rectangle');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  const [selectedColor, setSelectedColor] = useState('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState<Annotation[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#10b981', 
    '#3b82f6', '#8b5cf6', '#ec4899', '#1f2937'
  ];

  const strokeWidths = [1, 2, 3, 5, 8];

  useEffect(() => {
    if (isCapturing) {
      document.body.style.cursor = 'crosshair';
    } else {
      document.body.style.cursor = 'auto';
    }

    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [isCapturing]);

  const captureScreen = async () => {
    try {
      setIsCapturing(true);
      
      // Use Chrome's built-in screenshot API
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' }
      });
      
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      
      video.addEventListener('loadedmetadata', () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);
        
        const dataURL = canvas.toDataURL('image/png');
        setCapturedImage(dataURL);
        setIsAnnotating(true);
        setIsCapturing(false);
        
        // Stop the stream
        stream.getTracks().forEach(track => track.stop());
      });
    } catch (error) {
      console.error('Failed to capture screen:', error);
      setIsCapturing(false);
      
      // Fallback: capture current viewport
      await captureViewport();
    }
  };

  const captureViewport = async () => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Create a simple screenshot by converting the page to canvas
      // This is a simplified version - in a real implementation you'd use html2canvas
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#374151';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Screenshot captured!', canvas.width / 2, canvas.height / 2);
        ctx.fillText('(Demo screenshot - real implementation would capture actual page)', canvas.width / 2, canvas.height / 2 + 40);
      }
      
      const dataURL = canvas.toDataURL('image/png');
      setCapturedImage(dataURL);
      setIsAnnotating(true);
      setIsCapturing(false);
    } catch (error) {
      console.error('Failed to capture viewport:', error);
      setIsCapturing(false);
    }
  };

  const startAnnotation = useCallback((e: React.MouseEvent) => {
    if (!isAnnotating || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (selectedTool === 'text') {
      setTextPosition({ x, y });
      setShowTextInput(true);
      return;
    }
    
    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      type: selectedTool,
      startX: x,
      startY: y,
      endX: x,
      endY: y,
      color: selectedColor,
      strokeWidth
    };
    
    setCurrentAnnotation(newAnnotation);
    setIsDrawing(true);
  }, [isAnnotating, selectedTool, selectedColor, strokeWidth]);

  const updateAnnotation = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !currentAnnotation || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setCurrentAnnotation({
      ...currentAnnotation,
      endX: x,
      endY: y
    });
  }, [isDrawing, currentAnnotation]);

  const finishAnnotation = useCallback(() => {
    if (!isDrawing || !currentAnnotation) return;
    
    const newAnnotations = [...annotations, currentAnnotation];
    setAnnotations(newAnnotations);
    
    // Add to history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newAnnotations);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    
    setCurrentAnnotation(null);
    setIsDrawing(false);
  }, [isDrawing, currentAnnotation, annotations, history, historyIndex]);

  const addTextAnnotation = () => {
    if (!textInput.trim()) return;
    
    const textAnnotation: Annotation = {
      id: Date.now().toString(),
      type: 'text',
      startX: textPosition.x,
      startY: textPosition.y,
      endX: textPosition.x,
      endY: textPosition.y,
      text: textInput,
      color: selectedColor,
      strokeWidth
    };
    
    const newAnnotations = [...annotations, textAnnotation];
    setAnnotations(newAnnotations);
    
    // Add to history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newAnnotations);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    
    setTextInput('');
    setShowTextInput(false);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setAnnotations(history[historyIndex - 1]);
    } else if (historyIndex === 0) {
      setHistoryIndex(-1);
      setAnnotations([]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setAnnotations(history[historyIndex + 1]);
    }
  };

  const drawAnnotation = (ctx: CanvasRenderingContext2D, annotation: Annotation) => {
    ctx.strokeStyle = annotation.color;
    ctx.lineWidth = annotation.strokeWidth;
    ctx.lineCap = 'round';
    
    switch (annotation.type) {
      case 'rectangle':
        ctx.strokeRect(
          annotation.startX,
          annotation.startY,
          annotation.endX - annotation.startX,
          annotation.endY - annotation.startY
        );
        break;
        
      case 'circle':
        const radius = Math.sqrt(
          Math.pow(annotation.endX - annotation.startX, 2) +
          Math.pow(annotation.endY - annotation.startY, 2)
        );
        ctx.beginPath();
        ctx.arc(annotation.startX, annotation.startY, radius, 0, 2 * Math.PI);
        ctx.stroke();
        break;
        
      case 'arrow':
        drawArrow(ctx, annotation.startX, annotation.startY, annotation.endX, annotation.endY);
        break;
        
      case 'text':
        ctx.fillStyle = annotation.color;
        ctx.font = `${annotation.strokeWidth * 6}px Arial`;
        ctx.fillText(annotation.text || '', annotation.startX, annotation.startY);
        break;
    }
  };

  const drawArrow = (ctx: CanvasRenderingContext2D, startX: number, startY: number, endX: number, endY: number) => {
    const headLength = 15;
    const angle = Math.atan2(endY - startY, endX - startX);
    
    // Draw line
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    
    // Draw arrowhead
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - headLength * Math.cos(angle - Math.PI / 6),
      endY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - headLength * Math.cos(angle + Math.PI / 6),
      endY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !capturedImage) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    img.onload = () => {
      // Calculate proper scaling to maintain aspect ratio
      const aspectRatio = img.width / img.height;
      const canvasAspectRatio = canvas.width / canvas.height;
      
      let drawWidth = canvas.width;
      let drawHeight = canvas.height;
      
      // Calculate dimensions to fit image inside canvas while maintaining aspect ratio
      if (aspectRatio > canvasAspectRatio) {
        // Image is wider relative to canvas
        drawHeight = canvas.width / aspectRatio;
      } else {
        // Image is taller relative to canvas
        drawWidth = canvas.height * aspectRatio;
      }
      
      // Center the image
      const offsetX = (canvas.width - drawWidth) / 2;
      const offsetY = (canvas.height - drawHeight) / 2;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Set image smoothing for better quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Draw the image with proper aspect ratio preservation
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
      
      // Draw all annotations
      [...annotations, currentAnnotation].filter(Boolean).forEach(annotation => {
        drawAnnotation(ctx, annotation!);
      });
    };
    img.src = capturedImage;
  };

  useEffect(() => {
    redrawCanvas();
  }, [capturedImage, annotations, currentAnnotation]);

  const downloadScreenshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `nest-screenshot-${new Date().toISOString().slice(0, 19)}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const saveToNest = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    try {
      const dataURL = canvas.toDataURL();
      
      // Send to background script to save
      await chrome.runtime.sendMessage({
        action: 'saveScreenshot',
        screenshot: dataURL,
        url: window.location.href,
        title: document.title
      });
      
      onClose();
    } catch (error) {
      console.error('Failed to save screenshot:', error);
    }
  };

  const resetTool = () => {
    setCapturedImage(null);
    setIsAnnotating(false);
    setAnnotations([]);
    setHistory([]);
    setHistoryIndex(-1);
    setCurrentAnnotation(null);
    setIsDrawing(false);
    setShowTextInput(false);
    setTextInput('');
  };

  if (!isVisible) return null;

  return (
    <div className="nest-screenshot-tool">
      {!capturedImage ? (
        /* Capture Screen Interface */
        <div className="capture-interface">
          <div className="capture-card">
            <div className="capture-header">
              <Camera size={32} />
              <h3>Screenshot Tool</h3>
              <p>Capture and annotate screenshots instantly</p>
            </div>
            <div className="capture-actions">
              <button
                className="capture-btn primary"
                onClick={captureScreen}
                disabled={isCapturing}
              >
                <Camera size={20} />
                {isCapturing ? 'Capturing...' : 'Capture Screen'}
              </button>
              <button
                className="capture-btn secondary"
                onClick={captureViewport}
                disabled={isCapturing}
              >
                <Square size={20} />
                Capture Viewport
              </button>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} title="Close screenshot tool">
            <X size={20} />
          </button>
        </div>
      ) : (
        /* Annotation Interface */
        <div className="annotation-interface">
          {/* Toolbar */}
          <div className="annotation-toolbar">
            <div className="tool-group">
              <button
                className={`tool-btn ${selectedTool === 'rectangle' ? 'active' : ''}`}
                onClick={() => setSelectedTool('rectangle')}
                title="Rectangle"
              >
                <Square size={18} />
              </button>
              <button
                className={`tool-btn ${selectedTool === 'circle' ? 'active' : ''}`}
                onClick={() => setSelectedTool('circle')}
                title="Circle"
              >
                <Circle size={18} />
              </button>
              <button
                className={`tool-btn ${selectedTool === 'arrow' ? 'active' : ''}`}
                onClick={() => setSelectedTool('arrow')}
                title="Arrow"
              >
                <ArrowRight size={18} />
              </button>
              <button
                className={`tool-btn ${selectedTool === 'text' ? 'active' : ''}`}
                onClick={() => setSelectedTool('text')}
                title="Text"
              >
                <Type size={18} />
              </button>
            </div>

            <div className="tool-group">
              <button
                className="tool-btn"
                onClick={() => setShowColorPicker(!showColorPicker)}
                title="Color"
              >
                <Palette size={18} />
                <div 
                  className="color-indicator" 
                  style={{ backgroundColor: selectedColor }}
                />
              </button>
              
              {showColorPicker && (
                <div className="color-picker-dropdown">
                  <div className="colors-grid">
                    {colors.map(color => (
                      <button
                        key={color}
                        className={`color-option ${selectedColor === color ? 'selected' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => {
                          setSelectedColor(color);
                          setShowColorPicker(false);
                        }}
                        title={`Select ${color} color`}
                        aria-label={`Select ${color} color`}
                      />
                    ))}
                  </div>
                  <div className="stroke-widths">
                    {strokeWidths.map(width => (
                      <button
                        key={width}
                        className={`stroke-option ${strokeWidth === width ? 'selected' : ''}`}
                        onClick={() => setStrokeWidth(width)}
                        title={`Stroke width ${width}px`}
                        aria-label={`Stroke width ${width}px`}
                      >
                        <div 
                          className="stroke-preview"
                          style={{ 
                            width: `${width * 2}px`, 
                            height: `${width * 2}px`,
                            backgroundColor: selectedColor
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="tool-group">
              <button
                className="tool-btn"
                onClick={undo}
                disabled={historyIndex < 0}
                title="Undo"
              >
                <Undo size={18} />
              </button>
              <button
                className="tool-btn"
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                title="Redo"
              >
                <Redo size={18} />
              </button>
            </div>

            <div className="tool-group">
              <button
                className="tool-btn success"
                onClick={saveToNest}
                title="Save to Nest"
              >
                <Save size={18} />
              </button>
              <button
                className="tool-btn"
                onClick={downloadScreenshot}
                title="Download"
              >
                <Download size={18} />
              </button>
              <button
                className="tool-btn"
                onClick={resetTool}
                title="New Screenshot"
              >
                <Camera size={18} />
              </button>
              <button
                className="tool-btn danger"
                onClick={onClose}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Canvas */}
          <div className="canvas-container">
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              onMouseDown={startAnnotation}
              onMouseMove={updateAnnotation}
              onMouseUp={finishAnnotation}
              style={{ cursor: isAnnotating ? 'crosshair' : 'default' }}
            />
          </div>

          {/* Text Input Modal */}
          {showTextInput && (
            <div className="text-input-modal">
              <div className="text-input-content">
                <h4>Add Text</h4>
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Enter text..."
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addTextAnnotation();
                    } else if (e.key === 'Escape') {
                      setShowTextInput(false);
                      setTextInput('');
                    }
                  }}
                />
                <div className="text-input-actions">
                  <button onClick={addTextAnnotation} className="btn primary">
                    Add Text
                  </button>
                  <button 
                    onClick={() => {
                      setShowTextInput(false);
                      setTextInput('');
                    }}
                    className="btn secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .nest-screenshot-tool {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 999999;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        }

        .capture-interface {
          position: relative;
        }

        .capture-card {
          background: white;
          border-radius: 16px;
          padding: 40px;
          text-align: center;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          max-width: 400px;
        }

        .capture-header h3 {
          margin: 16px 0 8px 0;
          font-size: 24px;
          font-weight: 600;
          color: #1f2937;
        }

        .capture-header p {
          margin: 0 0 32px 0;
          color: #6b7280;
          font-size: 14px;
        }

        .capture-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .capture-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .capture-btn.primary {
          background: #3b82f6;
          color: white;
        }

        .capture-btn.primary:hover:not(:disabled) {
          background: #2563eb;
        }

        .capture-btn.secondary {
          background: #f3f4f6;
          color: #374151;
        }

        .capture-btn.secondary:hover {
          background: #e5e7eb;
        }

        .capture-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .close-btn {
          position: absolute;
          top: -50px;
          right: -50px;
          width: 40px;
          height: 40px;
          border: none;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .annotation-interface {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .annotation-toolbar {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(8px);
        }

        .tool-group {
          display: flex;
          gap: 4px;
          position: relative;
        }

        .tool-btn {
          width: 40px;
          height: 40px;
          border: none;
          background: transparent;
          color: #374151;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          position: relative;
        }

        .tool-btn:hover {
          background: #f3f4f6;
        }

        .tool-btn.active {
          background: #3b82f6;
          color: white;
        }

        .tool-btn.success {
          color: #10b981;
        }

        .tool-btn.success:hover {
          background: #10b981;
          color: white;
        }

        .tool-btn.danger {
          color: #ef4444;
        }

        .tool-btn.danger:hover {
          background: #ef4444;
          color: white;
        }

        .tool-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .color-indicator {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.8);
        }

        .color-picker-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          background: white;
          border-radius: 8px;
          padding: 12px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          z-index: 1000;
        }

        .colors-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 4px;
          margin-bottom: 12px;
        }

        .color-option {
          width: 24px;
          height: 24px;
          border: 2px solid transparent;
          border-radius: 4px;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .color-option:hover {
          transform: scale(1.1);
        }

        .color-option.selected {
          border-color: #374151;
          transform: scale(1.1);
        }

        .stroke-widths {
          display: flex;
          gap: 8px;
          justify-content: center;
        }

        .stroke-option {
          width: 32px;
          height: 32px;
          border: 2px solid transparent;
          border-radius: 4px;
          background: #f3f4f6;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .stroke-option:hover {
          background: #e5e7eb;
        }

        .stroke-option.selected {
          border-color: #3b82f6;
          background: #dbeafe;
        }

        .stroke-preview {
          border-radius: 50%;
        }

        .canvas-container {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .canvas-container canvas {
          max-width: calc(100% - 40px);
          max-height: calc(100% - 40px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          background: white;
          object-fit: contain;
          width: auto;
          height: auto;
        }

        .text-input-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1001;
        }

        .text-input-content {
          background: white;
          border-radius: 12px;
          padding: 24px;
          min-width: 300px;
        }

        .text-input-content h4 {
          margin: 0 0 16px 0;
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
        }

        .text-input-content input {
          width: 100%;
          padding: 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          margin-bottom: 16px;
          outline: none;
        }

        .text-input-content input:focus {
          border-color: #3b82f6;
        }

        .text-input-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn.primary {
          background: #3b82f6;
          color: white;
        }

        .btn.primary:hover {
          background: #2563eb;
        }

        .btn.secondary {
          background: #f3f4f6;
          color: #374151;
        }

        .btn.secondary:hover {
          background: #e5e7eb;
        }
      `}</style>
    </div>
  );
};

export default ScreenshotTool; 