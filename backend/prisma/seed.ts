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
      horas_laboratorio: 2,
      creditos: 4,
    },
  });

  // ─── Ambientes ───────────────────────────
  const aula1 = await prisma.ambiente.upsert({
    where: {
      codigo: 'A-101',
    },
    update: {},
    create: {
      codigo: 'A-101',
      tipo: 'AULA',
      capacidad: 40,
      piso: 1,
    },
  });

  const lab1 = await prisma.ambiente.upsert({
    where: {
      codigo: 'LAB-1',
    },
    update: {},
    create: {
      codigo: 'LAB-1',
      tipo: 'LABORATORIO',
      capacidad: 25,
      piso: 1,
      equipamiento: '25 PC, proyector',
    },
  });

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

  // ─── Relación curso-ambiente ─────────────
  await prisma.curso_ambiente.upsert({
    where: {
      id_curso_id_ambiente_tipo_clase: {
        id_curso: curso1.id,
        id_ambiente: aula1.id,
        tipo_clase: 'TEORIA',
      },
    },
    update: {},
    create: {
      id_curso: curso1.id,
      id_ambiente: aula1.id,
      tipo_clase: 'TEORIA',
    },
  });

  await prisma.curso_ambiente.upsert({
    where: {
      id_curso_id_ambiente_tipo_clase: {
        id_curso: curso1.id,
        id_ambiente: lab1.id,
        tipo_clase: 'LABORATORIO',
      },
    },
    update: {},
    create: {
      id_curso: curso1.id,
      id_ambiente: lab1.id,
      tipo_clase: 'LABORATORIO',
    },
  });

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

  // Ensure mapping exists (compatible fallback using raw SQL)
  await prisma.$executeRawUnsafe(`INSERT INTO curso_ciclo (id_curso, id_ciclo)
    SELECT ${curso1.id}, ${ciclos[0].id}
    WHERE NOT EXISTS (SELECT 1 FROM curso_ciclo WHERE id_curso=${curso1.id} AND id_ciclo=${ciclos[0].id});`);

  await prisma.$executeRawUnsafe(`INSERT INTO curso_ciclo (id_curso, id_ciclo)
    SELECT ${curso2.id}, ${ciclos[1].id}
    WHERE NOT EXISTS (SELECT 1 FROM curso_ciclo WHERE id_curso=${curso2.id} AND id_ciclo=${ciclos[1].id});`);

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