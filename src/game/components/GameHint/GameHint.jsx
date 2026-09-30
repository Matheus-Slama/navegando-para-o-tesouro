'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowRight, ChevronsRight } from 'lucide-react';
import './GameHint.css';

const EDGES = { top: 'superior', right: 'direita', bottom: 'inferior', left: 'esquerda' };
const CORNERS = { 'top-left': 'superior esquerdo', 'top-right': 'superior direito', 'bottom-left': 'inferior esquerdo', 'bottom-right': 'inferior direito' };
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
  onDijkstraTutorial,
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
  const resizeRef = useRef(null);
  const routeMenuRef = useRef(null);
  const routeButtonRef = useRef(null);
  const [routeMenuOpen, setRouteMenuOpen] = useState(false);
  const [localMinimized, setLocalMinimized] = useState(defaultMinimized);
  const [position, setPosition] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [size, setSize] = useState(null);
  const [resizing, setResizing] = useState(false);
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
    const maxX = Math.max(0, bounds.clientWidth - card.offsetWidth);
    return {
      x: Math.max(0, Math.min(next.x, maxX)),
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

  function resizeFrom(origin, corner, dx, dy) {
    const bounds = boundsRef.current;
    const fromLeft = corner.endsWith('left');
    const fromTop = corner.startsWith('top');
    const right = origin.x + origin.width;
    const bottom = origin.y + origin.height;
    const maxWidth = fromLeft ? right : bounds.clientWidth - origin.x;
    const maxHeight = fromTop ? bottom : bounds.clientHeight - origin.y;
    const width = Math.max(Math.min(140, maxWidth), Math.min(maxWidth, origin.width + (fromLeft ? -dx : dx)));
    const height = Math.max(Math.min(80, origin.height, maxHeight), Math.min(maxHeight, origin.height + (fromTop ? -dy : dy)));
    setPosition({ x: fromLeft ? right - width : origin.x, y: fromTop ? bottom - height : origin.y });
    const scale = origin.scale * Math.sqrt((width * height) / (origin.width * origin.height));
    setSize({ width, height, '--game-hint-scale': scale });
  }

  function getResizeOrigin() {
    return {
      ...getPosition(), width: cardRef.current.offsetWidth, height: cardRef.current.offsetHeight,
      scale: Number.parseFloat(getComputedStyle(cardRef.current).getPropertyValue('--game-hint-scale')) || 1
    };
  }

  function startResize(event) {
    if (!event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    resizeRef.current = {
      pointerId: event.pointerId, x: event.clientX, y: event.clientY,
      corner: event.currentTarget.dataset.corner, origin: getResizeOrigin()
    };
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    setResizing(true);
  }

  function moveResize(event) {
    const resize = resizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;
    resizeFrom(resize.origin, resize.corner, event.clientX - resize.x, event.clientY - resize.y);
  }

  function stopResize(event) {
    if (resizeRef.current?.pointerId !== event.pointerId) return;
    resizeRef.current = null;
    setResizing(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function resizeWithKeyboard(event) {
    const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (event.key === 'Home') {
      event.preventDefault();
      event.stopPropagation();
      setSize(null);
      return;
    }
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    event.stopPropagation();
    const distance = event.shiftKey ? 40 : 10;
    resizeFrom(getResizeOrigin(), event.currentTarget.dataset.corner, direction[0] * distance, direction[1] * distance);
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
        {onDijkstraTutorial && (
          <button className="game-hint__route-toggle game-hint__dijkstra-toggle" type="button"
            aria-label="Abrir tutorial de Dijkstra" title="Tutorial de Dijkstra"
            onClick={() => {
              setRouteMenuOpen(false);
              onDijkstraTutorial();
            }}
          >
            <Image src="/assets/game/ui/dijkstra-pirate-flag.svg" alt="" width={64} height={64} sizes="36px" draggable={false} />
          </button>
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
        data-resizing={resizing}
        style={{
          ...size,
          // Ao soltar o canto, ajusta a altura ao conteúdo sem mudar sua escala.
          height: resizing ? size?.height : 'auto',
          ...(position ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' } : {})
        }}
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
        <span id={`${id}-resize-help`} className="sr-only">Arraste pelos cantos para redimensionar. Com um canto focado, use as setas para ajustar o tamanho e Home para restaurar o tamanho inicial.</span>
        {Object.entries(CORNERS).map(([corner, name]) => (
          <button
            key={corner}
            type="button"
            className="game-hint__resize-handle"
            data-corner={corner}
            aria-label={`Redimensionar ${label.toLowerCase()} pelo canto ${name}`}
            aria-describedby={`${id}-resize-help`}
            onPointerDown={startResize}
            onPointerMove={moveResize}
            onPointerUp={stopResize}
            onPointerCancel={stopResize}
            onLostPointerCapture={stopResize}
            onKeyDown={resizeWithKeyboard}
          />
        ))}
        <div className="game-hint__panel">
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
