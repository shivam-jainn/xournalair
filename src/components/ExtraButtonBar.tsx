import React, { useState } from 'react';
import { Button, Dropdown, Select, Space, MenuProps, message, ColorPicker } from 'antd';
import { MoreOutlined, DownloadOutlined } from '@ant-design/icons';
import jsPDF from 'jspdf';

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

interface ExtraButtonBarProps {
  settings: CanvasSettings;
  onSettingsChange: (settings: CanvasSettings) => void;
  onClearCanvas: () => void;
  pages: Page[];
  canvasRef: React.RefObject<HTMLCanvasElement>;
  currentPageId: string;
  onPagesChange: (pages: Page[]) => void;
}

const backgroundPatterns = [
  { value: '#ffffff', label: 'Plain White', preview: '⬜' },
  { value: '#f0f0f0', label: 'Grid Pattern', preview: '⬜' },
  { value: '#e8f4fd', label: 'Dot Pattern', preview: '🔵' },
  { value: '#fff2e8', label: 'Line Pattern', preview: '📄' },
  { value: '#f0f8e8', label: 'Isometric Pattern', preview: '◊' }
];

const ExtraButtonBar: React.FC<ExtraButtonBarProps> = ({ 
  settings, 
  onSettingsChange, 
  onClearCanvas,
  pages,
  canvasRef,
  currentPageId,
  onPagesChange
}) => {
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [exportDropdownVisible, setExportDropdownVisible] = useState(false);

  const handlePaperSizeChange = (value: string) => {
    onSettingsChange({
      ...settings,
      paperSize: value as CanvasSettings['paperSize'],
      infinite: value === 'Infinite'
    });
  };

  const handleZoomChange = (value: number) => {
    onSettingsChange({
      ...settings,
      zoom: value
    });
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportAsPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      message.error('Canvas not found');
      return;
    }

    try {
      canvas.toBlob((blob) => {
        if (blob) {
          downloadFile(blob, `xournal-page-${Date.now()}.png`);
          message.success('Page exported as PNG');
        }
      }, 'image/png');
    } catch (error) {
      message.error('Failed to export PNG');
    }
    setExportDropdownVisible(false);
  };

  const exportAsSVG = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      message.error('Canvas not found');
      return;
    }

    try {
      const dataURL = canvas.toDataURL('image/png');
      const svg = `
        <svg width="${canvas.width}" height="${canvas.height}" xmlns="http://www.w3.org/2000/svg">
          <image href="${dataURL}" width="${canvas.width}" height="${canvas.height}"/>
        </svg>
      `;

      const blob = new Blob([svg], { type: 'image/svg+xml' });
      downloadFile(blob, `xournal-page-${Date.now()}.svg`);
      message.success('Page exported as SVG');
    } catch (error) {
      message.error('Failed to export SVG');
    }
    setExportDropdownVisible(false);
  };

  const exportAsPDF = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      message.error('Canvas not found');
      return;
    }

    try {
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
      pdf.save(`xournal-notebook-${Date.now()}.pdf`);
      message.success('Page exported as PDF');
    } catch (error) {
      message.error('Failed to export PDF');
    }
    setExportDropdownVisible(false);
  };

  const exportMenuItems: MenuProps['items'] = [
    {
      key: 'png',
      label: 'Export as PNG',
      icon: <DownloadOutlined />,
      onClick: exportAsPNG
    },
    {
      key: 'svg',
      label: 'Export as SVG',
      icon: <DownloadOutlined />,
      onClick: exportAsSVG
    },
    {
      key: 'pdf',
      label: 'Export as PDF',
      icon: <DownloadOutlined />,
      onClick: exportAsPDF
    }
  ];

  const settingsMenuItems: MenuProps['items'] = [
    {
      key: 'settings',
      label: (
        <div 
          style={{ 
            padding: '1rem', 
            minWidth: '300px',
          }}
          onClick={(e) => e.stopPropagation()} // Prevent closing on click inside
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Paper Size
              </label>
              <Select
                value={settings.paperSize}
                onChange={handlePaperSizeChange}
                style={{ width: '100%' }}
                onClick={(e) => e.stopPropagation()}
                options={[
                  { value: 'A4', label: 'A4 (210×297mm)' },
                  { value: 'A3', label: 'A3 (297×420mm)' },
                  { value: 'Letter', label: 'Letter (8.5×11")' },
                  { value: 'Custom', label: 'Custom' },
                  { value: 'Infinite', label: 'Infinite Canvas' }
                ]}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Zoom Level
              </label>
              <Select
                value={settings.zoom}
                onChange={handleZoomChange}
                style={{ width: '100%' }}
                onClick={(e) => e.stopPropagation()}
                options={[
                  { value: 0.5, label: '50%' },
                  { value: 0.75, label: '75%' },
                  { value: 1, label: '100%' },
                  { value: 1.25, label: '125%' },
                  { value: 1.5, label: '150%' },
                  { value: 2, label: '200%' }
                ]}
                disabled={settings.infinite}
              />
            </div>
<div>
  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
    Background Pattern
  </label>
  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
    <Select
      value={settings.backgroundColor || '#ffffff'}
      onChange={(value) => onSettingsChange({ ...settings, backgroundColor: value })}
      style={{ flex: 1 }}
      onClick={(e) => e.stopPropagation()}
      options={backgroundPatterns.map(pattern => ({
        value: pattern.value,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>{pattern.preview}</span>
            <span>{pattern.label}</span>
          </div>
        )
      }))}
    />
    <ColorPicker
      value={settings.backgroundColor || '#ffffff'}
      onChange={(color) => onSettingsChange({ ...settings, backgroundColor: color.toHexString() })}
    />
  </div>
</div>

<div>
  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
    Import File
  </label>
  <input
    type="file"
    accept="image/*,application/pdf"
    onChange={(e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataURL = event.target?.result as string;
          const updatedPages = pages.map(page => 
            page.id === currentPageId 
              ? { ...page, backgroundImage: dataURL }
              : page
          );
          onPagesChange(updatedPages);
          message.success('Image imported as background');
        };
        reader.readAsDataURL(file);
      } else if (file.type === 'application/pdf') {
        // For PDF handling, you'd need a PDF.js implementation
        message.info('PDF import will be supported in a future update');
      }
    }}
    style={{ width: '100%' }}
    onClick={(e) => e.stopPropagation()}
  />
