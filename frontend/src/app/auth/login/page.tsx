'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { Boton } from '@/components/ui/Boton';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { NotificacionToast } from '@/components/ui/NotificacionToast';
import { School, Lock, Mail, ChevronRight, GraduationCap } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const router = useRouter();
  const { iniciarSesion, estaAutenticado, token, cargarSesion } = useAuthStore();

  const redirigirSegunRol = () => {
    const rol = useAuthStore.getState().usuario?.rol;
    if (rol === 'DOCENTE') {
      router.push('/dashboard/docente');
    } else if (rol === 'DIRECTOR' || rol === 'ADMINISTRADOR' || rol === 'SECRETARIA') {
      router.push('/dashboard/admin');
    } else {
      router.push('/dashboard');
    }
  };

  useEffect(() => {
    if (token) {
      if (!estaAutenticado) {
        cargarSesion().then(() => {
          if (useAuthStore.getState().estaAutenticado) {
            redirigirSegunRol();
          }
        });
      } else {
        redirigirSegunRol();
      }
    }
  }, [token, estaAutenticado, router, cargarSesion]);

  const manejarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      await iniciarSesion(email, password);
      redirigirSegunRol();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans">
      {/* Lado Izquierdo: Visual Institucional (Estilo Colegio Americano/Ivy League) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#001f3f] overflow-hidden">
        {/* Imagen de fondo con overlay elegante */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-overlay scale-110"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1541339907198-e087563f028e?q=80&w=2070&auto=format&fit=crop')" }}
        ></div>
        
        {/* Patrón de líneas decorativas */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "40px 40px" }}></div>

        <div className="relative z-10 w-full flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
              <School className="text-[#FFD700] w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">UNT | Sistemas</h2>
              <p className="text-xs text-white/60 font-medium uppercase tracking-widest">Excelencia Académica</p>
            </div>
          </div>

          <div className="max-w-md">
            <div className="w-20 h-1 bg-[#FFD700] mb-8"></div>
            <h1 className="text-5xl font-extrabold tracking-tighter leading-none mb-6">
              Haciendo del futuro <br />
              <span className="text-[#FFD700]">nuestra historia.</span>
            </h1>
            <p className="text-lg text-white/80 leading-relaxed font-light">
              Plataforma integral de gestión de horarios y recursos académicos para la Escuela de Ingeniería de Sistemas.
            </p>
          </div>

          <div className="flex items-center gap-8 text-sm font-medium text-white/50 uppercase tracking-widest">
            <span>© {new Date().getFullYear()} UNT</span>
            <div className="w-1 h-1 bg-white/20 rounded-full"></div>
            <span>Trujillo, Perú</span>
          </div>
        </div>
      </div>

      {/* Lado Derecho: Formulario de Login */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 sm:p-12 lg:p-20 bg-slate-50/50">
        <div className="w-full max-w-md space-y-10">
          <div className="text-center lg:text-left space-y-2">
            <div className="lg:hidden flex justify-center mb-8">
              <div className="w-16 h-16 bg-[#003366] rounded-2xl flex items-center justify-center shadow-xl shadow-blue-900/20">
                <GraduationCap className="text-white w-10 h-10" />
              </div>
            </div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Acceso Institucional</h2>
            <p className="text-gray-500 font-medium">Por favor, ingrese sus credenciales autorizadas.</p>
          </div>

          <div className="bg-white p-8 sm:p-10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100">
            <form className="space-y-6" onSubmit={manejarSubmit}>
              <div className="space-y-4">
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#003366] transition-colors">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="Correo Institucional"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] text-gray-900 placeholder:text-gray-400 transition-all outline-none"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#003366] transition-colors">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="Contraseña"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] text-gray-900 placeholder:text-gray-400 transition-all outline-none"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl flex items-center gap-3 text-red-700 text-sm font-medium">
                  <span className="shrink-0 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                  {error}
                </div>
              )}

              <Boton 
                type="submit" 
                disabled={cargando} 
                className="w-full py-4 bg-[#003366] hover:bg-[#002244] text-white font-bold rounded-2xl shadow-xl shadow-blue-900/20 transition-all duration-300 flex items-center justify-center gap-2 group"
              >
                {cargando ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Verificando...
                  </span>
                ) : (
                  <>
                    Entrar al Sistema
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Boton>

              <div className="pt-4 flex flex-col items-center gap-4">
                <Link href="/auth/recuperar-password" title="Recuperar acceso" className="text-sm font-bold text-[#003366] hover:text-blue-800 transition-colors">
                  ¿Olvidó su contraseña?
                </Link>
                <div className="w-10 h-px bg-gray-200"></div>
                <Link href="/" className="text-xs font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-colors flex items-center gap-2">
                  Volver al inicio
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}