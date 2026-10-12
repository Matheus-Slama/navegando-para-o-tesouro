import Link from 'next/link';
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
      <article className={styles.panel}>
        <Link className={styles.back} href="/">← Voltar ao menu</Link>
        <header>
          <p className={styles.subtitle}>Navegando para o Tesouro</p>
          <h1>Créditos</h1>
          <p>Quem criou as músicas e os recursos que fazem parte desta aventura.</p>
        </header>
        <section aria-labelledby="music-credits-title">
          <h2 id="music-credits-title">Músicas</h2>
          <div className={styles.grid}>
            {musicCredits.map((music) => (
              <section className={styles.card} key={music.title} aria-label={music.title}>
                <p className={styles.usage}>{music.usage}</p>
                <h3>{music.title}</h3>
                <p>{music.author}</p>
                {music.authorUrl && <a href={music.authorUrl} target="_blank" rel="noreferrer">Site do compositor</a>}
                <p>
                  Licença: <a href={music.licenseUrl} target="_blank" rel="noreferrer">{music.license}</a>
                </p>
                <a href={music.source} target="_blank" rel="noreferrer">Página original no OpenGameArt</a>
                <p className={styles.note}>{music.changes ?? 'Faixa original, sem alterações, reproduzida em loop.'}</p>
              </section>
            ))}
          </div>
        </section>
      </article>
    </main>
  );
}
