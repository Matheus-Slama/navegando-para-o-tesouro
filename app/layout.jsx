import './globals.css';
import { Pirata_One } from 'next/font/google';

const pirataOne = Pirata_One({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pirate-base'
});

export const metadata = {
  title: 'Navegando para o Tesouro',
  applicationName: 'Navegando para o Tesouro',
  description: 'Jogo educativo para ensino do problema do caminho mínimo em grafos.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={pirataOne.variable}>
      <body>{children}</body>
    </html>
  );
}
