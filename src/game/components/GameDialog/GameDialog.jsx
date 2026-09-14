'use client';

import { useEffect, useRef } from 'react';
import './GameDialog.css';

// O dialog nativo mantém o foco dentro da janela e torna o fundo inerte.
export function GameDialog({ children, onClose, labelledBy, label, className = '' }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={`game-dialog ${className}`}
      aria-labelledby={labelledBy}
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault();
        onClose?.();
      }}
    >
      {children}
    </dialog>
  );
}
