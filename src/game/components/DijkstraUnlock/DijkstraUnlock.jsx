import Image from 'next/image';
import { GameModal } from '@/game/components/GameDialog/GameModal';
import './DijkstraUnlock.css';

export function DijkstraUnlock({ onContinue }) {
  return (
    <GameModal className="dijkstra-unlock" labelledBy="dijkstra-unlock-title" onClose={onContinue}>
      <Image src="/assets/game/ui/icon-dijkstra.svg" alt="" width={80} height={80} />
      <p className="dijkstra-unlock__eyebrow">Um novo poder foi revelado!</p>
      <h2 id="dijkstra-unlock-title">Você ganhou um poder especial!</h2>
      <p>Ao navegar por águas mais perigosas, você encontrou o mapa de um antigo capitão. Nele estava o segredo para descobrir as rotas mais baratas: o poder de Dijkstra!</p>
      <p>Use a bandeira destacada no mapa para aprender a comparar os custos das ilhas, passo a passo, e encontrar o melhor caminho até o tesouro.</p>
      <button type="button" onClick={onContinue}>Continuar aventura</button>
    </GameModal>
  );
}
