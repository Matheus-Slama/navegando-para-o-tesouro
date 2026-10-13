'use client';

import Image from 'next/image';

export function GameHintNavigation({
  index,
  total,
  onPrevious,
  onNext,
  nextDisabled = false,
  nextLabel = 'Próximo passo',
  nextTitle = 'Avançar (→)',
  keyboardShortcuts = false
}) {
  return (
    <nav className="game-hint__navigation" aria-label="Navegação do tutorial">
      <button
        className="game-hint__arrow game-hint__arrow--back"
        type="button"
        disabled={index === 0}
        aria-label="Passo anterior"
        aria-keyshortcuts={keyboardShortcuts ? 'ArrowLeft' : undefined}
        title="Voltar (←)"
        onClick={onPrevious}
      >
        <Image src="/assets/game/ui/icon-tutorial-arrow.png" alt="" width={1717} height={916} sizes="68px" draggable={false} />
      </button>
      <span aria-label={`Cena ${index + 1} de ${total}`}>{index + 1}/{total}</span>
      <button
        className="game-hint__arrow"
        type="button"
        disabled={nextDisabled}
        aria-label={nextLabel}
        aria-keyshortcuts={keyboardShortcuts ? 'ArrowRight' : undefined}
        title={nextTitle}
        onClick={onNext}
      >
        <Image src="/assets/game/ui/icon-tutorial-arrow.png" alt="" width={1717} height={916} sizes="68px" draggable={false} />
      </button>
    </nav>
  );
}
