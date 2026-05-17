import { Providers } from './providers';
import './globals.css';

export const metadata = {
  title: 'Horarios UNT',
  description: 'Sistema de Gestión de Horarios - Escuela de Ingeniería de Sistemas',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}