import { useState, useEffect, useRef } from 'react';
import { Flex, Button } from 'antd';
import { HexColorPicker } from "react-colorful";
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  DragOverlay,
  TouchSensor,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IoMdAdd } from "react-icons/io";

const STORAGE_KEY = "colorBarState";

// Types for props
interface ColorSwatchProps {
  color: string;
  index: number;
  selected: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  listeners?: any;
  attributes?: any;
  style?: React.CSSProperties;
  dragging?: boolean;
  children?: React.ReactNode;
}

function ColorSwatch({ 
  color, 
  selected, 
  onClick, 
  onDoubleClick, 
  listeners, 
  attributes, 
  style, 
  dragging, 
  children 
}: ColorSwatchProps) {
  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      tabIndex={0}
      aria-label={`Color ${color}`}
      style={{
        background: color,
        borderRadius: '100%',
        width: '25px',
        height: '25px',
        border: selected ? '2px solid white' : 'none',
        boxShadow: selected 
          ? '0 0 0 1px rgba(0,0,0,0.1), 0 0 0 4px rgba(255,255,255,0.2)' 
          : '0 0 0 1px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.2s ease',
        opacity: dragging ? 0.7 : 1,
        transform: dragging ? 'scale(1.05)' : 'scale(1)',
        ...style,
      }}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  );
}

interface SortableColorSwatchProps extends ColorSwatchProps {
  id: number;
  disableDrag?: boolean;
}

function SortableColorSwatch(props: SortableColorSwatchProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.id,
    disabled: props.disableDrag,
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1001 : 'auto',
  };
  
  return (
    <div ref={setNodeRef} style={style}>
      <ColorSwatch
        {...props}
        listeners={listeners}
        attributes={attributes}
        dragging={isDragging}
      >
        {props.children}
      </ColorSwatch>
    </div>
  );
}

interface DeleteBinProps {
  isActive: boolean;
}

function DeleteBin({ isActive }: DeleteBinProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'bin',
  });
  
  const isHighlighted = isActive || isOver;
  
  return (
    <div 
      ref={setNodeRef}
      style={{ 
        width: 120,
        height: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isHighlighted ? '#ffeded' : '#fafafa',
        fontWeight: 600,
        fontSize: 18,
        borderRadius: 8,
        color : 'black',
        transition: 'all 0.2s',
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        top: 'calc(100% + 20px)',
      }}
    >
      🗑️ Bin
    </div>
  );
}

interface ColorBarProps {
  onColorSelect?: (color: string) => void;
}

