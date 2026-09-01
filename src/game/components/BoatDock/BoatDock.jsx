import Image from 'next/image';
import { GAME_ASSETS } from '@/game/config/gameAssets';
import './BoatDock.css';

export function BoatDock({ boats, selectedStartId, onSelect }) {
  const raceStarted = Boolean(selectedStartId);
  return (
    <section className="boat-dock" aria-label="Escolha seu barco">
      {boats.map((boat) => {
        const selected = selectedStartId === boat.id;

        return (
          <button
            key={boat.id}
            type="button"
            className={`boat-dock__boat${selected ? ' is-selected' : ''}${raceStarted ? ' is-racing' : ''}`}
            data-graph-node-id={boat.id}
            data-graph-node-type="start"
            data-boat={boat.boat}
            aria-label={`Selecionar ${boat.label}`}
            aria-pressed={selected}
            onClick={() => onSelect(boat.id)}
          >
            <Image
              src={GAME_ASSETS.boats[boat.boat]}
              alt=""
              width={1254}
              height={1254}
              sizes="(max-width: 37.5rem) 25vw, 20vw"
              draggable="false"
            />
          </button>
        );
      })}
    </section>
  );
}
