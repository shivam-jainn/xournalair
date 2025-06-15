import { FaHand, FaPen } from "react-icons/fa6";
import ColorBar from "./ColorBar";
import { Button, Flex } from "antd";
import { useEffect } from "react";
import NotebookBar from "./NotebookBar";
import ExtraButtonBar from "./ExtraButtonBar";

const toolsList = [
    {
        name: "Pan tool",
        symbol: <FaHand color="white" />,
        id: "pan" as const
    },
    {
        name: "Pen tool",
        symbol: <FaPen color="white" />,
        id: "pen" as const
    }
];

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

interface ToolBarProps {
  canvasSettings: CanvasSettings;
  onCanvasSettingsChange: (settings: CanvasSettings) => void;
  onClearCanvas: () => void;
  pages: Page[];
  canvasRef: React.RefObject<HTMLCanvasElement>;
  currentPageId: string;
  onPagesChange: (pages: Page[]) => void;
}

export default function ToolBar({ 
  canvasSettings, 
  onCanvasSettingsChange, 
  onClearCanvas,
  pages,
  canvasRef,
  currentPageId,
  onPagesChange
}: ToolBarProps) {
    const handleToolSelect = (toolId: 'pan' | 'pen') => {
        onCanvasSettingsChange({
            ...canvasSettings,
            selectedTool: toolId
        });
    };

    const handleColorSelect = (color: string) => {
        onCanvasSettingsChange({
            ...canvasSettings,
            selectedColor: color
        });
    };

    return (
        <Flex 
            style={{
                width: "100%",
                justifyContent: "space-between",
                alignItems: "center",
                transition: "all 0.3s ease-in-out",
                position: "sticky",
                top: 0,
                zIndex: 1000,
                padding: "0.25rem 1rem",
                background : 'transparent'
            }}
        >
            {/* Left side - Tools and Colors */}
            <Flex 
                style={{
                    background: "grey",
                    borderRadius: "24px",
                    padding: "0.5rem 1.5rem",
                    boxShadow: "0 4px 12px rgba(107, 115, 255, 0.3)",
                }}
                gap="1rem"
                align="center"
            >
                <Flex gap="0.5rem">
                    {toolsList.map((tool) => (
                        <Button 
                            key={tool.id}  
                            type={canvasSettings.selectedTool === tool.id ? "primary" : "text"} 
                            icon={tool.symbol} 
                            onClick={() => handleToolSelect(tool.id)}
                            style={{
                                border: "none",
                                background: canvasSettings.selectedTool === tool.id 
                                    ? "rgba(255,255,255,0.2)" 
                                    : "transparent",
                                color: "white",
                                borderRadius: "12px",
                            }}
                        />
                    ))}
                </Flex>
                
                <div style={{ 
                    width: "1px", 
                    height: "24px", 
                    background: "rgba(255,255,255,0.3)" 
                }} />
                
                <ColorBar onColorSelect={handleColorSelect} />
            </Flex>

            {/* Right side - Notebook and Settings */}
            <Flex 
                align="center" 
                gap="1rem"
            >
                <NotebookBar />
                <ExtraButtonBar 
                    settings={canvasSettings}
                    onSettingsChange={onCanvasSettingsChange}
                    onClearCanvas={onClearCanvas}
                    pages={pages}
                    canvasRef={canvasRef}
                    currentPageId={currentPageId}
                    onPagesChange={onPagesChange} 
                />
            </Flex>
        </Flex>
    );
}