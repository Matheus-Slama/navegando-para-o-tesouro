'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowRight, ChevronsRight, Minimize2 } from 'lucide-react';
import './GameHint.css';

const EDGES = { top: 'superior', right: 'direita', bottom: 'inferior', left: 'esquerda' };
const ROUTE_STYLES = [
  { value: 'arrows-white', label: 'Branca' },
  { value: 'arrows-black', label: 'Preta' },
  { value: 'chevrons', label: 'Chevron' }
];

/**
 * Painel flutuante dentro de um ancestral com position: relative.
 * title, children e footer aceitam conteúdo React e podem mudar a cada etapa.
 * minimized/onMinimizedChange permitem controlar a abertura externamente.
 * dock acompanha o jogo até o usuário escolher uma posição ao arrastar.
 * Personalize tamanho e limites pelas variáveis --game-hint-* no style/className.
 */
export function GameHint({
  title,
  children,
  footer,
  routeStyle,
  onChangeRouteStyle,
  label = 'Dica do jogo',
  dock = 'top-right',
  minimized,
  defaultMinimized = false,
  onMinimizedChange,
  className = '',
  style
}) {
  const id = useId();
  const boundsRef = useRef(null);
  const cardRef = useRef(null);
  const dragRef = useRef(null);
  const routeMenuRef = useRef(null);
  const routeButtonRef = useRef(null);
  const [routeMenuOpen, setRouteMenuOpen] = useState(false);
  const [localMinimized, setLocalMinimized] = useState(defaultMinimized);
  const [position, setPosition] = useState(null);
  const [dragging, setDragging] = useState(false);
  const isMinimized = minimized ?? localMinimized;

  useEffect(() => {
    if (!routeMenuOpen) return;
    function closeOutside(event) {
      if (!routeMenuRef.current?.contains(event.target)) setRouteMenuOpen(false);
    }
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [routeMenuOpen]);

  function constrain(next) {
    const bounds = boundsRef.current;
    const card = cardRef.current;
    return {
      x: Math.max(0, Math.min(next.x, Math.max(0, bounds.clientWidth - card.offsetWidth))),
      y: Math.max(0, Math.min(next.y, Math.max(0, bounds.clientHeight - card.offsetHeight)))
    };
  }

  // Reencaixa o painel ao girar a tela, mudar o conteúdo ou reabrir a dica.
  useEffect(() => {
    const bounds = boundsRef.current;
    const card = cardRef.current;
    const observer = new ResizeObserver(() => {
      setPosition((previous) => {
        if (!previous) return previous;
        const next = {
          x: Math.max(0, Math.min(previous.x, bounds.clientWidth - card.offsetWidth)),
          y: Math.max(0, Math.min(previous.y, bounds.clientHeight - card.offsetHeight))
        };
        return next.x === previous.x && next.y === previous.y ? previous : next;
      });
    });
    observer.observe(bounds);
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  function getPosition() {
    const bounds = boundsRef.current.getBoundingClientRect();
    const card = cardRef.current.getBoundingClientRect();
    return { x: card.left - bounds.left, y: card.top - bounds.top };
  }

  function startDrag(event) {
    if (!event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    const origin = getPosition();
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, origin };
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    setPosition(origin);
    setDragging(true);
  }

  function moveDrag(event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setPosition(constrain({
      x: drag.origin.x + event.clientX - drag.x,
      y: drag.origin.y + event.clientY - drag.y
    }));
  }

  function stopDrag(event) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function moveWithKeyboard(event) {
    const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (event.key === 'Home') {
      event.preventDefault();
      event.stopPropagation();
      setPosition(null);
      return;
    }
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    event.stopPropagation();
    const origin = getPosition();
    const distance = event.shiftKey ? 40 : 10;
    setPosition(constrain({ x: origin.x + direction[0] * distance, y: origin.y + direction[1] * distance }));
  }

  function toggleMinimized() {
    const next = !isMinimized;
    if (minimized === undefined) setLocalMinimized(next);
    onMinimizedChange?.(next);
  }

  return (
    <>
      <div className="game-hint-tools">
        <button
          className="game-hint__toggle"
          type="button"
          aria-label={`${isMinimized ? 'Mostrar' : 'Minimizar'} ${label.toLowerCase()}`}
          title={isMinimized ? 'Mostrar dica' : 'Minimizar dica'}
          aria-expanded={!isMinimized}
          aria-controls={`${id}-content`}
          onClick={toggleMinimized}
        >
          <Image src="/assets/game/ui/hint-lantern.png" alt="" width={1254} height={1254} sizes="44px" draggable={false} />
        </button>
        {onChangeRouteStyle && (
          <div className="game-hint__route-control" ref={routeMenuRef}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setRouteMenuOpen(false);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                setRouteMenuOpen(false);
                routeButtonRef.current?.focus();
              }
            }}
          >
            <button className="game-hint__route-toggle" ref={routeButtonRef} type="button"
              aria-label={`Escolher arestas: ${ROUTE_STYLES.find((option) => option.value === routeStyle)?.label}`}
              aria-expanded={routeMenuOpen} aria-controls={`${id}-routes`}
              onClick={() => setRouteMenuOpen((value) => !value)}
            >
              <Image src="/assets/game/ui/pirate-gear.png" alt="" width={64} height={64} sizes="36px" draggable={false} />
            </button>
            {routeMenuOpen && <div id={`${id}-routes`} className="game-hint__route-options" role="group" aria-label="Estilo das arestas">
              {ROUTE_STYLES.map((option) => <button key={option.value} type="button"
                aria-label={`Arestas: ${option.label}`}
                title={option.label}
                aria-pressed={routeStyle === option.value}
                onClick={() => {
                  onChangeRouteStyle(option.value);
                  setRouteMenuOpen(false);
                  routeButtonRef.current?.focus();
                }}
              >
                <span className="game-hint__route-preview" data-style={option.value}>
                  {option.value === 'chevrons' ? <ChevronsRight aria-hidden="true" size={24} /> : <ArrowRight aria-hidden="true" size={24} />}
                </span>
              </button>)}
            </div>}
          </div>
        )}
      </div>
    <div ref={boundsRef} className={`game-hint-layer ${className}`} style={style}>
      <aside
        ref={cardRef}
        hidden={isMinimized}
        className="game-hint"
        aria-label={label}
        data-dock={dock}
        data-minimized={isMinimized}
        data-dragging={dragging}
        style={position ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' } : undefined}
      >
        <span id={`${id}-move-help`} className="sr-only">Arraste pelas bordas. Com a borda focada, use as setas para mover e Home para voltar à posição inicial.</span>
        {Object.entries(EDGES).map(([edge, name]) => (
          <button
            key={edge}
            type="button"
            className="game-hint__drag-handle"
            data-edge={edge}
            tabIndex={edge === 'top' ? 0 : -1}
            aria-label={`Mover ${label.toLowerCase()} pela borda ${name}`}
            aria-describedby={`${id}-move-help`}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={stopDrag}
            onPointerCancel={stopDrag}
            onLostPointerCapture={stopDrag}
            onKeyDown={moveWithKeyboard}
          />
        ))}
        <div className="game-hint__panel">
          <header className="game-hint__header">
            <button
              className="game-hint__toggle"
              type="button"
              aria-label={`${isMinimized ? 'Mostrar' : 'Minimizar'} ${label.toLowerCase()}`}
              title={isMinimized ? 'Mostrar dica' : 'Minimizar dica'}
              aria-expanded={!isMinimized}
              aria-controls={`${id}-content`}
              onClick={toggleMinimized}
            >
              {isMinimized
                ? <Image src="/assets/game/ui/hint-lantern.png" alt="" width={1254} height={1254} sizes="44px" draggable={false} />
                : <Minimize2 aria-hidden="true" size={20} />}
            </button>
          </header>
          <div className="game-hint__content" id={`${id}-content`} hidden={isMinimized}>
            <div className="game-hint__body" aria-live="polite" aria-atomic="true">
              {title && <h2 className="game-hint__title">{title}</h2>}
              {children}
            </div>
            {footer && <footer className="game-hint__footer">{footer}</footer>}
          </div>
        </div>
      </aside>
    </div>
    </>
  );
}
