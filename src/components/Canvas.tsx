import React, { useRef, useEffect, useState, useCallback } from 'react';

interface CanvasSettings {
  paperSize: 'A4' | 'A3' | 'Letter' | 'Custom' | 'Infinite';
  zoom: number;
  infinite: boolean;
  backgroundColor?: string;
  selectedTool?: 'pan' | 'pen';
  selectedColor?: string;
}

interface Page {
  id: string;
  canvas: ImageData | null;
  backgroundImage?: string;
  backgroundPdf?: string;
}

const PAPER_SIZES = {
  A4: { width: 794, height: 1123 },
  A3: { width: 1123, height: 1587 },
  Letter: { width: 816, height: 1056 },
  Custom: { width: 800, height: 600 },
  Infinite: { width: 0, height: 0 }
};

// Background patterns
const BACKGROUND_PATTERNS = {
  white: (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  },
  grid: (ctx: CanvasRenderingContext2D, width: number, height: number, zoom: number) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    const gridSize = 20 * zoom;
    
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  },
  dots: (ctx: CanvasRenderingContext2D, width: number, height: number, zoom: number) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = '#e0e0e0';
    const dotSize = 1;
    const spacing = 20 * zoom;
    
    for (let x = spacing; x < width; x += spacing) {
      for (let y = spacing; y < height; y += spacing) {
        ctx.beginPath();
        ctx.arc(x, y, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },
  lines: (ctx: CanvasRenderingContext2D, width: number, height: number, zoom: number) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    const spacing = 30 * zoom;
    
    for (let y = spacing; y < height; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  },
  isometric: (ctx: CanvasRenderingContext2D, width: number, height: number, zoom: number) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    const spacing = 30 * zoom;
    
    // Vertical lines
    for (let x = 0; x <= width; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    // Diagonal lines (60 degrees)
    const angle = Math.PI / 3;
    const dy = spacing * Math.sin(angle);
    const dx = spacing * Math.cos(angle);
    
    for (let x = -height; x <= width + height; x += dx) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + height * Math.cos(angle), height);
      ctx.stroke();
    }
    
    for (let x = -height; x <= width + height; x += dx) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x - height * Math.cos(angle), height);
      ctx.stroke();
    }
  }
};

interface CanvasProps {
  settings: CanvasSettings;
  currentPageId: string;
  pages: Page[];
  onPagesChange: (pages: Page[]) => void;
  onCurrentPageChange: (pageId: string) => void;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
}

