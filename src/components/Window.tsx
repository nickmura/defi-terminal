'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';

interface WindowProps {
  id: string;
  title: string;
  children: ReactNode;
  initialPosition?: { x: number; y: number };
  initialSize?: { width: number; height: number };
  minSize?: { width: number; height: number };
  onClose?: () => void;
  onFocus?: () => void;
  zIndex?: number;
  isActive?: boolean;
}

export default function Window({
  id,
  title,
  children,
  initialPosition = { x: 100, y: 100 },
  initialSize = { width: 800, height: 600 },
  minSize = { width: 400, height: 300 },
  onClose,
  onFocus,
  zIndex = 1000,
  isActive = true
}: WindowProps) {
  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState(initialSize);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, initialX: 0, initialY: 0 });
  const [resizeDirection, setResizeDirection] = useState('');

  const windowRef = useRef<HTMLDivElement>(null);

  // Handle dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.window-header')) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
      onFocus?.();
    }
  };

  // Handle resizing
  const handleResizeMouseDown = (e: React.MouseEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
      initialX: position.x,
      initialY: position.y
    });
    onFocus?.();
  };

  // Mouse move handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = Math.max(0, Math.min(window.innerWidth - size.width, e.clientX - dragStart.x));
        const newY = Math.max(0, Math.min(window.innerHeight - size.height, e.clientY - dragStart.y));
        setPosition({ x: newX, y: newY });
      }

      if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        
        let newWidth = resizeStart.width;
        let newHeight = resizeStart.height;
        let newX = resizeStart.initialX;
        let newY = resizeStart.initialY;

        // Calculate new dimensions based on resize direction
        if (resizeDirection.includes('right')) {
          newWidth = Math.max(minSize.width, resizeStart.width + deltaX);
        }
        if (resizeDirection.includes('left')) {
          newWidth = Math.max(minSize.width, resizeStart.width - deltaX);
          newX = resizeStart.initialX + (resizeStart.width - newWidth);
        }
        if (resizeDirection.includes('bottom')) {
          newHeight = Math.max(minSize.height, resizeStart.height + deltaY);
        }
        if (resizeDirection.includes('top')) {
          newHeight = Math.max(minSize.height, resizeStart.height - deltaY);
          newY = resizeStart.initialY + (resizeStart.height - newHeight);
        }

        // Ensure window stays within viewport bounds
        newX = Math.max(0, Math.min(window.innerWidth - newWidth, newX));
        newY = Math.max(0, Math.min(window.innerHeight - newHeight, newY));

        setSize({ width: newWidth, height: newHeight });
        setPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeDirection('');
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, resizeStart, position, size, minSize, resizeDirection]);

  return (
    <div
      ref={windowRef}
      className="absolute bg-black border border-gray-800 shadow-2xl overflow-hidden"
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        zIndex: zIndex + (isActive ? 100 : 0),
        cursor: isDragging ? 'grabbing' : 'default'
      }}
      onClick={onFocus}
    >
      {/* Window Header */}
      <div
        className="window-header bg-gray-900 px-4 py-2 border-b border-gray-800 flex justify-between items-center cursor-grab"
        onMouseDown={handleMouseDown}
      >
        <span className="text-gray-100 text-sm font-medium select-none">{title}</span>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-200 font-bold text-lg w-6 h-6 flex items-center justify-center border border-gray-800 hover:border-gray-600 transition-colors"
          title="Close"
        >
          ×
        </button>
      </div>

      {/* Window Content */}
      <div className="flex-1 overflow-hidden" style={{ height: size.height - 40 }}>
        {children}
      </div>

      {/* Resize Handles */}
      {/* Corners - avoid title bar area (first 40px) */}
      <div
        className="absolute top-10 left-0 w-3 h-3 cursor-nw-resize hover:bg-gray-600 hover:opacity-50 transition-colors"
        onMouseDown={(e) => handleResizeMouseDown(e, 'top-left')}
      />
      <div
        className="absolute top-10 right-0 w-3 h-3 cursor-ne-resize hover:bg-gray-600 hover:opacity-50 transition-colors"
        onMouseDown={(e) => handleResizeMouseDown(e, 'top-right')}
      />
      <div
        className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize hover:bg-gray-600 hover:opacity-50 transition-colors"
        onMouseDown={(e) => handleResizeMouseDown(e, 'bottom-left')}
      />
      <div
        className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize hover:bg-gray-600 hover:opacity-50 transition-colors"
        onMouseDown={(e) => handleResizeMouseDown(e, 'bottom-right')}
      />

      {/* Edges - avoid title bar area */}
      <div
        className="absolute top-10 left-3 right-3 h-2 cursor-n-resize hover:bg-gray-600 hover:opacity-30 transition-colors"
        onMouseDown={(e) => handleResizeMouseDown(e, 'top')}
      />
      <div
        className="absolute bottom-0 left-3 right-3 h-2 cursor-s-resize hover:bg-gray-600 hover:opacity-30 transition-colors"
        onMouseDown={(e) => handleResizeMouseDown(e, 'bottom')}
      />
      <div
        className="absolute left-0 top-10 bottom-3 w-2 cursor-w-resize hover:bg-gray-600 hover:opacity-30 transition-colors"
        onMouseDown={(e) => handleResizeMouseDown(e, 'left')}
      />
      <div
        className="absolute right-0 top-10 bottom-3 w-2 cursor-e-resize hover:bg-gray-600 hover:opacity-30 transition-colors"
        onMouseDown={(e) => handleResizeMouseDown(e, 'right')}
      />
    </div>
  );
}