import "./App.css";
import { Canvas } from "./components/Canvas";
import PageSidebar from "./components/PageSidebar";
import { Flex } from "antd";
import { useState, useRef, ErrorInfo } from "react";
import React from "react";
import ToolBar from "./components/Toolbar";

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
    { id: '1', canvas: null }
  ]);
  
  const [currentPageId, setCurrentPageId] = useState('1');
  const [sidebarVisible, setSidebarVisible] = useState(true);

  const handleAddPage = () => {
    const newPageId = Date.now().toString();
    const newPage: Page = {
      id: newPageId,
      canvas: null
    };
    setPages(prev => [...prev, newPage]);
    setCurrentPageId(newPageId);
  };

  const handleClearCanvas = () => {
    // Clear current page canvas data
    const updatedPages = pages.map(page => 
      page.id === currentPageId 
        ? { ...page, canvas: null }
        : page
    );
    setPages(updatedPages);
    
    // Force canvas redraw
    setCanvasSettings(prev => ({ ...prev }));
  };

  return (
    <ErrorBoundary>
      <Flex style={{height:'100vh'}} vertical>
        <ToolBar 
          canvasSettings={canvasSettings}
          onCanvasSettingsChange={setCanvasSettings}
          onClearCanvas={handleClearCanvas}
          pages={pages}
          canvasRef={canvasRef}
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