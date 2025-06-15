import "./App.css";
import { Canvas } from "./components/Canvas";
import PageSidebar from "./components/PageSidebar";
import { Flex } from "antd";
import { useState, useRef, ErrorInfo } from "react";
import React from "react";
import ToolBar from "./components/ToolBar";

interface CanvasSettings {
  paperSize: 'A4' | 'A3' | 'Letter' | 'Custom' | 'Infinite';
  zoom: number;
  infinite: boolean;
  backgroundColor?: string;
  selectedTool?: 'pan' | 'pen';
  selectedColor?: string;
 wasInfinite?: boolean; 
}

interface Page {
  id: string;
  objects: {
    strokes: Array<{
      id: string;
      tool: 'pen' | 'eraser';
      points: Array<{x: number, y: number}>;
      color: string;
      width: number;
    }>;
    transform: {
      x: number;
      y: number;
      scale: number;
    };
  };
  backgroundImage?: string;
  backgroundPdf?: string;
}


// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Something went wrong.</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSettings, setCanvasSettings] = useState<CanvasSettings>({
    paperSize: 'A4',
    zoom: 1,
    infinite: false,
    backgroundColor: '#ffffff',
    selectedTool: 'pen',
    selectedColor: '#F11616'
  });

  const [pages, setPages] = useState<Page[]>([
  { 
    id: '1', 
    objects: { 
      strokes: [], 
      transform: { x: 0, y: 0, scale: 1 } 
    } 
  }
]);
  
  const [currentPageId, setCurrentPageId] = useState('1');
  const [sidebarVisible, setSidebarVisible] = useState(true);

const handleAddPage = () => {
  const newPageId = Date.now().toString();
  setPages(prev => [
    ...prev, 
    { 
      id: newPageId, 
      objects: { 
        strokes: [], 
        transform: { x: 0, y: 0, scale: 1 } 
      } 
    }
  ]);
  setCurrentPageId(newPageId);
};

  const handleSettingsChange = (newSettings: CanvasSettings) => {
  // Track when switching to/from infinite mode
  if (newSettings.infinite !== canvasSettings.infinite) {
    newSettings.wasInfinite = canvasSettings.infinite;
  }
  setCanvasSettings(newSettings);
};

  const handlePagesChange = (newPages: Page[]) => {
    setPages(newPages);
  };

const handleClearCanvas = () => {
  const updatedPages = pages.map(page => 
    page.id === currentPageId 
      ? { 
          ...page, 
          objects: { 
            ...page.objects, 
            strokes: [] 
          } 
        }
      : page
  );
  setPages(updatedPages);
};

  return (
    <ErrorBoundary>
      <Flex style={{height:'100vh'}} vertical>
        <ToolBar
          canvasSettings={canvasSettings}
          onCanvasSettingsChange={handleSettingsChange}
          onClearCanvas={handleClearCanvas}
          pages={pages}
          canvasRef={canvasRef}
          currentPageId={currentPageId}
          onPagesChange={handlePagesChange}
        />
        <Flex style={{ flex: 1 }}>
          {!canvasSettings.infinite && (
            <PageSidebar
              pages={pages}
              currentPageId={currentPageId}
              onPagesChange={setPages}
              onCurrentPageChange={setCurrentPageId}
              onAddPage={handleAddPage}
              isVisible={sidebarVisible}
              onToggleVisibility={() => setSidebarVisible(!sidebarVisible)}
            />
          )}
          <Canvas 
            settings={canvasSettings}
            currentPageId={currentPageId}
            pages={pages}
            onPagesChange={setPages}
            onCurrentPageChange={setCurrentPageId}
            canvasRef={canvasRef}
          />
        </Flex>
      </Flex>
    </ErrorBoundary>
  );
}

export default App;