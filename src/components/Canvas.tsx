import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Point, Stroke, CanvasObject, Page } from '../types/canvas';

interface CanvasSettings {
  paperSize: 'A4' | 'A3' | 'Letter' | 'Custom' | 'Infinite';
  zoom: number;
  infinite: boolean;
  backgroundColor?: string;
  selectedTool?: 'pan' | 'pen';
  selectedColor?: string;
}

interface CanvasProps {
  settings: CanvasSettings;
  currentPageId: string;
  pages: Page[];
  onPagesChange: (pages: Page[]) => void;
  onCurrentPageChange: (pageId: string) => void;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
}

const PAPER_SIZES = {
  'A4': { width: 595, height: 842 },  // A4 in points (72dpi)
  'A3': { width: 842, height: 1191 }, // A3 in points
  'Letter': { width: 612, height: 792 }, // US Letter
  'Custom': { width: 800, height: 600 }, // Default custom size
  'Infinite': { width: 2000, height: 2000 } // Base size for infinite mode
};

const Canvas: React.FC<CanvasProps> = ({
  settings,
  currentPageId,
  pages,
  onPagesChange,
  onCurrentPageChange,
  canvasRef: externalCanvasRef
}) => {
  const internalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRef = externalCanvasRef || internalCanvasRef;
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Viewport transform state
  const [viewTransform, setViewTransform] = useState({ x: 0, y: 0, scale: 1 });
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  
  // Get current page data
  const currentPage = pages.find(p => p.id === currentPageId) || pages[0];
  
  // Initialize page objects if needed
  useEffect(() => {
    if (!currentPage.objects) {
      const updatedPages = pages.map(page => 
        page.id === currentPageId 
          ? { ...page, objects: { strokes: [], transform: { x: 0, y: 0, scale: 1 } } } 
          : page
      );
      onPagesChange(updatedPages);
    }
  }, [currentPageId, pages, onPagesChange]);

    // Function to redraw all strokes on canvas
const redrawCanvas = useCallback(() => {
  const canvas = canvasRef.current;
  if (!canvas || !currentPage.objects) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  // Clear entire canvas with a neutral color first (for area outside paper)
  ctx.fillStyle = '#f0f0f0'; // Background area color
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Get transform values
  const { x: offsetX, y: offsetY, scale } = viewTransform;
  
  // If not infinite, draw paper with selected background color
  if (!settings.infinite) {
    const paperSize = PAPER_SIZES[settings.paperSize];
    const paperWidth = paperSize.width * settings.zoom;
    const paperHeight = paperSize.height * settings.zoom;
    
    // Center paper in viewport
    const x = (canvas.width / (window.devicePixelRatio || 1) - paperWidth) / 2 + offsetX;
    const y = (canvas.height / (window.devicePixelRatio || 1) - paperHeight) / 2 + offsetY;
    
    // Draw paper background with the selected pattern/color
    ctx.fillStyle = settings.backgroundColor || '#ffffff';
    ctx.fillRect(x, y, paperWidth, paperHeight);
    
    // Draw paper border
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, paperWidth, paperHeight);
    
    // Set clipping region to paper boundaries for non-infinite mode
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, paperWidth, paperHeight);
    ctx.clip();
  } else {
    // In infinite mode, use the background color for everything
    ctx.fillStyle = settings.backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  
    
    // Apply view transform
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    
    // Draw all strokes
    currentPage.objects.strokes.forEach(stroke => {
      if (stroke.points.length < 2) return;
      
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    });
    
    // Restore context
    ctx.restore();
    
    if (!settings.infinite) {
      // Restore clipping region
      ctx.restore();
    }
  }, [canvasRef, currentPage, settings, viewTransform]);

  // Setup canvas size based on container and settings
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match container
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    // Apply device pixel ratio for sharp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = container.clientWidth * dpr;
    canvas.height = container.clientHeight * dpr;
    canvas.style.width = `${container.clientWidth}px`;
    canvas.style.height = `${container.clientHeight}px`;
    ctx.scale(dpr, dpr);
    
    // Clear canvas with background color
    ctx.fillStyle = settings.backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // If not infinite, draw paper boundaries
    if (!settings.infinite) {
      const paperSize = PAPER_SIZES[settings.paperSize];
      const paperWidth = paperSize.width * settings.zoom;
      const paperHeight = paperSize.height * settings.zoom;
      
      // Center paper in viewport
      const x = (container.clientWidth - paperWidth) / 2;
      const y = (container.clientHeight - paperHeight) / 2;
      
      // Draw paper background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y, paperWidth, paperHeight);
      
      // Draw paper border
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, paperWidth, paperHeight);
    }
    
    // Redraw all strokes
    redrawCanvas();
  }, [settings, canvasRef, redrawCanvas]);


  // Handle mouse/touch interactions