</div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Export Options
              </label>
              <div onClick={(e) => e.stopPropagation()}>
                <Dropdown 
                  menu={{ items: exportMenuItems }} 
                  placement="bottomLeft"
                  open={exportDropdownVisible}
                  onOpenChange={setExportDropdownVisible}
                  getPopupContainer={() => document.body} // Render in body to avoid conflicts
                >
                  <Button 
                    style={{ width: '100%' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setExportDropdownVisible(!exportDropdownVisible);
                    }}
                  >
                    Export <DownloadOutlined />
                  </Button>
                </Dropdown>
              </div>
            </div>

            <Button 
              onClick={(e) => {
                e.stopPropagation();
                onClearCanvas();
                setDropdownVisible(false);
              }}
              style={{ width: '100%', marginTop: '0.5rem' }}
              type="default"
            >
              Clear Canvas
            </Button>
          </Space>
        </div>
      ),
    }
  ];

  return (
    <Dropdown
      menu={{ items: settingsMenuItems }}
      trigger={['click']}
      placement="bottomRight"
      open={dropdownVisible}
      onOpenChange={(open) => {
        setDropdownVisible(open);
        if (!open) {
          setExportDropdownVisible(false); // Close export dropdown when main dropdown closes
        }
      }}
      getPopupContainer={() => document.body} // Render in body to avoid conflicts
    >
      <Button 
        type="text" 
        icon={<MoreOutlined />}
        style={{
          border: 'none',
          background: 'rgba(0,0,0,0.1)',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      />
    </Dropdown>
  );
};

export default ExtraButtonBar;