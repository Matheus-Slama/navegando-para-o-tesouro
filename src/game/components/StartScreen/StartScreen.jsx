import './StartScreen.css';

export function StartScreen({ onStart, onTutorial }) {
  return (
    <section className="start-screen" aria-labelledby="start-screen-title">
      <div className="start-screen__frame">
      <picture className="start-screen__art">
        <source
          media="(min-width: 64rem) and (orientation: landscape)"
          srcSet="/assets/game/backgrounds/start-screen-wide.png"
        />
        <source
          media="(min-width: 37.5625rem)"
          srcSet="/assets/game/backgrounds/start-screen-portrait.png"
        />
        <img
          src="/assets/game/backgrounds/start-screen-tall.png"
          alt=""
          fetchPriority="high"
        />
      </picture>

      <div className="start-screen__content">
        <h1 id="start-screen-title" className="sr-only">
          Navegando para o Tesouro
        </h1>

        <button type="button" onClick={onTutorial}>
          Tutorial
        </button>

        <button type="button" onClick={onStart}>
          Iniciar jornada
        </button>
      </div>
      </div>
    </section>
  );
}