const startDrawing = useCallback((x: number, y: number) => {
  if (settings.selectedTool === 'pan') return;
  
  setIsDrawing(true);
  
  // Convert screen coordinates to world coordinates
  const worldX = (x - viewTransform.x) / viewTransform.scale;
  const worldY = (y - viewTransform.y) / viewTransform.scale;
  
  // Create new stroke
  const newStroke: Stroke = {
    id: Date.now().toString(),
    tool: settings.selectedTool || 'pen',
    points: [{ x: worldX, y: worldY }],
    color: settings.selectedColor || '#000000',
    width: 2 // Could be configurable
  };
  
  setCurrentStroke(newStroke);
}, [settings, viewTransform]);
  const continueDrawing = useCallback((x: number, y: number) => {
    if (!isDrawing || !currentStroke) return;
    
    // Convert screen coordinates to world coordinates
    const worldX = (x - viewTransform.x) / viewTransform.scale;
    const worldY = (y - viewTransform.y) / viewTransform.scale;
    
    // Add point to current stroke
    const updatedStroke = {
      ...currentStroke,
      points: [...currentStroke.points, { x: worldX, y: worldY }]
    };
    
    setCurrentStroke(updatedStroke);
    
    // Draw the latest segment
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Apply transform
    ctx.save();
    ctx.translate(viewTransform.x, viewTransform.y);
    ctx.scale(viewTransform.scale, viewTransform.scale);
    
    // Draw just the latest segment for better performance
    const points = updatedStroke.points;
    const lastIndex = points.length - 1;
    
    if (lastIndex > 0) {
      ctx.beginPath();
      ctx.moveTo(points[lastIndex - 1].x, points[lastIndex - 1].y);
      ctx.lineTo(points[lastIndex].x, points[lastIndex].y);
      ctx.strokeStyle = updatedStroke.color;
      ctx.lineWidth = updatedStroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
    
    ctx.restore();
  }, [isDrawing, currentStroke, viewTransform, canvasRef]);

  const endDrawing = useCallback(() => {
    if (!isDrawing || !currentStroke) {
      setIsDrawing(false);
      return;
    }
    
    // Add completed stroke to page objects
    if (currentPage.objects && currentStroke.points.length > 1) {
      const updatedObjects = {
        ...currentPage.objects,
        strokes: [...currentPage.objects.strokes, currentStroke]
      };
      
      const updatedPages = pages.map(page =>
        page.id === currentPageId
          ? { ...page, objects: updatedObjects }
          : page
      );
      
      onPagesChange(updatedPages);
    }
    
    setIsDrawing(false);
    setCurrentStroke(null);
  }, [isDrawing, currentStroke, currentPage, pages, currentPageId, onPagesChange]);

  // Pan logic
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  const startPanning = useCallback((x: number, y: number) => {
    setIsPanning(true);
    setPanStart({ x, y });
  }, []);
  
const continuePanning = useCallback((x: number, y: number) => {
  if (!isPanning) return;
  
  const dx = x - panStart.x;
  const dy = y - panStart.y;
  
  // Update view transform (this moves the viewport, not the content)
  setViewTransform(prev => ({
    ...prev,
    x: prev.x + dx,
    y: prev.y + dy
  }));
  
  setPanStart({ x, y });
}, [isPanning, panStart]);
  
  const endPanning = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (settings.selectedTool === 'pan') {
      startPanning(x, y);
    } else {
      startDrawing(x, y);
    }
  }, [settings.selectedTool, startPanning, startDrawing]);
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (isPanning) {
      continuePanning(x, y);
    } else if (isDrawing) {
      continueDrawing(x, y);
    }
  }, [isPanning, isDrawing, continuePanning, continueDrawing]);
  
  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      endPanning();
    } else if (isDrawing) {
      endDrawing();
    }
  }, [isPanning, isDrawing, endPanning, endDrawing]);
  
  // Setup and cleanup
  useEffect(() => {
    setupCanvas();
    window.addEventListener('resize', setupCanvas);
    
    return () => {
      window.removeEventListener('resize', setupCanvas);
    };
  }, [setupCanvas]);
  
  // Redraw when view transform changes
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas, viewTransform]);

  return (
    <div 
      ref={containerRef}
      style={{ 
        flex: 1, 
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#f0f0f0'
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          display: 'block',
          position: 'absolute',
          touchAction: 'none'
        }}
      />
    </div>
  );
};

export { Canvas };
export default Canvas;