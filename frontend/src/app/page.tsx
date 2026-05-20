import Link from 'next/link';
import { Boton } from '@/components/ui/Boton';
import { 
  Calendar, 
  Users, 
  School, 
  ChevronRight, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  ShieldCheck,
  GraduationCap
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans selection:bg-[#003366] selection:text-white">
      {/* Navegación Minimalista */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#003366] rounded-xl flex items-center justify-center">
              <GraduationCap className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-black text-gray-900 tracking-tighter">UNT<span className="text-[#003366]/50">SISTEMAS</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-gray-500 uppercase tracking-widest">
            <a href="#beneficios" className="hover:text-[#003366] transition-colors">Beneficios</a>
            <a href="#roles" className="hover:text-[#003366] transition-colors">Roles</a>
            <Link href="/auth/login">
              <Boton className="bg-[#003366] hover:bg-[#002244] text-white px-8 rounded-full shadow-lg shadow-blue-900/20">
                Acceso Intranet
              </Boton>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section - Estilo "Ivy League" */}
      <section className="relative pt-40 pb-24 overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-slate-50 -z-10 rounded-l-[100px] hidden lg:block"></div>
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full text-[#003366] text-xs font-black uppercase tracking-[0.2em]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#003366] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#003366]"></span>
              </span>
              Sistema de Gestión Académica 2026
            </div>
            <h1 className="text-6xl md:text-7xl font-black text-gray-900 tracking-tighter leading-[0.9]">
              La ingeniería del <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#003366] to-blue-500">tiempo académico.</span>
            </h1>
            <p className="text-xl text-gray-500 leading-relaxed max-w-lg font-medium">
              Optimizamos la programación de horarios, ambientes y carga docente con algoritmos de vanguardia para la Escuela de Ingeniería de Sistemas.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/auth/login">
                <Boton className="w-full sm:w-auto h-16 px-10 bg-[#003366] hover:bg-[#002244] text-lg font-bold rounded-2xl shadow-2xl shadow-blue-900/30 flex items-center justify-center gap-3 group transition-all">
                  Comenzar ahora
                  <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                </Boton>
              </Link>
              <a href="#beneficios">
                <Boton variante="borde" className="w-full sm:w-auto h-16 px-10 border-2 border-gray-200 hover:border-[#003366] hover:text-[#003366] text-lg font-bold rounded-2xl transition-all">
                  Saber más
                </Boton>
              </a>
            </div>
            <div className="pt-8 flex items-center gap-6">
              <div className="flex -space-x-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-12 h-12 rounded-full border-4 border-white bg-slate-200 overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="avatar" />
                  </div>
                ))}
              </div>
              <div className="text-sm font-bold text-gray-500">
                <span className="text-gray-900">+50 Docentes</span> confían en nuestro sistema
              </div>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-tr from-[#FFD700]/20 to-transparent rounded-[3rem] blur-2xl"></div>
            <div className="relative bg-white border border-gray-100 rounded-[3rem] shadow-2xl overflow-hidden aspect-[4/5] lg:aspect-square flex items-center justify-center p-8 group">
              <img 
                src="/IMG_2293.jpeg" 
                alt="Escuela de Ingeniería de Sistemas" 
                className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#003366] via-transparent to-transparent opacity-60"></div>
              <div className="absolute bottom-10 left-10 right-10 p-8 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl text-white">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-2 bg-[#FFD700] rounded-lg">
                    <ShieldCheck className="text-[#003366] w-6 h-6" />
                  </div>
                  <span className="font-black uppercase tracking-widest text-xs">Garantía UNT</span>
                </div>
                <p className="text-lg font-bold leading-tight">"La eficiencia en la gestión académica es el pilar de nuestra excelencia educativa."</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Características / Beneficios */}
      <section id="beneficios" className="py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <h2 className="text-sm font-black text-[#003366] uppercase tracking-[0.3em]">Nuestras Capacidades</h2>
            <h3 className="text-5xl font-black text-gray-900 tracking-tighter">Diseñado para la alta complejidad académica.</h3>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Calendar, title: "Horarios Dinámicos", desc: "Algoritmos inteligentes que evitan cruces y optimizan el tiempo de docentes y alumnos." },
              { icon: Clock, title: "Ventanas de Atención", desc: "Priorización automática por categoría y antigüedad para un proceso de elección justo." },
              { icon: School, title: "Gestión de Espacios", desc: "Control total sobre laboratorios y aulas, asegurando el equipamiento adecuado por curso." }
            ].map((feature, i) => (
              <div key={i} className="bg-white p-10 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 border border-gray-100">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-[#003366] transition-colors">
                  <feature.icon className="text-[#003366] w-8 h-8 group-hover:text-white transition-colors" />
                </div>
                <h4 className="text-2xl font-black text-gray-900 mb-4">{feature.title}</h4>
                <p className="text-gray-500 font-medium leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#001f3f] py-20 text-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="space-y-4 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <School className="text-[#FFD700] w-8 h-8" />
              <span className="text-2xl font-black tracking-tighter">UNT SISTEMAS</span>
            </div>
            <p className="text-white/40 font-medium max-w-xs">Facultad de Ingeniería - Universidad Nacional de Trujillo</p>
          </div>
          <div className="flex gap-12 text-sm font-bold uppercase tracking-widest text-white/60">
            <a href="#" className="hover:text-[#FFD700] transition-colors">Privacidad</a>
            <a href="#" className="hover:text-[#FFD700] transition-colors">Soporte</a>
            <a href="#" className="hover:text-[#FFD700] transition-colors">Contacto</a>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-20 pt-8 border-t border-white/10 text-center text-white/20 text-xs font-bold uppercase tracking-widest">
          © {new Date().getFullYear()} Escuela de Ingeniería de Sistemas - UNT. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}