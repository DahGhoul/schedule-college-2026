import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold text-unt-primary">Sistema de Horarios UNT</h1>
      <p className="mt-4 text-lg">Escuela de Ingeniería de Sistemas</p>
      <Link
        href="/auth/login"
        className="mt-8 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Iniciar Sesión
      </Link>
    </main>
  );
}