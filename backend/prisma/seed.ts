import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Ejecutando semilla...');

  // ─── Período ─────────────────────────────
  const periodo = await prisma.periodo_academico.upsert({
    where: {
      nombre: '2026-I',
    },
    update: {},
    create: {
      nombre: '2026-I',
      fecha_inicio: new Date('2026-06-08'),
      fecha_fin: new Date('2026-10-30'),
      estado: 'ACTIVO',
    },
  });

  // ─── Restricciones por defecto ─────────────────────────
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

  // ─── Ciclos ───────────────────────────────
  const ciclos: any[] = [];
  for (let n = 1; n <= 10; n++) {
    const c = await prisma.ciclo.upsert({
      where: { id_periodo_numero: { id_periodo: periodo.id, numero: n } as any },
      update: {},
      create: {
        numero: n,
        nombre: `Ciclo ${n}`,
        id_periodo: periodo.id,
      },
    });
    ciclos.push(c);
  }

  // ─── Docentes ────────────────────────────
  const docente1 = await prisma.docente.upsert({
    where: {
      email: 'jperez@unt.edu.pe',
    },
    update: {},
    create: {
      nombres: 'Juan',
      apellidos: 'Pérez Gómez',
      email: 'jperez@unt.edu.pe',
      telefono: '999000111',
      modalidad: 'NOMBRADO',
      categoria: 'PRINCIPAL',
      antiguedad: 15,
    },
  });

  const docente2 = await prisma.docente.upsert({
    where: {
      email: 'psanchez@unt.edu.pe',
    },
    update: {},
    create: {
      nombres: 'Pedro',
      apellidos: 'Sánchez López',
      email: 'psanchez@unt.edu.pe',
      modalidad: 'NOMBRADO',
      categoria: 'ASOCIADO',
      antiguedad: 10,
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
    },
  });

  // ─── Cursos ──────────────────────────────
  const curso1 = await prisma.curso.upsert({
    where: {
      codigo: 'IS101',
    },
    update: {},
    create: {
      nombre: 'Programación I',
      codigo: 'IS101',
      horas_teoria: 4,
      horas_practica: 2,
      horas_laboratorio: 2,
      creditos: 4,
    },
  });

  const curso2 = await prisma.curso.upsert({
    where: {
      codigo: 'IS201',
    },
    update: {},
    create: {
      nombre: 'Estructura de Datos',
      codigo: 'IS201',
      horas_teoria: 4,
      horas_practica: 0,
      horas_laboratorio: 2,
      creditos: 4,
    },
  });

  const curso3 = await prisma.curso.upsert({
    where: { codigo: 'MA101' },
    update: {},
    create: {
      nombre: 'Matemática Discreta',
      codigo: 'MA101',
      horas_teoria: 4,
      horas_practica: 2,
      horas_laboratorio: 0,
      creditos: 4,
    },
  });

  const curso4 = await prisma.curso.upsert({
    where: { codigo: 'BD201' },
    update: {},
    create: {
      nombre: 'Base de Datos',
      codigo: 'BD201',
      horas_teoria: 3,
      horas_practica: 2,
      horas_laboratorio: 2,
      creditos: 4,
    },
  });

  const curso5 = await prisma.curso.upsert({
    where: { codigo: 'SI301' },
    update: {},
    create: {
      nombre: 'Ingeniería de Software',
      codigo: 'SI301',
      horas_teoria: 3,
      horas_practica: 2,
      horas_laboratorio: 0,
      creditos: 3,
    },
  });

  const curso6 = await prisma.curso.upsert({
    where: { codigo: 'AR401' },
    update: {},
    create: {
      nombre: 'Arquitectura de Redes',
      codigo: 'AR401',
      horas_teoria: 3,
      horas_practica: 0,
      horas_laboratorio: 4,
      creditos: 4,
    },
  });

  // ─── Ambientes ───────────────────────────
  const aulas: any[] = [];
  for (const codigo of ['A-101', 'A-102', 'A-103', 'A-104', 'A-105', 'A-106']) {
    const aula = await prisma.ambiente.upsert({
      where: { codigo },
      update: {},
      create: {
        codigo,
        tipo: 'AULA',
        capacidad: 40,
        piso: 1,
      },
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
      },
    });
    laboratorios.push(laboratorio);
  }

  // ─── Relación docente-curso ──────────────
  await prisma.docente_curso.upsert({
    where: {
      id_docente_id_curso: {
        id_docente: docente1.id,
        id_curso: curso1.id,
      },
    },
    update: {},
    create: {
      id_docente: docente1.id,
      id_curso: curso1.id,
    },
  });

  await prisma.docente_curso.upsert({
    where: {
      id_docente_id_curso: {
        id_docente: docente2.id,
        id_curso: curso2.id,
      },
    },
    update: {},
    create: {
      id_docente: docente2.id,
      id_curso: curso2.id,
    },
  });

  await prisma.docente_curso.upsert({
    where: {
      id_docente_id_curso: {
        id_docente: docente3.id,
        id_curso: curso3.id,
      },
    },
    update: {},
    create: {
      id_docente: docente3.id,
      id_curso: curso3.id,
    },
  });

  await prisma.docente_curso.upsert({
    where: {
      id_docente_id_curso: {
        id_docente: docente4.id,
        id_curso: curso4.id,
      },
    },
    update: {},
    create: {
      id_docente: docente4.id,
      id_curso: curso4.id,
    },
  });

  // ─── Relación curso-ambiente ─────────────
  await prisma.curso_ambiente.upsert({
    where: {
      id_curso_id_ambiente_tipo_clase: {
        id_curso: curso1.id,
        id_ambiente: aulas[0].id,
        tipo_clase: 'TEORIA',
      },
    },
    update: {},
    create: {
      id_curso: curso1.id,
      id_ambiente: aulas[0].id,
      tipo_clase: 'TEORIA',
    },
  });

  await prisma.curso_ambiente.upsert({
    where: {
      id_curso_id_ambiente_tipo_clase: {
        id_curso: curso1.id,
        id_ambiente: aulas[1].id,
        tipo_clase: 'PRACTICA',
      },
    },
    update: {},
    create: {
      id_curso: curso1.id,
      id_ambiente: aulas[1].id,
      tipo_clase: 'PRACTICA',
    },
  });

  await prisma.curso_ambiente.upsert({
    where: {
      id_curso_id_ambiente_tipo_clase: {
        id_curso: curso1.id,
        id_ambiente: laboratorios[0].id,
        tipo_clase: 'LABORATORIO',
      },
    },
    update: {},
    create: {
      id_curso: curso1.id,
      id_ambiente: laboratorios[0].id,
      tipo_clase: 'LABORATORIO',
    },
  });

  await prisma.curso_ambiente.upsert({
    where: {
      id_curso_id_ambiente_tipo_clase: {
        id_curso: curso2.id,
        id_ambiente: aulas[2].id,
        tipo_clase: 'TEORIA',
      },
    },
    update: {},
    create: {
      id_curso: curso2.id,
      id_ambiente: aulas[2].id,
      tipo_clase: 'TEORIA',
    },
  });

  await prisma.curso_ambiente.upsert({
    where: {
      id_curso_id_ambiente_tipo_clase: {
        id_curso: curso2.id,
        id_ambiente: laboratorios[1].id,
        tipo_clase: 'LABORATORIO',
      },
    },
    update: {},
    create: {
      id_curso: curso2.id,
      id_ambiente: laboratorios[1].id,
      tipo_clase: 'LABORATORIO',
    },
  });

  await prisma.curso_ambiente.upsert({
    where: {
      id_curso_id_ambiente_tipo_clase: {
        id_curso: curso3.id,
        id_ambiente: aulas[3].id,
        tipo_clase: 'TEORIA',
      },
    },
    update: {},
    create: {
      id_curso: curso3.id,
      id_ambiente: aulas[3].id,
      tipo_clase: 'TEORIA',
    },
  });

  await prisma.curso_ambiente.upsert({
    where: {
      id_curso_id_ambiente_tipo_clase: {
        id_curso: curso3.id,
        id_ambiente: aulas[4].id,
        tipo_clase: 'PRACTICA',
      },
    },
    update: {},
    create: {
      id_curso: curso3.id,
      id_ambiente: aulas[4].id,
      tipo_clase: 'PRACTICA',
    },
  });

  await prisma.curso_ambiente.upsert({
    where: {
      id_curso_id_ambiente_tipo_clase: {
        id_curso: curso4.id,
        id_ambiente: aulas[5].id,
        tipo_clase: 'TEORIA',
      },
    },
    update: {},
    create: {
      id_curso: curso4.id,
      id_ambiente: aulas[5].id,
      tipo_clase: 'TEORIA',
    },
  });

  await prisma.curso_ambiente.upsert({
    where: {
      id_curso_id_ambiente_tipo_clase: {
        id_curso: curso4.id,
        id_ambiente: laboratorios[2].id,
        tipo_clase: 'LABORATORIO',
      },
    },
    update: {},
    create: {
      id_curso: curso4.id,
      id_ambiente: laboratorios[2].id,
      tipo_clase: 'LABORATORIO',
    },
  });

  await prisma.curso_ambiente.upsert({
    where: {
      id_curso_id_ambiente_tipo_clase: {
        id_curso: curso5.id,
        id_ambiente: aulas[1].id,
        tipo_clase: 'TEORIA',
      },
    },
    update: {},
    create: {
      id_curso: curso5.id,
      id_ambiente: aulas[1].id,
      tipo_clase: 'TEORIA',
    },
  });

  await prisma.curso_ambiente.upsert({
    where: {
      id_curso_id_ambiente_tipo_clase: {
        id_curso: curso5.id,
        id_ambiente: aulas[2].id,
        tipo_clase: 'PRACTICA',
      },
    },
    update: {},
    create: {
      id_curso: curso5.id,
      id_ambiente: aulas[2].id,
      tipo_clase: 'PRACTICA',
    },
  });

  await prisma.curso_ambiente.upsert({
    where: {
      id_curso_id_ambiente_tipo_clase: {
        id_curso: curso6.id,
        id_ambiente: laboratorios[3].id,
        tipo_clase: 'LABORATORIO',
      },
    },
    update: {},
    create: {
      id_curso: curso6.id,
      id_ambiente: laboratorios[3].id,
      tipo_clase: 'LABORATORIO',
    },
  });

  // Grupos para cursos con laboratorio.
  for (const [curso, grupos] of [
    [curso1, ['A', 'B']],
    [curso2, ['A', 'B']],
    [curso4, ['A', 'B']],
    [curso6, ['A', 'B']],
  ] as Array<[any, string[]]>) {
    for (const codigo_grupo of grupos) {
      await prisma.grupo.upsert({
        where: {
          id_curso_codigo_grupo: {
            id_curso: curso.id,
            codigo_grupo,
          },
        },
        update: { capacidad_maxima: 18, activo: true },
        create: {
          id_curso: curso.id,
          codigo_grupo,
          capacidad_maxima: 18,
        },
      });
    }
  }

  // ─── Asociar cursos a ciclos (ejemplo básico)
  // Curso1 -> Ciclo 1, Curso2 -> Ciclo 2
  await prisma.curso_ciclo.upsert({
    where: {
      id_curso_id_ciclo: {
        id_curso: curso1.id,
        id_ciclo: ciclos[0].id,
      },
    },
    update: {},
    create: {
      id_curso: curso1.id,
      id_ciclo: ciclos[0].id,
    },
  });

  await prisma.curso_ciclo.upsert({
    where: {
      id_curso_id_ciclo: {
        id_curso: curso2.id,
        id_ciclo: ciclos[1].id,
      },
    },
    update: {},
    create: {
      id_curso: curso2.id,
      id_ciclo: ciclos[1].id,
    },
  });

  for (const curso of [curso3, curso4, curso5, curso6]) {
    await prisma.curso_ciclo.upsert({
      where: {
        id_curso_id_ciclo: {
          id_curso: curso.id,
          id_ciclo: ciclos[0].id,
        },
      },
      update: {},
      create: {
        id_curso: curso.id,
        id_ciclo: ciclos[0].id,
      },
    });
  }

  // Ensure mapping exists (compatible fallback using raw SQL)
  await prisma.$executeRawUnsafe(`INSERT INTO curso_ciclo (id_curso, id_ciclo)
    SELECT ${curso1.id}, ${ciclos[0].id}
    WHERE NOT EXISTS (SELECT 1 FROM curso_ciclo WHERE id_curso=${curso1.id} AND id_ciclo=${ciclos[0].id});`);

  await prisma.$executeRawUnsafe(`INSERT INTO curso_ciclo (id_curso, id_ciclo)
    SELECT ${curso2.id}, ${ciclos[1].id}
    WHERE NOT EXISTS (SELECT 1 FROM curso_ciclo WHERE id_curso=${curso2.id} AND id_ciclo=${ciclos[1].id});`);

  // ─── Disponibilidad de docentes ─────────────────────
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

  // ─── Disponibilidad de ambientes ────────────────────
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

  // ─── Usuario administrador ───────────────
  const hash = await bcrypt.hash('Admin123!', 12);

  await prisma.usuario.upsert({
    where: {
      email: 'admin@unt.edu.pe',
    },
    update: {},
    create: {
      email: 'admin@unt.edu.pe',
      hash_contrasena: hash,
      rol: 'ADMINISTRADOR',
    },
  });

  console.log('✅ Semilla completada.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });