import './globals.css';

export const metadata = {
  title: 'Caminho ao Tesouro',
  description: 'Jogo educativo para ensino do problema do caminho mínimo em grafos.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
