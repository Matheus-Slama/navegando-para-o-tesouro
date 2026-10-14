import Link from 'next/link';
import Image from 'next/image';
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
        <Link className={styles.back} href="/">← Voltar ao menu</Link>
        <article className={styles.panel}>
          <header className={styles.header}>
            <Image src="/assets/game/ui/icon-highscore.png" alt="" width={1254} height={1254} sizes="64px" className={styles.treasure} />
            <h1>Créditos</h1>
            <p>Os talentos por trás da aventura.</p>
          </header>
          <section className={styles.section} aria-labelledby="developer-title">
            <h2 id="developer-title">Desenvolvimento</h2>
            <h3>Matheus Slama</h3>
            <p className={styles.author}>Desenvolvedor do jogo Navegando para o Tesouro.</p>
          </section>
          <section className={styles.section} aria-labelledby="music-title">
            <h2 id="music-title">Trilha sonora</h2>
            <ul className={styles.tracks}>
              {musicCredits.map((music) => (
                <li className={styles.track} key={music.title}>
                  <p className={styles.usage}>{music.usage}</p>
                  <h3>{music.title}</h3>
                  <p className={styles.author}>Por {music.authorUrl ? <a href={music.authorUrl} target="_blank" rel="noreferrer">{music.author}</a> : music.author}</p>
                  <div className={styles.links}>
                    <a href={music.source} target="_blank" rel="noreferrer">OpenGameArt ↗</a>
                    <a href={music.licenseUrl} target="_blank" rel="noreferrer">{music.license} ↗</a>
                  </div>
                  {music.changes && <p className={styles.note}>{music.changes}</p>}
                </li>
              ))}
            </ul>
          </section>
          <section className={styles.section} aria-labelledby="font-title">
            <h2 id="font-title">Fonte</h2>
            <div className={styles.font}>
              <span aria-hidden="true">Aa</span>
              <div>
                <h3>Pirata One</h3>
                <p className={styles.author}>Por Rodrigo Fuenzalida e Nicolas Massi.</p>
                <a href="/licenses/Pirata-One-OFL.txt">SIL Open Font License ↗</a>
              </div>
            </div>
          </section>
          <footer className={styles.footer}>Navegando para o Tesouro</footer>
        </article>
      </div>
    </main>
  );
}
