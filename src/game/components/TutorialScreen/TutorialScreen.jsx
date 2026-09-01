'use client';

import { useState } from 'react';
import './TutorialScreen.css';

export function TutorialScreen({ steps, onFinish }) {
  const [index, setIndex] = useState(0);
  const current = steps[index];
  const isLast = index === steps.length - 1;

  function next() {
    if (isLast) {
      onFinish();
      return;
    }

    setIndex((value) => value + 1);
  }

  return (
    <section className="tutorial-screen">
      <article className="tutorial-screen__card">
        <span className="tutorial-screen__eyebrow">Tutorial fixo</span>
        <h1>{current.title}</h1>
        <p>{current.text}</p>

        <div className="tutorial-screen__progress">
          {steps.map((step, stepIndex) => (
            <span
              key={step.title}
              className={stepIndex <= index ? 'is-active' : ''}
              aria-hidden="true"
            />
          ))}
        </div>

        <div className="tutorial-screen__actions">
          {index > 0 && (
            <button type="button" className="tutorial-screen__secondary" onClick={() => setIndex(index - 1)}>
              Voltar
            </button>
          )}

          <button type="button" onClick={next}>
            {isLast ? 'Começar fase 1' : 'Próximo'}
          </button>
        </div>
      </article>
    </section>
  );
}
