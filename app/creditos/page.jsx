import Link from 'next/link';
import Image from 'next/image';
import { Anchor, Compass, Feather, Music2 } from 'lucide-react';
import styles from './credits.module.css';

export const metadata = {
  title: 'Créditos | Navegando para o Tesouro',
};

const musicCredits = [
  {
    title: "A sailor's chant",
    author: 'Thimras',
    usage: 'Música do tutorial de Dijkstra',
    source: 'https://opengameart.org/content/a-sailors-chant',
    license: 'CC0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  },
  {
    title: 'Blackmoor Tides (Epic Pirate Battle Theme)',
    author: 'Matthew Pablo',
    authorUrl: 'https://www.matthewpablo.com/',
    usage: 'Música do mapa',
    changes: 'Convertida de WAV para OGG Vorbis para reduzir o download; reproduzida em loop.',
    source: 'https://opengameart.org/content/blackmoor-tides-epic-pirate-battle-theme',
    license: 'CC BY 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
  },
  {
    title: 'Treasure Hunter',
    author: 'TAD',
    usage: 'Música do menu',
    source: 'https://opengameart.org/content/treasure-hunter',
    license: 'CC0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  },
  {
    title: 'Pirate tavern loop',
    author: '©2017 Emma Andersson (Emma_MA)',
    usage: 'Música do tutorial',
    changes: 'Convertida de WAV para OGG Vorbis para reduzir o download; reproduzida em loop.',
    source: 'https://opengameart.org/content/pirate-tavern-loop',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  },
];

export default function CreditsPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
      <nav className={styles.topbar} aria-label="Navegação dos créditos">
        <Link className={styles.back} href="/">← Voltar ao menu</Link>
        <span className={styles.gameName}>Navegando para o Tesouro</span>
      </nav>
      <article className={styles.panel}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}><Anchor size={16} aria-hidden="true" /> Livro da tripulação · Vol. I</p>
            <h1>Créditos da<br />aventura<span aria-hidden="true">.</span></h1>
            <p className={styles.intro}>Nenhum capitão encontra o tesouro sozinho.<br />Este registro guarda os nomes que deram vida à nossa viagem.</p>
          </div>
          <div className={styles.emblem} aria-hidden="true">
            <Compass className={styles.compass} strokeWidth={0.6} />
            <Image src="/assets/game/ui/icon-highscore.png" alt="" width={1254} height={1254} sizes="(max-width: 600px) 72px, 200px" />
            <span>O verdadeiro tesouro<br />é quem navega conosco.</span>
          </div>
        </header>
        <div className={styles.body}>
          <aside className={styles.index} aria-label="Índice dos créditos">
            <Anchor className={styles.indexAnchor} size={42} strokeWidth={1} aria-hidden="true" />
            <span className={styles.indexCaption}>Carta de navegação</span>
            <a href="#music-credits-title"><span>01</span> Trilha sonora</a>
            <a href="#font-credits-title"><span>02</span> Tipografia</a>
            <p>Ventos favoráveis.<br />Ideias compartilhadas.<br />Uma aventura feita para aprender.</p>
            <span className={styles.seal} aria-hidden="true">NPT<br /><small>EST. MMXXVI</small></span>
          </aside>
          <div className={styles.entries}>
        <section aria-labelledby="music-credits-title">
          <div className={styles.sectionHeading}><Music2 size={24} aria-hidden="true" /><h2 id="music-credits-title">Os sons dos sete mares</h2></div>
          <p className={styles.sectionIntro}>Do porto às ilhas, uma música para cada parte da viagem.</p>
          <ol className={styles.trackList}>
            {musicCredits.map((music, index) => (
              <li className={styles.track} key={music.title}>
                <span className={styles.trackNumber} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <div>
                <p className={styles.usage}>{music.usage}</p>
                <h3>{music.title}</h3>
                <p className={styles.author}>Por {music.authorUrl ? <a href={music.authorUrl} target="_blank" rel="noreferrer">{music.author}</a> : music.author}</p>
                <div className={styles.trackLinks}>
                  <a href={music.source} target="_blank" rel="noreferrer">Página no OpenGameArt <span aria-hidden="true">↗</span></a>
                  <a href={music.licenseUrl} target="_blank" rel="noreferrer">Licença {music.license} <span aria-hidden="true">↗</span></a>
                </div>
                <p className={styles.note}>{music.changes ?? 'Faixa original, sem alterações, reproduzida em loop.'}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <section className={styles.fontSection} aria-labelledby="font-credits-title">
          <div className={styles.sectionHeading}><Feather size={24} aria-hidden="true" /><h2 id="font-credits-title">Letras de um velho mapa</h2></div>
          <div className={styles.fontCredit}>
            <span className={styles.fontSample} aria-hidden="true">Aa</span>
            <div>
              <h3>Pirata One</h3>
              <p>Por Rodrigo Fuenzalida e Nicolas Massi.</p>
              <p>A letra que acompanha a aventura, dos botões aos mapas.</p>
              <a href="/licenses/Pirata-One-OFL.txt">Ver licença SIL Open Font License</a>
            </div>
          </div>
        </section>
        </div>
        </div>
        <footer className={styles.footer}><span>Fim do registro. A aventura continua.</span><Link href="/">De volta ao porto <span aria-hidden="true">→</span></Link></footer>
      </article>
      </div>
    </main>
  );
}
