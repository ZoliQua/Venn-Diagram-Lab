import { useState, useEffect, useRef } from 'react';

interface TextEditDialogProps {
  isOpen: boolean;
  elementId: string;
  currentContent: string;
  onConfirm: (id: string, newContent: string) => void;
  onCancel: () => void;
}

export function TextEditDialog({ isOpen, elementId, currentContent, onConfirm, onCancel }: TextEditDialogProps) {
  const [value, setValue] = useState(currentContent);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(currentContent);
  }, [currentContent, elementId]);

  useEffect(() => {
    if (isOpen) {
      // Focus and select on open
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(elementId, value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
    // Prevent editor shortcuts while dialog is open
    e.stopPropagation();
  };

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog" onClick={e => e.stopPropagation()}>
        <div className="dialog-title">Edit Text</div>
        <div className="dialog-body">
          <div className="dialog-field">
            <label>ID</label>
            <span className="dialog-id">{elementId}</span>
          </div>
          <div className="dialog-field">
            <label>Content</label>
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="dialog-input"
            />
          </div>
        </div>
        <div className="dialog-actions">
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={handleConfirm}>OK</button>
        </div>
      </div>
    </div>
  );
}
