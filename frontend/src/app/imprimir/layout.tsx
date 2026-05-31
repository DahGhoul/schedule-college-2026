import '@/app/globals.css';

export default function ImprimirLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-white m-0 p-0 antialiased">
        {children}
      </body>
    </html>
  );
}
