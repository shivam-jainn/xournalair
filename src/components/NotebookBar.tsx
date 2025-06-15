import React, { useState } from 'react';
import { Dropdown, Button, MenuProps } from 'antd';

const notebooks: MenuProps['items'] = [
  {
    key: 'first',
    label: 'First Notebook',
    icon: <span role="img" aria-label="notebook">📓</span>
  },
  {
    key: 'second',
    label: 'Second Notebook',
    icon: <span role="img" aria-label="notebook">📔</span>
  },
];

export default function NotebookBar() {
  const [selectedNotebook, setSelectedNotebook] = useState(notebooks?.[0] || { 
    key: 'default', 
    label: 'Default Notebook', 
    icon: <span>📓</span> 
  });

  const menuProps: MenuProps = {
    items: notebooks,
    onClick: (e) => {
      const notebook = notebooks?.find(item => item?.key === e.key);
      if (notebook) {
        setSelectedNotebook(notebook);
      }
    },
  };

  return (
    <Dropdown menu={menuProps} trigger={['click']}>
      <Button 
        style={{
          background: 'grey',
          borderRadius: '24px',
          padding: '0.5rem 2rem',
          margin: '1rem',
          color: '#fff',
          border: 'none'
        }}
      >
        {selectedNotebook.icon} {selectedNotebook.label}
      </Button>
    </Dropdown>
  );
}