export default function ColorBar({ onColorSelect }: ColorBarProps) {
  const [colorPresetList, setColorPresetList] = useState<string[]>(["#F11616", "#1B49FF", "#18D972"]);
  const [selectedColor, setSelectedColor] = useState<number>(0);
  const [openColorIndex, setOpenColorIndex] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [showBin, setShowBin] = useState<boolean>(false);
  const [binActive, setBinActive] = useState<boolean>(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from localStorage on mount - ONLY ONCE
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { colors, selected } = JSON.parse(saved);
        if (Array.isArray(colors) && colors.length > 0) {
          setColorPresetList(colors);
        }
        if (typeof selected === "number" && selected >= 0) {
          setSelectedColor(selected);
        }
      } catch (e) {
        console.error("Error loading color settings from localStorage", e);
      }
    }
    setIsInitialized(true);
  }, []); // Empty dependency array - run only once

  // Save to localStorage on change - ONLY after initialization
  useEffect(() => {
    if (!isInitialized) return;
    
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ colors: colorPresetList, selected: selectedColor })
      );
    } catch (e) {
      console.error("Error saving to localStorage", e);
    }
  }, [colorPresetList, selectedColor, isInitialized]);

  // Close color picker on outside click
  useEffect(() => {
    if (openColorIndex === null) return;
    
    function handleClickOutside(event: MouseEvent) {
      if (
        pickerRef.current &&
        event.target instanceof Node &&
        !pickerRef.current.contains(event.target)
      ) {
        setOpenColorIndex(null);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openColorIndex]);

  const handleColorChange = (value: string, index: number) => {
    const newColors = [...colorPresetList];
    newColors[index] = value;
    setColorPresetList(newColors);
    
    // If we're changing the currently selected color, notify parent immediately
    if (index === selectedColor && onColorSelect) {
      onColorSelect(value);
    }
  };

  const handleColorSelect = (index: number) => {
    // Only update if it's actually different
    if (index !== selectedColor) {
      setSelectedColor(index);
      // Notify parent immediately when selection changes
      if (onColorSelect && colorPresetList[index]) {
        onColorSelect(colorPresetList[index]);
      }
    }
  };

  const addColor = () => {
    const newColors = [...colorPresetList, "#FFFFFF"];
    setColorPresetList(newColors);
    const newIndex = newColors.length - 1;
    setSelectedColor(newIndex);
    // Notify parent of new color selection
    if (onColorSelect) {
      onColorSelect("#FFFFFF");
    }
  };

  // DnD Kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 500,
        tolerance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 500,
        tolerance: 5,
      },
    })
  );

  // DnD Kit handlers
  function handleDragStart(event: any) {
    setActiveId(Number(event.active.id));
    setShowBin(true);
  }

  function handleDragOver(event: any) {
    if (event.over && event.over.id === 'bin') {
      setBinActive(true);
    } else {
      setBinActive(false);
    }
  }

  function handleDragEnd(event: any) {
    setShowBin(false);
    setBinActive(false);
    setActiveId(null);

    const { active, over } = event;
    if (!over) return;

    // If dropped in bin
    if (over.id === 'bin') {
      if (colorPresetList.length <= 1) return;
      const idx = Number(active.id);
      const newColors = colorPresetList.filter((_, i) => i !== idx);
      setColorPresetList(newColors);
      
      let newSelectedIndex = selectedColor;
      if (selectedColor === idx) {
        newSelectedIndex = 0;
      } else if (selectedColor > idx) {
        newSelectedIndex = selectedColor - 1;
      }
      
      if (newSelectedIndex !== selectedColor) {
        setSelectedColor(newSelectedIndex);
        if (onColorSelect && newColors[newSelectedIndex]) {
          onColorSelect(newColors[newSelectedIndex]);
        }
      }
      return;
    }

    // Reorder
    const oldIndex = Number(active.id);
    const newIndex = Number(over.id);
    if (oldIndex !== newIndex) {
      const newColors = arrayMove(colorPresetList, oldIndex, newIndex);
      setColorPresetList(newColors);
      
      let newSelectedIndex = selectedColor;
      if (selectedColor === oldIndex) {
        newSelectedIndex = newIndex;
      } else if (selectedColor > oldIndex && selectedColor <= newIndex) {
        newSelectedIndex = selectedColor - 1;
      } else if (selectedColor < oldIndex && selectedColor >= newIndex) {
        newSelectedIndex = selectedColor + 1;
      }
      
      if (newSelectedIndex !== selectedColor) {
        setSelectedColor(newSelectedIndex);
      }
    }
  }

  return (
    <div style={{ padding: 4, position: 'relative' }} ref={containerRef}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={colorPresetList.map((_, i) => i)}
          strategy={rectSortingStrategy}
        >
          <Flex gap={"1rem"} align="center">
            {colorPresetList.map((color, index) => (
              <SortableColorSwatch
                key={index}
                id={index}
                color={color}
                index={index}
                selected={selectedColor === index}
                onClick={() => handleColorSelect(index)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setOpenColorIndex(index);
                }}
              >
                {/* Color Picker Panel */}
                {openColorIndex === index && (
                  <div
                    ref={pickerRef}
                    style={{
                      position: 'absolute',
                      top: '48px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      zIndex: 1000,
                      background: '#fff',
                      border: '1px solid #ddd',
                      borderRadius: 8,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      padding: 16,
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    <HexColorPicker
                      color={color}
                      onChange={value => handleColorChange(value, index)}
                    />
                    <div style={{ marginTop: 8, textAlign: 'center' }}>
                      <Button size="small" onClick={() => setOpenColorIndex(null)}>
                        Close
                      </Button>
                    </div>
                  </div>
                )}
              </SortableColorSwatch>
            ))}
            <Button 
              icon={<IoMdAdd color='white' />} 
              type="text" 
              onClick={addColor} 
              style={{ 
                fontWeight: 'black',
                fontSize: '24px',
                borderRadius: '100%',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px'
              }} 
            />
          </Flex>
        </SortableContext>
        
        {/* Bin for deleting */}
        {showBin && <DeleteBin isActive={binActive} />}
        
        {/* Drag Overlay for swatch */}
        <DragOverlay>
          {activeId !== null && (
            <ColorSwatch
              color={colorPresetList[activeId]}
              index={activeId}
              selected={false}
              dragging={true}
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}