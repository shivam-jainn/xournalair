import React, { useRef } from 'react';
import { Button, Space, Upload, message } from 'antd';
import { PlusOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';

interface Page {
  id: string;
  canvas: ImageData | null;
  backgroundImage?: string;
  backgroundPdf?: string;
}

interface PageSidebarProps {
  pages: Page[];
  currentPageId: string;
  onPagesChange: (pages: Page[]) => void;
  onCurrentPageChange: (pageId: string) => void;
  onAddPage: () => void;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

const PageSidebar: React.FC<PageSidebarProps> = ({
  pages,
  currentPageId,
  onPagesChange,
  onCurrentPageChange,
  onAddPage,
  isVisible,
  onToggleVisibility
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDeletePage = (pageId: string) => {
    if (pages.length <= 1) {
      message.warning('Cannot delete the last page');
      return;
    }
    
    const pageIndex = pages.findIndex(page => page.id === pageId);
    const updatedPages = pages.filter(page => page.id !== pageId);
    onPagesChange(updatedPages);
    
    if (currentPageId === pageId) {
      // Select the previous page, or the first page if we deleted the first one
      const newIndex = pageIndex > 0 ? pageIndex - 1 : 0;
      onCurrentPageChange(updatedPages[newIndex].id);
    }
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    
    if (file.type === 'application/pdf') {
      reader.onload = (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        const updatedPages = pages.map(page => 
          page.id === currentPageId 
            ? { ...page, backgroundPdf: `data:application/pdf;base64,${base64}` }
            : page
        );
        onPagesChange(updatedPages);
        message.success('PDF imported successfully');
      };
      reader.readAsArrayBuffer(file);
    } else if (file.type.startsWith('image/')) {
      reader.onload = (e) => {
        const dataURL = e.target?.result as string;
        const updatedPages = pages.map(page => 
          page.id === currentPageId 
            ? { ...page, backgroundImage: dataURL }
            : page
        );
        onPagesChange(updatedPages);
        message.success('Image imported successfully');
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadProps: UploadProps = {
    beforeUpload: (file) => {
      const isValidType = file.type.startsWith('image/') || file.type === 'application/pdf';
      if (!isValidType) {
        message.error('You can only upload image or PDF files!');
        return false;
      }
      
      handleFileUpload(file);
      return false; // Prevent auto upload
    },
    showUploadList: false,
    accept: 'image/*,.pdf',
  };

  if (!isVisible) {
    return (
      <Button
        type="text"
        onClick={onToggleVisibility}
        style={{
          position: 'fixed',
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 1001,
          background: 'white',
          border: '1px solid #d9d9d9',
          borderLeft: 'none',
          borderRadius: '0 8px 8px 0'
        }}
      >
        {'>>'}
      </Button>
    );
  }

  return (
    <div style={{
      width: '200px',
      background: 'white',
      borderRight: '1px solid #e0e0e0',
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      position: 'relative',
      height: '100%'
    }}>
      <Button
        type="text"
        onClick={onToggleVisibility}
        style={{
          position: 'absolute',
          right: '-20px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'white',
          border: '1px solid #d9d9d9',
          borderRight: 'none',
          borderRadius: '8px 0 0 8px',
          zIndex: 1
        }}
      >
        {'<<'}
      </Button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Pages</h3>
        
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button 
            type="dashed" 
            icon={<PlusOutlined />} 
            onClick={onAddPage}
            style={{ width: '100%' }}
            size="small"
          >
            Add Page
          </Button>
          
          <Upload {...uploadProps}>
            <Button 
              type="dashed" 
              icon={<UploadOutlined />}
              style={{ width: '100%' }}
              size="small"
            >
              Import File
            </Button>
          </Upload>
        </Space>
      </div>

      <div style={{ 
        flex: 1, 
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}>
        {pages.map((page, index) => (
          <div
            key={`page-${page.id}`} // Better key format
            style={{
              border: currentPageId === page.id ? '2px solid #1890ff' : '1px solid #d9d9d9',
              borderRadius: '4px',
              padding: '0.5rem',
              cursor: 'pointer',
              background: currentPageId === page.id ? '#f0f8ff' : 'white',
              position: 'relative',
              transition: 'all 0.2s ease'
            }}
            onClick={() => onCurrentPageChange(page.id)}
          >
            <div style={{ 
              background: '#f5f5f5',
              height: '80px',
              borderRadius: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              color: '#666',
              marginBottom: '0.5rem',
              overflow: 'hidden'
            }}>
              {page.backgroundImage ? (
                <img 
                  src={page.backgroundImage} 
                  alt={`Page ${index + 1} background`}
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover',
                    borderRadius: '2px'
                  }}
                />
              ) : page.backgroundPdf ? (
                <div style={{ textAlign: 'center' }}>
                  📄<br />PDF
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  📄<br />Page {index + 1}
                </div>
              )}
            </div>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center' 
            }}>
              <span style={{ fontSize: '12px', fontWeight: 500 }}>
                Page {index + 1}
              </span>
              
              {pages.length > 1 && (
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePage(page.id);
                  }}
                  style={{ 
                    color: '#ff4d4f',
                    padding: '2px 4px'
                  }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PageSidebar;