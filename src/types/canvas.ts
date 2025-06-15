export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  tool: 'pen' | 'eraser';
  points: Point[];
  color: string;
  width: number;
}

export interface CanvasObject {
  strokes: Stroke[];
  transform: {
    x: number;
    y: number;
    scale: number;
  };
}

export interface Page {
  id: string;
  objects: CanvasObject;
  backgroundImage?: string;
  backgroundPdf?: string;
}