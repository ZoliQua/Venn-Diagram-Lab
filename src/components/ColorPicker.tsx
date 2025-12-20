import { useState, useEffect, useRef, useCallback } from 'react';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void; // live preview
  onCommit: (color: string) => void; // confirmed
  label?: string;
}

export function ColorPicker({ value, onChange, onCommit, label }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentColor, setCurrentColor] = useState(value);
  const [originalColor, setOriginalColor] = useState(value);
  const [isDirty, setIsDirty] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Sync from props when element changes
  useEffect(() => {
    setCurrentColor(value);
    setOriginalColor(value);
    setIsDirty(false);
  }, [value]);

  const handleOpen = () => {
    setOriginalColor(currentColor);
    setIsDirty(false);
    setIsOpen(true);
  };

  const handleColorChange = (newColor: string) => {
    setCurrentColor(newColor);
    setIsDirty(newColor !== originalColor);
    onChange(newColor); // live preview on canvas
  };

  const handleSet = useCallback(() => {
    onCommit(currentColor);
    setOriginalColor(currentColor);
    setIsDirty(false);
    setIsOpen(false);
  }, [currentColor, onCommit]);

  const handleCancel = useCallback(() => {
    setCurrentColor(originalColor);
    onChange(originalColor); // revert preview
    setIsDirty(false);
    setIsOpen(false);
  }, [originalColor, onChange]);

  // Click outside handler
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        if (isDirty) {
          const keep = window.confirm('Save color change?');
          if (keep) {
            handleSet();
          } else {
            handleCancel();
          }
        } else {
          setIsOpen(false);
        }
      }
    };

    // Delay to avoid catching the opening click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isDirty, handleSet, handleCancel]);

  return (
    <div className="color-picker-wrapper" ref={panelRef}>
      <div className="color-picker-trigger" onClick={handleOpen}>
        <span className="color-picker-swatch" style={{ background: currentColor }} />
        <span className="color-picker-label">{label ?? currentColor}</span>
      </div>
      {isOpen && (
        <div className="color-picker-panel">
          <input
            type="color"
            value={currentColor}
            onChange={e => handleColorChange(e.target.value)}
            className="color-picker-input"
          />
          <div className="color-picker-hex">
            <input
              type="text"
              value={currentColor}
              onChange={e => {
                const v = e.target.value;
                if (/^#[0-9a-fA-F]{0,6}$/.test(v)) {
                  setCurrentColor(v);
                  setIsDirty(v !== originalColor);
                  if (v.length === 7) onChange(v);
                }
              }}
              className="color-picker-hex-input"
              spellCheck={false}
            />
          </div>
          <div className="color-picker-actions">
            <button className="btn btn-sm" onClick={handleCancel}>Cancel</button>
            <button className="btn btn-sm btn-primary" onClick={handleSet}>Set</button>
          </div>
        </div>
      )}
    </div>
  );
}
