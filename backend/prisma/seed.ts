import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient, TipoComponente, TipoCurso } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { ambientesSeed, labsSeed, docentesSeed, ofertasSeed as realOfertasSeed } from './seed_data';

for (const envPath of [
  path.join(__dirname, '..', '.env'),
  path.join(process.cwd(), '.env'),
]) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

if (!process.env.DATABASE_URL) {
  console.warn('Aviso: DATABASE_URL no está definida. Define backend/.env o la variable de entorno antes de ejecutar el seed.');
}

const prisma = new PrismaClient();

async function main() {
  console.log('=== INICIO DE SEMILLA DE HORARIOS ===');

  try {
    // ============================================================
    // 0. AÑADIR COLUMNAS FALTANTES SI NO EXISTEN
    // ============================================================
    await prisma.$executeRaw`ALTER TABLE docente ADD COLUMN IF NOT EXISTS dni VARCHAR(20) UNIQUE;`;
    await prisma.$executeRaw`ALTER TABLE docente ADD COLUMN IF NOT EXISTS empleo VARCHAR(150);`;

    // ============================================================
    // 1. PERÍODO ACADÉMICO
    // ============================================================
    await prisma.bloque_horario.deleteMany();
    await prisma.asignacion_docente_componente.deleteMany();
    await prisma.grupo.deleteMany();
    await prisma.curso_componente.deleteMany();
    await prisma.curso_oferta.deleteMany();
    await prisma.disponibilidad_docente.deleteMany();
    await prisma.disponibilidad_ambiente.deleteMany();
    await prisma.ambiente.deleteMany();
    await prisma.usuario.deleteMany();
    
    await prisma.atencion_docente.deleteMany();
    await prisma.bloque_no_lectivo.deleteMany();
    await prisma.carga_no_lectiva.deleteMany();
    await prisma.declaracion_carga.deleteMany();
    await prisma.formato_generado.deleteMany();
    await prisma.historial_notificacion.deleteMany();
    await prisma.preferencia_notificacion.deleteMany();
    await prisma.cola_notificacion.deleteMany();
    await prisma.docente.deleteMany();
    await prisma.curso.deleteMany();

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
      { clave: 'HORAS_MAX_DIARIAS', valor: '9' },
      { clave: 'BLOQUEO_ALMUERZO_INICIO', valor: '13:00' },
      { clave: 'BLOQUEO_ALMUERZO_FIN', valor: '14:00' },
      { clave: 'TIEMPO_ATENCION_VENTANA', valor: '30' },
      { clave: 'LIMITE_MIN_PREPARACION_PCT', valor: '0.5' },
      { clave: 'LIMITE_MAX_ASESORIA_TESIS', valor: '2' },
      { clave: 'LIMITE_MAX_CAPACITACION', valor: '1' },
      { clave: 'LIMITE_MAX_INVESTIGACION', valor: '6' },
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
      { email: 'director@unitru.edu.pe', hash: passHashDirector, rol: 'DIRECTOR' },
      { email: 'admin@unitru.edu.pe', hash: passHashAdmin, rol: 'ADMINISTRADOR' },
      { email: 'secretaria@unitru.edu.pe', hash: passHashSecretaria, rol: 'SECRETARIA' },
    ]) {
      await prisma.usuario.upsert({
        where: { email: a.email },
        update: { hash_contrasena: a.hash, rol: a.rol, activo: true, id_docente: null },
        create: { email: a.email, hash_contrasena: a.hash, rol: a.rol, activo: true, id_docente: null },
      });
      console.log(`Usuario ${a.rol}: ${a.email}`);
    }

    // ============================================================
    // 5. CURRÍCULAS
    // ============================================================
    console.log('Configurando currículas...');
    await prisma.curricula.deleteMany();

    const curricula2024 = await prisma.curricula.create({
      data: { codigo: '2024', nombre: 'Currícula 2024', vigente: true },
    });
    const curricula2020 = await prisma.curricula.create({
      data: { codigo: '2020', nombre: 'Currícula 2020', vigente: false },
    });
    console.log(`Currículas: ${curricula2024.nombre} (vigente), ${curricula2020.nombre}`);

    // ============================================================
    // 6. AMBIENTES
    // ============================================================
    const ambientesCodigos = ambientesSeed;
    const labsCodigos = labsSeed;

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

    const docentesDef = docentesSeed;

    const docenteMap: Record<string, any> = {};
    const hashDocente = await bcrypt.hash('Docente123!', 12);

    for (const [index, def] of docentesDef.entries()) {
      const codigoIbm = `IBM-${String(index + 1).padStart(3, '0')}`;
      const doc = await prisma.docente.upsert({
        where: { email: def.email },
        update: { codigo_ibm: codigoIbm },
        create: {
          codigo_ibm: codigoIbm,
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
    const ofertasDef = realOfertasSeed;

    console.log('Creando cursos, ofertas y componentes...');

    for (const def of ofertasDef) {
      // Upsert curso
      const curso = await prisma.curso.upsert({
        where: { codigo: def.codigo },
        update: { nombre: def.nombre, creditos: def.creditos, activo: true, id_curricula: curricula2024.id },
        create: { nombre: def.nombre, codigo: def.codigo, creditos: def.creditos, activo: true, id_curricula: curricula2024.id },
      });

      const cicloObj = ciclosArr[def.ciclo - 1];

      // Crear oferta
      const oferta = await prisma.curso_oferta.create({
        data: {
          id_periodo: periodo.id,
          id_curso: curso.id,
          id_ciclo: cicloObj.id,
          tipo_curso: def.tipo as TipoCurso,
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

    await syncAndAssignTeachers(prisma);
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



async function syncAndAssignTeachers(prisma: any) {
  console.log("Asignando docentes reales desde schedule_by_ciclo.csv...");
  const sContent = fs.readFileSync(path.join(__dirname, 'schedule_by_ciclo.csv'), 'utf8');

  const sData = sContent.split(/\r?\n/).slice(1).filter((l: string) => l.trim()).map((l: string) => {
    const p = l.split(',');
    return { Asignatura: p[3], Docente: p[2], T: p[4], P: p[5], L: p[6], G: p[7] };
  });

  const normalize = (s: string) => s ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\(e\)$/,'').trim() : '';

  const manualMap: Record<string, string> = {
    "introduccion a la ing. de sistemas": "introduccion a la ingenieria de sistemas",
    "desarrollo del pens. logico matemat.": "desarrollo del pensamiento logico matematico",
    "lectura critica y redac. textos acad.": "lectura critica y redaccion de textos academicos",
    "psicologia organizacional": "sicologia organizacional",
    "arquitectura de computadoras": "arquitectura y organizacion de computadoras",
    "ingenieria de software i": "ingenieria del software i",
    "gestion de servicios de ti": "gestion de servicios de tic",
    "planeamiento estrategico de ti": "planeamiento estrategico de la informacion",
    "cadena de suministros": "cadena de suministro",
    "gestion de proyectos de ti": "gestion de proyectos de tic",
    "emprendimiento tecnologica": "emprendedurismo tecnologico",
    "computacion en la nube": "computacion en la nube",
    "hackeo etico": "hackeo etico"
  };

  const manualProfMap: Record<string, string> = {
    "paul cotrina catellanos": "paul cotrina castellanos",
    "martha cardoso": "martha cardoso",
    "jhoe gonzalez vasquez": "jhon gonzales vasquez",
    "luis boy chavil": "luis roy chaul"
  };

  const allCursos = await prisma.curso.findMany();
  const cursoMap: Record<string, any> = {};
  for (const c of allCursos) {
    cursoMap[normalize(c.nombre)] = c;
  }

  const allDocentes = await prisma.docente.findMany();
  const docenteMap: Record<string, any> = {};
  for (const d of allDocentes) {
    docenteMap[normalize(d.nombres) + " " + normalize(d.apellidos)] = d;
  }

  const courseMaxG: Record<string, number> = {};
  const courseMaxL: Record<string, number> = {};
  const courseSumTP: Record<string, number> = {};
  const courseOverrides: Record<string, { g?: number, sumTP?: number }> = {
    "negocios electronicos": { g: 2 },
    "introduccion a la programacion": { g: 4 },
    "tesis i": { g: 2, sumTP: 8 } // Tesis I will have 2 theory groups (2 * 4h = 8h)
  };

  for (const s of sData) {
    const normAsig = manualMap[normalize(s.Asignatura)] || normalize(s.Asignatura);
    const g = parseInt(s.G) || 1;
    const l = parseInt(s.L) || 0;
    const t = parseInt(s.T) || 0;
    const p = parseInt(s.P) || 0;

    if (!courseMaxG[normAsig] || g > courseMaxG[normAsig]) courseMaxG[normAsig] = g;
    if (!courseMaxL[normAsig] || l > courseMaxL[normAsig]) courseMaxL[normAsig] = l;
    
    courseSumTP[normAsig] = (courseSumTP[normAsig] || 0) + (t + p);
  }

  // Apply overrides
  for (const [course, override] of Object.entries(courseOverrides)) {
    if (override.g) courseMaxG[course] = override.g;
    if (override.sumTP) courseSumTP[course] = override.sumTP;
  }

  await prisma.bloque_horario.deleteMany();
  await prisma.asignacion_docente_componente.deleteMany();

  let count = 0;
  
  // Track processed components so we don't duplicate groups/hours required
  const processedTeoria = new Set();
  const processedLab = new Set();

  for (const s of sData) {
    const normAsig = manualMap[normalize(s.Asignatura)] || normalize(s.Asignatura);
    const curso = cursoMap[normAsig];
    if (!curso) continue;

    const oferta = await prisma.curso_oferta.findFirst({ where: { id_curso: curso.id } });
    if (!oferta) continue;

    let normProf = normalize(s.Docente);
    normProf = manualProfMap[normProf] || normProf;
    
    let docente = null;
    for (const [name, d] of Object.entries(docenteMap)) {
      if (name.includes(normProf) || normProf.includes(name) || name === normProf) {
        docente = d; break;
      }
    }
    if (!docente) {
      const parts = normProf.split(' ');
      const lastName = parts.slice(-2).join(' ');
      for (const [name, d] of Object.entries(docenteMap)) {
        if (name.includes(lastName)) { docente = d; break; }
      }
    }

    // specific manual creations
    if (!docente && normProf === "martha cardoso") {
      docente = await prisma.docente.upsert({
        where: { email: "mcardoso@unitru.edu.pe" },
        update: {},
        create: { nombres: "Martha", apellidos: "Cardoso", email: "mcardoso@unitru.edu.pe", modalidad: "NOMBRADO", categoria: "ASOCIADO", antiguedad: 5, activo: true }
      });
      docenteMap[normProf] = docente;
    }
    if (!docente && normProf === "luis roy chaul") {
      docente = await prisma.docente.upsert({
        where: { email: "lboy@unitru.edu.pe" },
        update: {},
        create: { nombres: "Luis", apellidos: "Boy Chavil", email: "lboy@unitru.edu.pe", modalidad: "NOMBRADO", categoria: "PRINCIPAL", antiguedad: 10, activo: true }
      });
      docenteMap[normProf] = docente;
    }
    if (!docente && normProf === "jhon gonzales vasquez") {
      docente = await prisma.docente.upsert({
        where: { email: "jgonzales@unitru.edu.pe" },
        update: {},
        create: { nombres: "Jhoe", apellidos: "Gonzalez Vasquez", email: "jgonzales@unitru.edu.pe", modalidad: "NOMBRADO", categoria: "PRINCIPAL", antiguedad: 10, activo: true }
      });
      docenteMap[normProf] = docente;
    }

    if (!docente) continue;

    const t = parseInt(s.T) || 0;
    const p = parseInt(s.P) || 0;
    const l = parseInt(s.L) || 0;
    const teacherG = parseInt(s.G) || 1;
    
    const componentes = await prisma.curso_componente.findMany({ where: { id_oferta: oferta.id } });
    const teoriaComp = componentes.find((c: any) => c.tipo === 'TEORIA');
    const labComp = componentes.find((c: any) => c.tipo === 'LABORATORIO');

    const maxG = courseMaxG[normAsig] || 1;
    const maxL = courseMaxL[normAsig] || 0;

    if (t > 0 || p > 0) {
      if (teoriaComp) {
        if (!processedTeoria.has(teoriaComp.id)) {
          processedTeoria.add(teoriaComp.id);
          const totalTeoriaH = courseSumTP[normAsig] || (t + p);
          await prisma.curso_componente.update({ where: { id: teoriaComp.id }, data: { horas_requeridas: totalTeoriaH } });
          
          if (normAsig === "tesis i") {
            await prisma.grupo.deleteMany({ where: { id_componente: teoriaComp.id } });
            for (let i = 0; i < maxG; i++) {
               await prisma.grupo.create({ data: { id_componente: teoriaComp.id, codigo: String.fromCharCode(65 + i), capacidad_maxima: 20, activo: true } });
            }
          }
        }
        await prisma.asignacion_docente_componente.create({ data: { id_componente: teoriaComp.id, id_docente: docente.id, horas_asignadas: t + p } });
        count++;
      }
    }

    if (l > 0) {
      if (labComp) {
        if (!processedLab.has(labComp.id)) {
          processedLab.add(labComp.id);
          
          // Recreate groups based on maxG
          await prisma.grupo.deleteMany({ where: { id_componente: labComp.id } });
          for (let i = 0; i < maxG; i++) {
             await prisma.grupo.create({ data: { id_componente: labComp.id, codigo: maxG === 1 ? 'UNICO' : String.fromCharCode(65 + i), capacidad_maxima: 18, activo: true } });
          }
          
          // Total lab hours for the course is maxL * maxG
          await prisma.curso_componente.update({ where: { id: labComp.id }, data: { horas_requeridas: maxL * maxG } });
        }

        // For Negocios Electronicos, Paul Cotrina has G=2 but we forced maxG=3.
        // The user says "grupos de 2 horas", so maxL is 2.
        // Teacher's assigned hours = maxL * teacherG
        // So for Paul Cotrina (L=2, G=2): 2 * 2 = 4. Wait, user wants 6 hours total.
        // The script calculates maxL * maxG = 2 * 3 = 6! Correct!
        await prisma.asignacion_docente_componente.create({ data: { id_componente: labComp.id, id_docente: docente.id, horas_asignadas: l * teacherG } });
        count++;
      }
    }
  }

  console.log("=> Docentes asignados y grupos de laboratorio creados: " + count + " registros.");
}