const Canvas: React.FC<CanvasProps> = ({ 
  settings, 
  currentPageId, 
  pages, 
  onPagesChange,
  onCurrentPageChange,
  canvasRef: externalCanvasRef
}) => {
  const internalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // Use external ref if provided, otherwise use internal ref
  const canvasRef = externalCanvasRef || internalCanvasRef;
  const currentPage = pages.find(p => p.id === currentPageId);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const devicePixelRatio = window.devicePixelRatio || 1;
    
    let canvasWidth, canvasHeight;
    
    if (settings.infinite) {
      canvasWidth = container.clientWidth;
      canvasHeight = container.clientHeight;
    } else {
      const paperDimensions = PAPER_SIZES[settings.paperSize];
      canvasWidth = paperDimensions.width * settings.zoom;
      canvasHeight = paperDimensions.height * settings.zoom;
    }

    canvas.width = canvasWidth * devicePixelRatio;
    canvas.height = canvasHeight * devicePixelRatio;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;

    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw background pattern based on backgroundColor
    drawBackgroundPattern(ctx, canvasWidth, canvasHeight);

    // Draw background image/PDF if exists
    if (currentPage?.backgroundImage) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
        restorePageContent(ctx, canvasWidth, canvasHeight);
      };
      img.src = currentPage.backgroundImage;
    } else {
      restorePageContent(ctx, canvasWidth, canvasHeight);
    }
  }, [settings, currentPage, canvasRef]);

  const drawBackgroundPattern = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const bgColor = settings.backgroundColor || '#ffffff';
    
    switch (bgColor) {
      case '#ffffff':
        BACKGROUND_PATTERNS.white(ctx, width, height);
        break;
      case '#f0f0f0':
        BACKGROUND_PATTERNS.grid(ctx, width, height, settings.zoom);
        break;
      case '#e8f4fd':
        BACKGROUND_PATTERNS.dots(ctx, width, height, settings.zoom);
        break;
      case '#fff2e8':
        BACKGROUND_PATTERNS.lines(ctx, width, height, settings.zoom);
        break;
      case '#f0f8e8':
        BACKGROUND_PATTERNS.isometric(ctx, width, height, settings.zoom);
        break;
      default:
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);
    }
  }, [settings]);

  const restorePageContent = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (currentPage?.canvas) {
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCanvas.width = currentPage.canvas.width;
        tempCanvas.height = currentPage.canvas.height;
        tempCtx.putImageData(currentPage.canvas, 0, 0);
        ctx.drawImage(tempCanvas, 0, 0, width, height);
      }
    }
  }, [currentPage]);

  const saveCurrentPage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentPage) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      const updatedPages = pages.map(page => 
        page.id === currentPageId 
          ? { ...page, canvas: imageData }
          : page
      );
      
      onPagesChange(updatedPages);
    } catch (error) {
      console.error('Error saving page:', error);
    }
  }, [currentPageId, pages, onPagesChange, currentPage, canvasRef]);

  useEffect(() => {
    setupCanvas();
  }, [setupCanvas]);

  useEffect(() => {
    const handleResize = () => {
      if (settings.infinite) {
        setupCanvas();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setupCanvas, settings.infinite]);

  const getCanvasCoordinates = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX / (window.devicePixelRatio || 1),
      y: (e.clientY - rect.top) * scaleY / (window.devicePixelRatio || 1)
    };
  }, [canvasRef]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e);
    
    if (settings.selectedTool === 'pan') {
      setIsPanning(true);
      setPanStart(coords);
    } else if (settings.selectedTool === 'pen') {
      setIsDrawing(true);
      setLastPoint(coords);

      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        // Set drawing properties immediately
        ctx.lineWidth = 2;
        ctx.strokeStyle = settings.selectedColor || '#000000';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
        // Draw a small dot for single clicks
        ctx.lineTo(coords.x + 0.1, coords.y + 0.1);
        ctx.stroke();
      }
    }
  }, [getCanvasCoordinates, canvasRef, settings.selectedTool, settings.selectedColor]);

  const handleMouseUp = useCallback(() => {
    if (isDrawing) {
      setIsDrawing(false);
      saveCurrentPage();
    }
    
    if (isPanning) {
      setIsPanning(false);
    }
  }, [saveCurrentPage, isDrawing, isPanning]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e);
    
    if (isPanning && settings.selectedTool === 'pan') {
      const deltaX = coords.x - panStart.x;
      const deltaY = coords.y - panStart.y;
      setPanOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      setPanStart(coords);
    } else if (isDrawing && settings.selectedTool === 'pen') {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx) return;

      // Ensure drawing properties are set for each stroke
      ctx.lineWidth = 2;
      ctx.strokeStyle = settings.selectedColor || '#000000';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();

      setLastPoint(coords);
    }
  }, [isDrawing, isPanning, getCanvasCoordinates, lastPoint, panStart, settings.selectedTool, settings.selectedColor, canvasRef]);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataURL = event.target?.result as string;
            const updatedPages = pages.map(page => 
              page.id === currentPageId 
                ? { ...page, backgroundImage: dataURL }
                : page
            );
            onPagesChange(updatedPages);
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  }, [currentPageId, pages, onPagesChange]);

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const getCursor = () => {
    if (settings.selectedTool === 'pan') {
      return isPanning ? 'grabbing' : 'grab';
    }
    if (settings.selectedTool === 'pen') return 'crosshair';
    return 'default';
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', background: '#f5f5f5' }}>
      <div 
        ref={containerRef}
        style={{ 
          flex: 1, 
          display: 'flex', 
          justifyContent: settings.infinite ? 'stretch' : 'center',
          alignItems: settings.infinite ? 'stretch' : 'flex-start',
          padding: settings.infinite ? 0 : '2rem',
          minHeight: settings.infinite ? '100%' : 'auto'
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            border: settings.infinite ? 'none' : '1px solid #ddd',
            borderRadius: settings.infinite ? 0 : '8px',
            boxShadow: settings.infinite ? 'none' : '0 4px 12px rgba(0,0,0,0.1)',
            cursor: getCursor(),
            width: settings.infinite ? '100%' : 'auto',
            height: settings.infinite ? '100%' : 'auto',
            transform: settings.infinite ? `translate(${panOffset.x}px, ${panOffset.y}px)` : 'none'
          }}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseUp}
        />
      </div>
    </div>
  );
};

export { Canvas };
export default Canvas;