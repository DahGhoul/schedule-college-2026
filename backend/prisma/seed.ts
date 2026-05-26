import { PrismaClient, TipoComponente, TipoCurso } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('=== INICIO DE SEMILLA DE HORARIOS ===');

  try {
    // ============================================================
    // 1. PERÍODO ACADÉMICO
    // ============================================================
    let periodo = await prisma.periodo_academico.findUnique({ where: { nombre: '2026-I' } });
    if (!periodo) {
      periodo = await prisma.periodo_academico.create({
        data: {
          nombre: '2026-I',
          fecha_inicio: new Date('2026-04-13'),
          fecha_fin: new Date('2026-08-08'),
          estado: 'ACTIVO',
          activo: true,
        },
      });
    }
    console.log('Período 2026-I ID:', periodo.id);

    // ============================================================
    // 2. CONFIGURACIONES DEL PERÍODO
    // ============================================================
    const restricciones = [
      { clave: 'FRANJA_INICIO', valor: '07:00' },
      { clave: 'FRANJA_FIN', valor: '22:00' },
      { clave: 'HORAS_MAX_DIARIAS', valor: '8' },
      { clave: 'BLOQUEO_ALMUERZO_INICIO', valor: '13:00' },
      { clave: 'BLOQUEO_ALMUERZO_FIN', valor: '15:00' },
    ];
    for (const r of restricciones) {
      await prisma.configuracion.upsert({
        where: { id_periodo_clave: { id_periodo: periodo.id, clave: r.clave } as any },
        update: { valor: r.valor },
        create: { id_periodo: periodo.id, clave: r.clave, valor: r.valor, tipo: 'TEXTO' },
      });
    }

    // ============================================================
    // 3. CICLOS 1-10
    // ============================================================
    const ciclosArr: any[] = [];
    for (let n = 1; n <= 10; n++) {
      const c = await prisma.ciclo.upsert({
        where: { id_periodo_numero: { id_periodo: periodo.id, numero: n } as any },
        update: { nombre: `Ciclo ${n}` },
        create: { numero: n, nombre: `Ciclo ${n}`, id_periodo: periodo.id },
      });
      ciclosArr.push(c);
    }

    // ============================================================
    // 4. USUARIOS ADMINISTRATIVOS
    // ============================================================
    console.log('Configurando usuarios administrativos...');
    const passHashDirector = await bcrypt.hash('Director123!', 12);
    const passHashAdmin = await bcrypt.hash('Admin123!', 12);
    const passHashSecretaria = await bcrypt.hash('Secretaria123!', 12);

    for (const a of [
      { email: 'director@unt.edu.pe', hash: passHashDirector, rol: 'DIRECTOR' },
      { email: 'admin@unt.edu.pe', hash: passHashAdmin, rol: 'ADMINISTRADOR' },
      { email: 'secretaria@unt.edu.pe', hash: passHashSecretaria, rol: 'SECRETARIA' },
    ]) {
      await prisma.usuario.upsert({
        where: { email: a.email },
        update: { hash_contrasena: a.hash, rol: a.rol, activo: true, id_docente: null },
        create: { email: a.email, hash_contrasena: a.hash, rol: a.rol, activo: true, id_docente: null },
      });
      console.log(`Usuario ${a.rol}: ${a.email}`);
    }

    // ============================================================
    // 5. AMBIENTES
    // ============================================================
    const ambientesCodigos = ['A-101', 'A-102', 'A-103', 'A-104', 'A-105', 'A-106'];
    const labsCodigos = ['LAB-1', 'LAB-2', 'LAB-3', 'LAB-4'];

    for (const codigo of ambientesCodigos) {
      await prisma.ambiente.upsert({
        where: { codigo },
        update: {},
        create: { codigo, tipo: 'AULA', capacidad: 40, piso: 1, activo: true },
      });
    }
    for (const codigo of labsCodigos) {
      await prisma.ambiente.upsert({
        where: { codigo },
        update: {},
        create: {
          codigo,
          tipo: 'LABORATORIO',
          capacidad: 18,
          piso: 1,
          equipamiento: '18 equipos, proyector y red de datos',
          activo: true,
        },
      });
    }

    // ============================================================
    // 6. DOCENTES (todos los que aparecen en los horarios)
    // ============================================================
    console.log('Configurando docentes...');

    const docentesDef = [
      // Ciclo I
      { nombres: 'Marcelino', apellidos: 'Torres Villanueva', email: 'mtorres@unt.edu.pe', modalidad: 'NOMBRADO', categoria: 'PRINCIPAL', antiguedad: 10 },
      { nombres: 'Alberto', apellidos: 'Mendoza de los Santos', email: 'amendoza@unt.edu.pe', modalidad: 'NOMBRADO', categoria: 'PRINCIPAL', antiguedad: 12 },
      { nombres: 'Paul', apellidos: 'Cotrina Castellanos', email: 'pcotrina@unt.edu.pe', modalidad: 'NOMBRADO', categoria: 'ASOCIADO', antiguedad: 8 },
      { nombres: 'Bertha', apellidos: 'Urteche Závaleta', email: 'burteche@unt.edu.pe', modalidad: 'NOMBRADO', categoria: 'ASOCIADO', antiguedad: 7 },
      { nombres: 'José Luis', apellidos: 'Ponte Béjarano', email: 'jponte@unt.edu.pe', modalidad: 'NOMBRADO', categoria: 'PRINCIPAL', antiguedad: 15 },
      { nombres: 'Jorge Luis', apellidos: 'Ríos Gonzales', email: 'jrios@unt.edu.pe', modalidad: 'NOMBRADO', categoria: 'ASOCIADO', antiguedad: 9 },
      { nombres: 'Segundo', apellidos: 'Guibar Obeso', email: 'sguibar@unt.edu.pe', modalidad: 'NOMBRADO', categoria: 'PRINCIPAL', antiguedad: 20 },
      { nombres: 'Miguel', apellidos: 'Ipanaque Zapata', email: 'mipanaque@unt.edu.pe', modalidad: 'NOMBRADO', categoria: 'ASOCIADO', antiguedad: 6 },
      { nombres: 'Martha', apellidos: 'Cardoso', email: 'mcardoso@unt.edu.pe', modalidad: 'NOMBRADO', categoria: 'ASOCIADO', antiguedad: 5 },
      // Ciclo III
      { nombres: 'Zoraida', apellidos: 'Vidal Melgarejo', email: 'zvidal@unt.edu.pe', modalidad: 'NOMBRADO', categoria: 'PRINCIPAL', antiguedad: 18 },
      { nombres: 'Everson David', apellidos: 'Agreda Gamboa', email: 'eagreda@unt.edu.pe', modalidad: 'NOMBRADO', categoria: 'ASOCIADO', antiguedad: 10 },
      { nombres: 'Juan Carlos', apellidos: 'Obando Roldán', email: 'jobando@unt.edu.pe', modalidad: 'NOMBRADO', categoria: 'ASOCIADO', antiguedad: 11 },
      { nombres: 'Marcos', apellidos: 'Ferrer Reyna', email: 'mferrer@unt.edu.pe', modalidad: 'NOMBRADO', categoria: 'PRINCIPAL', antiguedad: 14 },
      { nombres: 'Terresita', apellidos: 'Rojas García', email: 'trojas@unt.edu.pe', modalidad: 'NOMBRADO', categoria: 'PRINCIPAL', antiguedad: 16 },
      { nombres: 'Juan', apellidos: 'Carrascal Cabanillas', email: 'jcarrascal@unt.edu.pe', modalidad: 'NOMBRADO', categoria: 'ASOCIADO', antiguedad: 7 },
      { nombres: 'Vilma', apellidos: 'Mendez Gil', email: 'vmendez@unt.edu.pe', modalidad: 'NOMBRADO', categoria: 'ASOCIADO', antiguedad: 9 },
      { nombres: 'Sheyla Laura', apellidos: 'Escobedo Rodriguez', email: 'sescobedo@unt.edu.pe', modalidad: 'CONTRATADO', categoria: 'AUXILIAR', antiguedad: 3 },
      // Ciclo V
      { nombres: 'Luis Roy', apellidos: 'Chaul', email: 'lchaul@unt.edu.pe', modalidad: 'NOMBRADO', categoria: 'PRINCIPAL', antiguedad: 20 },
      { nombres: 'Robert Jerry', apellidos: 'Sánchez Ticona', email: 'rsanchez@unt.edu.pe', modalidad: 'NOMBRADO', categoria: 'ASOCIADO', antiguedad: 8 },
      { nombres: 'César', apellidos: 'Arellano Salazar', email: 'carellano@unt.edu.pe', modalidad: 'NOMBRADO', categoria: 'ASOCIADO', antiguedad: 9 },
      { nombres: 'Camilo', apellidos: 'Suárez Rebaza', email: 'csuarez@unt.edu.pe', modalidad: 'NOMBRADO', categoria: 'ASOCIADO', antiguedad: 12 },
      { nombres: 'Marcos', apellidos: 'Baca Lopez', email: 'mbaca@unt.edu.pe', modalidad: 'NOMBRADO', categoria: 'PRINCIPAL', antiguedad: 15 },
      { nombres: 'Ane', apellidos: 'Cuadra Mitzugarey', email: 'acuadra@unt.edu.pe', modalidad: 'NOMBRADO', categoria: 'ASOCIADO', antiguedad: 7 },
      // Ciclo VII
      { nombres: 'Juan Pedro', apellidos: 'Santos Fernández', email: 'jsantos@unt.edu.pe', modalidad: 'NOMBRADO', categoria: 'PRINCIPAL', antiguedad: 18 },
      { nombres: 'Ricardo', apellidos: 'Mendoza Rivera', email: 'rmendoza@unt.edu.pe', modalidad: 'NOMBRADO', categoria: 'PRINCIPAL', antiguedad: 14 },
      { nombres: 'Oscar Romel', apellidos: 'Alcántara Moreno', email: 'oalcantara@unt.edu.pe', modalidad: 'NOMBRADO', categoria: 'ASOCIADO', antiguedad: 10 },
      { nombres: 'Jhon', apellidos: 'Gonzales Vasquez', email: 'jgonzales@unt.edu.pe', modalidad: 'NOMBRADO', categoria: 'ASOCIADO', antiguedad: 6 },
      // Ciclo IX
      { nombres: 'José', apellidos: 'Gómez Ávila', email: 'jgomez@unt.edu.pe', modalidad: 'NOMBRADO', categoria: 'PRINCIPAL', antiguedad: 11 },
    ];

    const docenteMap: Record<string, any> = {};
    const hashDocente = await bcrypt.hash('Docente123!', 12);

    for (const def of docentesDef) {
      const doc = await prisma.docente.upsert({
        where: { email: def.email },
        update: {},
        create: {
          nombres: def.nombres,
          apellidos: def.apellidos,
          email: def.email,
          modalidad: def.modalidad,
          categoria: def.categoria,
          antiguedad: def.antiguedad,
          activo: true,
        },
      });
      docenteMap[def.email] = doc;

      await prisma.usuario.upsert({
        where: { email: def.email },
        update: { hash_contrasena: hashDocente, activo: true, rol: 'DOCENTE', id_docente: doc.id },
        create: { email: def.email, hash_contrasena: hashDocente, rol: 'DOCENTE', id_docente: doc.id, activo: true },
      });
    }

    // ============================================================
    // 7. CURSOS Y OFERTAS POR CICLO
    // ============================================================
    // Limpiar datos del período para re-crear
    await prisma.bloque_horario.deleteMany({ where: { id_periodo: periodo.id } });
    await prisma.asignacion_docente_componente.deleteMany({
      where: { componente: { oferta: { id_periodo: periodo.id } } } as any,
    });
    await prisma.grupo.deleteMany({
      where: { componente: { oferta: { id_periodo: periodo.id } } } as any,
    });
    await prisma.curso_componente.deleteMany({
      where: { oferta: { id_periodo: periodo.id } } as any,
    });
    await prisma.curso_oferta.deleteMany({ where: { id_periodo: periodo.id } });

    // ============================================================
    // Definición de ofertas con sus componentes
    // T=Teoría, P=Práctica, L=Laboratorio, G=Grupos de lab
    // ============================================================
    const ofertasDef = [
      // ── CICLO I ────────────────────────────────────────────────
      {
        ciclo: 1,
        codigo: 'IS001', nombre: 'Introducción a la Programación',
        creditos: 3,
        tipo: TipoCurso.REGULAR,
        T: 2, P: 0, L: 2, gruposLab: 2,
      },
      {
        ciclo: 1,
        codigo: 'IS002', nombre: 'Introducción a la Ing. de Sistemas',
        creditos: 3,
        tipo: TipoCurso.REGULAR,
        T: 1, P: 2, L: 0, gruposLab: 0,
      },
      {
        ciclo: 1,
        codigo: 'PS001', nombre: 'Desarrollo Personal',
        creditos: 2,
        tipo: TipoCurso.REGULAR,
        T: 2, P: 2, L: 0, gruposLab: 0,
      },
      {
        ciclo: 1,
        codigo: 'MA001', nombre: 'Desarrollo del Pens. Lógico Matemat.',
        creditos: 3,
        tipo: TipoCurso.REGULAR,
        T: 1, P: 4, L: 0, gruposLab: 0,
      },
      {
        ciclo: 1,
        codigo: 'LET001', nombre: 'Lectura Crítica y Redac. Textos Acad.',
        creditos: 2,
        tipo: TipoCurso.REGULAR,
        T: 2, P: 2, L: 0, gruposLab: 0,
      },
      {
        ciclo: 1,
        codigo: 'MA002', nombre: 'Introducción al Análisis Matemático',
        creditos: 3,
        tipo: TipoCurso.REGULAR,
        T: 2, P: 4, L: 0, gruposLab: 0,
      },
      {
        ciclo: 1,
        codigo: 'EST001', nombre: 'Estadística General',
        creditos: 2,
        tipo: TipoCurso.REGULAR,
        T: 2, P: 2, L: 0, gruposLab: 0,
      },
      // ── CICLO III ──────────────────────────────────────────────
      {
        ciclo: 3,
        codigo: 'IS101', nombre: 'Programación Orientada a Objetos II',
        creditos: 5,
        tipo: TipoCurso.REGULAR,
        T: 2, P: 1, L: 2, gruposLab: 3,
      },
      {
        ciclo: 3,
        codigo: 'IS102', nombre: 'Sistémica',
        creditos: 4,
        tipo: TipoCurso.REGULAR,
        T: 2, P: 1, L: 2, gruposLab: 3,
      },
      {
        ciclo: 3,
        codigo: 'IS103', nombre: 'Ingeniería Gráfica (e)',
        creditos: 3,
        tipo: TipoCurso.ELECTIVO,
        T: 1, P: 2, L: 2, gruposLab: 1,
      },
      {
        ciclo: 3,
        codigo: 'MA101', nombre: 'Matemática Aplicada',
        creditos: 3,
        tipo: TipoCurso.REGULAR,
        T: 1, P: 2, L: 2, gruposLab: 1,
      },
      {
        ciclo: 3,
        codigo: 'EST101', nombre: 'Estadística Aplicada',
        creditos: 5,
        tipo: TipoCurso.REGULAR,
        T: 2, P: 2, L: 2, gruposLab: 3,
      },
      {
        ciclo: 3,
        codigo: 'ADM101', nombre: 'Administración General',
        creditos: 2,
        tipo: TipoCurso.REGULAR,
        T: 2, P: 2, L: 0, gruposLab: 0,
      },
      {
        ciclo: 3,
        codigo: 'FIS101', nombre: 'Física Electrica (e)',
        creditos: 3,
        tipo: TipoCurso.ELECTIVO,
        T: 2, P: 2, L: 1, gruposLab: 1,
      },
      {
        ciclo: 3,
        codigo: 'PS101', nombre: 'Psicología Organizacional (e)',
        creditos: 2,
        tipo: TipoCurso.ELECTIVO,
        T: 2, P: 2, L: 0, gruposLab: 0,
      },
      // ── CICLO V ────────────────────────────────────────────────
      {
        ciclo: 5,
        codigo: 'IS201', nombre: 'Ingeniería de Datos I',
        creditos: 5,
        tipo: TipoCurso.REGULAR,
        T: 2, P: 1, L: 3, gruposLab: 3,
      },
      {
        ciclo: 5,
        codigo: 'IS202', nombre: 'Sistemas de Información',
        creditos: 5,
        tipo: TipoCurso.REGULAR,
        T: 2, P: 2, L: 3, gruposLab: 3,
      },
      {
        ciclo: 5,
        codigo: 'IS203', nombre: 'Transformación digital',
        creditos: 4,
        tipo: TipoCurso.REGULAR,
        T: 2, P: 0, L: 2, gruposLab: 3,
      },
      {
        ciclo: 5,
        codigo: 'IS204', nombre: 'Tecnología web',
        creditos: 5,
        tipo: TipoCurso.REGULAR,
        T: 1, P: 1, L: 2, gruposLab: 3,
      },
      {
        ciclo: 5,
        codigo: 'IS205', nombre: 'Arquitectura de computadoras',
        creditos: 3,
        tipo: TipoCurso.REGULAR,
        T: 1, P: 0, L: 2, gruposLab: 1,
      },
      {
        ciclo: 5,
        codigo: 'IS206', nombre: 'Teleinformática(e)',
        creditos: 3,
        tipo: TipoCurso.ELECTIVO,
        T: 1, P: 0, L: 2, gruposLab: 2,
      },
      {
        ciclo: 5,
        codigo: 'IND201', nombre: 'Investigación de Operaciones',
        creditos: 3,
        tipo: TipoCurso.REGULAR,
        T: 1, P: 2, L: 2, gruposLab: 1,
      },
      {
        ciclo: 5,
        codigo: 'CON201', nombre: 'Contabilidad Gerencial',
        creditos: 3,
        tipo: TipoCurso.REGULAR,
        T: 1, P: 2, L: 2, gruposLab: 1,
      },
      // ── CICLO VII ──────────────────────────────────────────────
      {
        ciclo: 7,
        codigo: 'IS301', nombre: 'Ingeniería de Software I',
        creditos: 4,
        tipo: TipoCurso.REGULAR,
        T: 2, P: 1, L: 3, gruposLab: 1,
      },
      {
        ciclo: 7,
        codigo: 'IS302', nombre: 'Redes y Comunicaciones I',
        creditos: 3,
        tipo: TipoCurso.REGULAR,
        T: 0, P: 1, L: 3, gruposLab: 3,
      },
      {
        ciclo: 7,
        codigo: 'IS303', nombre: 'Ingeniería de Software I',
        creditos: 3,
        tipo: TipoCurso.REGULAR,
        T: 1, P: 1, L: 2, gruposLab: 3,
      },
      {
        ciclo: 7,
        codigo: 'IS304', nombre: 'Negocios Electrónicos (e)',
        creditos: 2,
        tipo: TipoCurso.ELECTIVO,
        T: 2, P: 0, L: 0, gruposLab: 0,
      },
      {
        ciclo: 7,
        codigo: 'IS305', nombre: 'Gestión de Servicios de TI',
        creditos: 3,
        tipo: TipoCurso.REGULAR,
        T: 2, P: 2, L: 0, gruposLab: 0,
      },
      {
        ciclo: 7,
        codigo: 'IS306', nombre: 'Metodología de la Investigación Científica',
        creditos: 2,
        tipo: TipoCurso.REGULAR,
        T: 2, P: 2, L: 0, gruposLab: 0,
      },
      {
        ciclo: 7,
        codigo: 'IS307', nombre: 'Administración de Base de Datos',
        creditos: 4,
        tipo: TipoCurso.REGULAR,
        T: 1, P: 0, L: 3, gruposLab: 4,
      },
      {
        ciclo: 7,
        codigo: 'IS308', nombre: 'Planeamiento Estratégico de TI',
        creditos: 5,
        tipo: TipoCurso.REGULAR,
        T: 1, P: 2, L: 2, gruposLab: 4,
      },
      {
        ciclo: 7,
        codigo: 'IND301', nombre: 'Cadena de Suministros (e)',
        creditos: 2,
        tipo: TipoCurso.ELECTIVO,
        T: 2, P: 2, L: 0, gruposLab: 0,
      },
      // ── CICLO IX ───────────────────────────────────────────────
      {
        ciclo: 9,
        codigo: 'IS401', nombre: 'Tesis I',
        creditos: 3,
        tipo: TipoCurso.REGULAR,
        T: 2, P: 2, L: 2, gruposLab: 1,
      },
      {
        ciclo: 9,
        codigo: 'IS402', nombre: 'Analítica de Negocios',
        creditos: 3,
        tipo: TipoCurso.REGULAR,
        T: 0, P: 2, L: 0, gruposLab: 0,
      },
      {
        ciclo: 9,
        codigo: 'IS403', nombre: 'Auditoría Informática',
        creditos: 4,
        tipo: TipoCurso.REGULAR,
        T: 1, P: 2, L: 2, gruposLab: 2,
      },
      {
        ciclo: 9,
        codigo: 'IS404', nombre: 'Gestión de Proyectos de TI',
        creditos: 3,
        tipo: TipoCurso.REGULAR,
        T: 1, P: 2, L: 0, gruposLab: 0,
      },
      {
        ciclo: 9,
        codigo: 'IS405', nombre: 'Emprendimiento Tecnológico',
        creditos: 3,
        tipo: TipoCurso.REGULAR,
        T: 2, P: 0, L: 2, gruposLab: 2,
      },
      {
        ciclo: 9,
        codigo: 'IS406', nombre: 'Ingeniería Web',
        creditos: 4,
        tipo: TipoCurso.REGULAR,
        T: 1, P: 0, L: 3, gruposLab: 3,
      },
      {
        ciclo: 9,
        codigo: 'IS407', nombre: 'Computación en la Nube',
        creditos: 5,
        tipo: TipoCurso.REGULAR,
        T: 1, P: 1, L: 3, gruposLab: 3,
      },
      {
        ciclo: 9,
        codigo: 'IS408', nombre: 'Hackeo Ético (e)',
        creditos: 3,
        tipo: TipoCurso.ELECTIVO,
        T: 2, P: 0, L: 2, gruposLab: 2,
      },
    ];

    console.log('Creando cursos, ofertas y componentes...');

    for (const def of ofertasDef) {
      // Upsert curso
      const curso = await prisma.curso.upsert({
        where: { codigo: def.codigo },
        update: { nombre: def.nombre, creditos: def.creditos, activo: true },
        create: { nombre: def.nombre, codigo: def.codigo, creditos: def.creditos, activo: true },
      });

      const cicloObj = ciclosArr[def.ciclo - 1];

      // Crear oferta
      const oferta = await prisma.curso_oferta.create({
        data: {
          id_periodo: periodo.id,
          id_curso: curso.id,
          id_ciclo: cicloObj.id,
          tipo_curso: def.tipo,
          estado: 'BORRADOR',
        },
      });

      // Crear componentes según T/P/L
      // UNIFICACIÓN: T y P se suman en TEORIA (Teoría-Práctica)
      // LABORATORIO se multiplica por gruposLab
      const componentesDef: { tipo: TipoComponente; horasTotales: number; nGrupos: number; grupos: string[] }[] = [];

      if (def.T > 0 || def.P > 0) {
        componentesDef.push({ 
          tipo: TipoComponente.TEORIA, 
          horasTotales: (def.T + def.P), 
          nGrupos: 1,
          grupos: ['UNICO'] 
        });
      }
      
      if (def.L > 0) {
        const nGruposLab = def.gruposLab || 1;
        const codigos = nGruposLab > 1
          ? Array.from({ length: nGruposLab }, (_, i) => String.fromCharCode(65 + i))
          : ['UNICO'];
        
        componentesDef.push({ 
          tipo: TipoComponente.LABORATORIO, 
          horasTotales: (def.L * nGruposLab), 
          nGrupos: nGruposLab,
          grupos: codigos 
        });
      }

      for (const compDef of componentesDef) {
        const componente = await prisma.curso_componente.create({
          data: {
            id_oferta: oferta.id,
            tipo: compDef.tipo,
            horas_requeridas: compDef.horasTotales,
            permite_multi_docente: true,
          },
        });

        for (const codigo of compDef.grupos) {
          await prisma.grupo.create({
            data: {
              id_componente: componente.id,
              codigo,
              capacidad_maxima: compDef.tipo === TipoComponente.LABORATORIO ? 18 : 40,
              activo: true,
            },
          });
        }
      }

      console.log(`  ✓ [Ciclo ${def.ciclo}] ${def.nombre}`);
    }

    // ============================================================
    // 8. DISPONIBILIDAD DE DOCENTES Y AMBIENTES
    // ============================================================
    console.log('Configurando disponibilidad de docentes y ambientes...');

    const dias = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
    const horas = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];

    for (const doc of Object.values(docenteMap)) {
      await prisma.disponibilidad_docente.deleteMany({ where: { id_docente: doc.id } });
      await prisma.disponibilidad_docente.createMany({
        data: dias.flatMap((dia) =>
          horas.map((hora) => ({
            id_docente: doc.id,
            dia_semana: dia,
            hora_inicio: hora,
            hora_fin: `${String(parseInt(hora.slice(0, 2), 10) + 1).padStart(2, '0')}:00`,
            disponible: true,
          }))
        ),
      });
    }

    const todosAmbientes = await prisma.ambiente.findMany({ where: { activo: true } });
    for (const amb of todosAmbientes) {
      await prisma.disponibilidad_ambiente.deleteMany({ where: { id_ambiente: amb.id } });
      await prisma.disponibilidad_ambiente.createMany({
        data: dias.flatMap((dia) =>
          horas.map((hora) => ({
            id_ambiente: amb.id,
            dia_semana: dia,
            hora_inicio: hora,
            hora_fin: `${String(parseInt(hora.slice(0, 2), 10) + 1).padStart(2, '0')}:00`,
            disponible: true,
          }))
        ),
      });
    }

    console.log('=== SEMILLA DE HORARIOS COMPLETADA CON ÉXITO ===');
    console.log(`Total cursos creados: ${ofertasDef.length}`);
    console.log(`Total docentes configurados: ${docentesDef.length}`);
  } catch (error: any) {
    console.error('=== ERROR EN SEMILLA ===');
    console.error(error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });