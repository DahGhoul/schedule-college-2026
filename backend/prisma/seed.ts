import { PrismaClient, TipoComponente, TipoCurso } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- INICIO DE SEMILLA ---');
  try {
    const pExistente = await prisma.periodo_academico.findUnique({ where: { nombre: '2026-I' } });
    let periodo;
    if (pExistente) {
      periodo = pExistente;
    } else {
      periodo = await prisma.periodo_academico.create({
        data: {
          nombre: '2026-I',
          fecha_inicio: new Date('2026-06-08'),
          fecha_fin: new Date('2026-10-30'),
          estado: 'ACTIVO',
          activo: true,
        }
      });
    }
    console.log('Período configurado ID:', periodo.id);

  const restricciones = [
    { clave: 'FRANJA_INICIO', valor: '07:00' },
    { clave: 'FRANJA_FIN', valor: '22:00' },
    { clave: 'HORAS_MAX_DIARIAS', valor: '8' },
    { clave: 'BLOQUEO_ALMUERZO_INICIO', valor: '13:00' },
    { clave: 'BLOQUEO_ALMUERZO_FIN', valor: '15:00' },
  ];

  for (const restriccion of restricciones) {
    await prisma.configuracion.upsert({
      where: { id_periodo_clave: { id_periodo: periodo.id, clave: restriccion.clave } as any },
      update: { valor: restriccion.valor, tipo: 'TEXTO' },
      create: { id_periodo: periodo.id, clave: restriccion.clave, valor: restriccion.valor, tipo: 'TEXTO' },
    });
  }

  const ciclos: any[] = [];
  for (let n = 1; n <= 10; n++) {
    const c = await prisma.ciclo.upsert({
      where: { id_periodo_numero: { id_periodo: periodo.id, numero: n } as any },
      update: { nombre: `Ciclo ${n}` },
      create: { numero: n, nombre: `Ciclo ${n}`, id_periodo: periodo.id },
    });
    ciclos.push(c);
  }

  const docente1 = await prisma.docente.upsert({
    where: { email: 'jperez@unt.edu.pe' },
    update: {},
    create: {
      nombres: 'Juan',
      apellidos: 'Pérez Gómez',
      email: 'jperez@unt.edu.pe',
      telefono: '999000111',
      modalidad: 'NOMBRADO',
      categoria: 'PRINCIPAL',
      antiguedad: 15,
      activo: true,
    },
  });

  const docente2 = await prisma.docente.upsert({
    where: { email: 'psanchez@unt.edu.pe' },
    update: {},
    create: {
      nombres: 'Pedro',
      apellidos: 'Sánchez López',
      email: 'psanchez@unt.edu.pe',
      modalidad: 'NOMBRADO',
      categoria: 'ASOCIADO',
      antiguedad: 10,
      activo: true,
    },
  });

  const docente3 = await prisma.docente.upsert({
    where: { email: 'mrojas@unt.edu.pe' },
    update: {},
    create: {
      nombres: 'Mariana',
      apellidos: 'Rojas Castillo',
      email: 'mrojas@unt.edu.pe',
      telefono: '999000333',
      modalidad: 'CONTRATADO',
      categoria: 'AUXILIAR',
      antiguedad: 6,
      activo: true,
    },
  });

  const docente4 = await prisma.docente.upsert({
    where: { email: 'lgarcia@unt.edu.pe' },
    update: {},
    create: {
      nombres: 'Lucía',
      apellidos: 'García Torres',
      email: 'lgarcia@unt.edu.pe',
      telefono: '999000444',
      modalidad: 'NOMBRADO',
      categoria: 'JEFE_PRACTICA',
      antiguedad: 8,
      activo: true,
    },
  });

  const curso1 = await prisma.curso.upsert({
    where: { codigo: 'IS101' },
    update: { nombre: 'Programación I', creditos: 4, activo: true },
    create: { nombre: 'Programación I', codigo: 'IS101', creditos: 4, activo: true },
  });

  const curso2 = await prisma.curso.upsert({
    where: { codigo: 'IS201' },
    update: { nombre: 'Estructura de Datos', creditos: 4, activo: true },
    create: { nombre: 'Estructura de Datos', codigo: 'IS201', creditos: 4, activo: true },
  });

  const curso3 = await prisma.curso.upsert({
    where: { codigo: 'MA101' },
    update: { nombre: 'Matemática Discreta', creditos: 4, activo: true },
    create: { nombre: 'Matemática Discreta', codigo: 'MA101', creditos: 4, activo: true },
  });

  const curso4 = await prisma.curso.upsert({
    where: { codigo: 'BD201' },
    update: { nombre: 'Base de Datos', creditos: 4, activo: true },
    create: { nombre: 'Base de Datos', codigo: 'BD201', creditos: 4, activo: true },
  });

  const curso5 = await prisma.curso.upsert({
    where: { codigo: 'SI301' },
    update: { nombre: 'Ingeniería de Software', creditos: 3, activo: true },
    create: { nombre: 'Ingeniería de Software', codigo: 'SI301', creditos: 3, activo: true },
  });

  const curso6 = await prisma.curso.upsert({
    where: { codigo: 'AR401' },
    update: { nombre: 'Arquitectura de Redes', creditos: 4, activo: true },
    create: { nombre: 'Arquitectura de Redes', codigo: 'AR401', creditos: 4, activo: true },
  });

  await prisma.bloque_horario.deleteMany({ where: { id_periodo: periodo.id } });
  await prisma.asignacion_docente_componente.deleteMany({ where: { componente: { oferta: { id_periodo: periodo.id } } } as any });
  await prisma.grupo.deleteMany({ where: { componente: { oferta: { id_periodo: periodo.id } } } as any });
  await prisma.curso_componente.deleteMany({ where: { oferta: { id_periodo: periodo.id } } as any });
  await prisma.curso_oferta.deleteMany({ where: { id_periodo: periodo.id } });

  const ofertasDef = [
    {
      curso: curso1,
      ciclo: ciclos[0],
      tipo: TipoCurso.REGULAR,
      horas: { TEORIA: 4, PRACTICA: 2, LABORATORIO: 2 },
      docente: docente1,
      gruposLab: ['A', 'B'],
    },
    {
      curso: curso2,
      ciclo: ciclos[1],
      tipo: TipoCurso.REGULAR,
      horas: { TEORIA: 4, PRACTICA: 0, LABORATORIO: 2 },
      docente: docente2,
      gruposLab: ['A', 'B'],
    },
    {
      curso: curso3,
      ciclo: ciclos[0],
      tipo: TipoCurso.REGULAR,
      horas: { TEORIA: 4, PRACTICA: 2, LABORATORIO: 0 },
      docente: docente3,
      gruposLab: [],
    },
    {
      curso: curso4,
      ciclo: ciclos[0],
      tipo: TipoCurso.REGULAR,
      horas: { TEORIA: 3, PRACTICA: 2, LABORATORIO: 2 },
      docente: docente4,
      gruposLab: ['A', 'B'],
    },
    {
      curso: curso5,
      ciclo: ciclos[0],
      tipo: TipoCurso.REGULAR,
      horas: { TEORIA: 3, PRACTICA: 2, LABORATORIO: 0 },
      docente: docente1,
      gruposLab: [],
    },
    {
      curso: curso6,
      ciclo: ciclos[0],
      tipo: TipoCurso.REGULAR,
      horas: { TEORIA: 3, PRACTICA: 0, LABORATORIO: 4 },
      docente: docente2,
      gruposLab: ['A', 'B'],
    },
  ] as const;

  for (const def of ofertasDef) {
    const oferta = await prisma.curso_oferta.create({
      data: {
        id_periodo: periodo.id,
        id_curso: def.curso.id,
        id_ciclo: def.ciclo.id,
        tipo_curso: def.tipo,
        estado: 'BORRADOR',
      },
    });

    const componentes: Array<{ tipo: TipoComponente; horas: number }> = [
      { tipo: TipoComponente.TEORIA, horas: def.horas.TEORIA },
      { tipo: TipoComponente.PRACTICA, horas: def.horas.PRACTICA },
      { tipo: TipoComponente.LABORATORIO, horas: def.horas.LABORATORIO },
    ];

    for (const comp of componentes) {
      if (comp.horas <= 0) continue;

      const componente = await prisma.curso_componente.create({
        data: {
          id_oferta: oferta.id,
          tipo: comp.tipo,
          horas_requeridas: comp.horas,
          permite_multi_docente: false,
        },
      });

      const grupos = comp.tipo === TipoComponente.LABORATORIO && def.gruposLab.length > 0 ? def.gruposLab : ['UNICO'];
      for (const codigo of grupos) {
        await prisma.grupo.create({
          data: {
            id_componente: componente.id,
            codigo,
            capacidad_maxima: comp.tipo === TipoComponente.LABORATORIO ? 18 : 40,
            activo: true,
          },
        });
      }

      const totalHoras = comp.horas * grupos.length;
      await prisma.asignacion_docente_componente.create({
        data: {
          id_componente: componente.id,
          id_docente: def.docente.id,
          horas_asignadas: totalHoras,
        },
      });
    }
  }

  const aulas: any[] = [];
  for (const codigo of ['A-101', 'A-102', 'A-103', 'A-104', 'A-105', 'A-106']) {
    const aula = await prisma.ambiente.upsert({
      where: { codigo },
      update: {},
      create: { codigo, tipo: 'AULA', capacidad: 40, piso: 1, activo: true },
    });
    aulas.push(aula);
  }

  const laboratorios: any[] = [];
  for (const codigo of ['LAB-1', 'LAB-2', 'LAB-3', 'LAB-4']) {
    const laboratorio = await prisma.ambiente.upsert({
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
    laboratorios.push(laboratorio);
  }

  const dias = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
  const horasDocente = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];
  for (const docente of [docente1, docente2, docente3, docente4]) {
    await prisma.disponibilidad_docente.deleteMany({ where: { id_docente: docente.id } });
    await prisma.disponibilidad_docente.createMany({
      data: dias.flatMap((dia) =>
        horasDocente.map((hora) => ({
          id_docente: docente.id,
          dia_semana: dia,
          hora_inicio: hora,
          hora_fin: `${String(parseInt(hora.slice(0, 2), 10) + 1).padStart(2, '0')}:00`,
          disponible: !(dia === 'MIERCOLES' && hora === '11:00' && docente.id === docente2.id),
        }))
      ),
    });
  }

  const horasAmbiente = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];
  for (const ambiente of [...aulas, ...laboratorios]) {
    await prisma.disponibilidad_ambiente.deleteMany({ where: { id_ambiente: ambiente.id } });
    await prisma.disponibilidad_ambiente.createMany({
      data: dias.flatMap((dia) =>
        horasAmbiente.map((hora) => ({
          id_ambiente: ambiente.id,
          dia_semana: dia,
          hora_inicio: hora,
          hora_fin: `${String(parseInt(hora.slice(0, 2), 10) + 1).padStart(2, '0')}:00`,
          disponible: !(ambiente.tipo === 'LABORATORIO' && dia === 'VIERNES' && hora === '17:00'),
        }))
      ),
    });
  }

  // --- USUARIOS ADMINISTRATIVOS ---
  console.log('--- Iniciando creación de usuarios administrativos ---');
  
  const passHashDirector = await bcrypt.hash('Director123!', 12);
  const passHashAdmin = await bcrypt.hash('Admin123!', 12);
  const passHashSecretaria = await bcrypt.hash('Secretaria123!', 12);

  const admins = [
    { email: 'director@unt.edu.pe', hash: passHashDirector, rol: 'DIRECTOR' },
    { email: 'admin@unt.edu.pe', hash: passHashAdmin, rol: 'ADMINISTRADOR' },
    { email: 'secretaria@unt.edu.pe', hash: passHashSecretaria, rol: 'SECRETARIA' }
  ];

  for (const a of admins) {
    const email = a.email.toLowerCase().trim();
    console.log(`Intentando crear/actualizar ${a.rol}: ${email}`);
    
    // Usamos upsert para evitar borrar y crear si ya existe correctamente
    const user = await prisma.usuario.upsert({
      where: { email },
      update: {
        hash_contrasena: a.hash,
        rol: a.rol,
        activo: true,
        id_docente: null
      },
      create: {
        email,
        hash_contrasena: a.hash,
        rol: a.rol,
        activo: true,
        id_docente: null
      }
    });
    
    console.log(`VERIFICACIÓN: Usuario ${user.rol} configurado con email ${user.email}`);
  }


  // --- DOCENTES ---
  console.log('Configurando Docentes...');
  const hashDocente = await bcrypt.hash('Docente123!', 12);
  await prisma.usuario.upsert({
    where: { email: docente1.email },
    update: { hash_contrasena: hashDocente, activo: true, rol: 'DOCENTE', id_docente: docente1.id },
    create: { email: docente1.email, hash_contrasena: hashDocente, rol: 'DOCENTE', id_docente: docente1.id, activo: true },
  });

  const docentesParaUsuarios = [docente2, docente3, docente4];
  for (const doc of docentesParaUsuarios) {
    await prisma.usuario.upsert({
      where: { email: doc.email },
      update: { hash_contrasena: hashDocente, activo: true, rol: 'DOCENTE', id_docente: doc.id },
      create: { email: doc.email, hash_contrasena: hashDocente, rol: 'DOCENTE', id_docente: doc.id, activo: true },
    });
  }

  console.log('--- FIN DE SEMILLA CON ÉXITO ---');
  } catch (error: any) {
    console.error('--- ERROR EN SEMILLA ---');
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

