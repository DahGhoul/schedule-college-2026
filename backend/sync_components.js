const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  console.log("Reading schedule CSV...");
  const sContent = fs.readFileSync('/app/prisma/schedule_by_ciclo.csv', 'utf8');
  const cContent = fs.readFileSync('/app/prisma/curriculum.csv', 'utf8');

  const sData = sContent.split(/\r?\n/).slice(1).filter(l=>l.trim()).map(l => {
    const p = l.split(',');
    return { Asignatura: p[3], Docente: p[2], T: p[4], P: p[5], L: p[6], G: p[7] };
  });

  const cData = cContent.split(/\r?\n/).slice(1).filter(l=>l.trim()).map(l => {
    const p = l.split(',');
    return { Curso: p[3], codigo: p[0], L: p[6] };
  });

  const normalize = s => s ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\(e\)$/,'').trim() : '';

  const manualMap = {
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

  const manualProfMap = {
    "paul cotrina catellanos": "paul cotrina castellanos",
    "martha cardoso": "martha cardoso",
    "jhoe gonzalez vasquez": "jhon gonzales vasquez",
    "luis boy chavil": "luis roy chaul"
  };

  const allDocentes = await prisma.docente.findMany();
  const docenteMap = {};
  allDocentes.forEach(d => {
    docenteMap[`${normalize(d.nombres)} ${normalize(d.apellidos)}`] = d;
  });

  // Calculate Max G for each course
  const courseMaxG = {};
  for (const s of sData) {
    const normAsig = manualMap[normalize(s.Asignatura)] || normalize(s.Asignatura);
    const g = parseInt(s.G) || 1;
    if (!courseMaxG[normAsig] || g > courseMaxG[normAsig]) {
      courseMaxG[normAsig] = g;
    }
  }

  // Clear existing assignments to avoid unique constraint issues when recreating
  await prisma.bloque_horario.deleteMany();
  await prisma.asignacion_docente_componente.deleteMany();

  let count = 0;

  for (const s of sData) {
    const normAsig = manualMap[normalize(s.Asignatura)] || normalize(s.Asignatura);
    const baseCourse = cData.find(c => normalize(c.Curso) === normAsig);
    if (!baseCourse) continue;

    const curso = await prisma.curso.findUnique({ where: { codigo: baseCourse.codigo } });
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

    if (!docente && normProf === "martha cardoso") {
      docente = await prisma.docente.upsert({
        where: { email: "mcardoso@unitru.edu.pe" },
        update: {},
        create: {
          nombres: "Martha", apellidos: "Cardoso", email: "mcardoso@unitru.edu.pe",
          modalidad: "NOMBRADO", categoria: "ASOCIADO", antiguedad: 5, activo: true
        }
      });
      docenteMap[normProf] = docente;
    }
    if (!docente && normProf === "luis roy chaul") {
      docente = await prisma.docente.upsert({
        where: { email: "lboy@unitru.edu.pe" },
        update: {},
        create: {
          nombres: "Luis", apellidos: "Boy Chavil", email: "lboy@unitru.edu.pe",
          modalidad: "NOMBRADO", categoria: "PRINCIPAL", antiguedad: 10, activo: true
        }
      });
      docenteMap[normProf] = docente;
    }
    if (!docente && normProf === "jhon gonzales vasquez") {
      docente = await prisma.docente.upsert({
        where: { email: "jgonzales@unitru.edu.pe" },
        update: {},
        create: {
          nombres: "Jhoe", apellidos: "Gonzalez Vasquez", email: "jgonzales@unitru.edu.pe",
          modalidad: "NOMBRADO", categoria: "PRINCIPAL", antiguedad: 10, activo: true
        }
      });
      docenteMap[normProf] = docente;
    }

    if (!docente) continue;

    const t = parseInt(s.T) || 0;
    const p = parseInt(s.P) || 0;
    const l = parseInt(s.L) || parseInt(baseCourse.L) || 0;
    
    // G is the total max G for this course!
    const maxG = courseMaxG[normAsig] || 1;
    // Current assignment's assigned G hours might be less if a teacher only takes 1 group
    // Wait, the CSV says T, P, L, G.
    // If a teacher takes 2 groups of Lab, s.G is 2. So their assigned hours are L * s.G!
    const teacherG = parseInt(s.G) || 1;

    const componentes = await prisma.curso_componente.findMany({ where: { id_oferta: oferta.id } });

    if (t > 0 || p > 0) {
      const teoriaComp = componentes.find(c => c.tipo === 'TEORIA');
      if (teoriaComp) {
        await prisma.curso_componente.update({
           where: { id: teoriaComp.id },
           data: { horas_requeridas: t + p }
        });

        await prisma.asignacion_docente_componente.create({
          data: {
            id_componente: teoriaComp.id,
            id_docente: docente.id,
            horas_asignadas: t + p
          }
        });
        count++;
      }
    }

    if (l > 0) {
      const labComp = componentes.find(c => c.tipo === 'LABORATORIO');
      if (labComp) {
        // Update total required hours to be L * maxG
        await prisma.curso_componente.update({
           where: { id: labComp.id },
           data: { horas_requeridas: l * maxG }
        });

        // Recreate exactly maxG groups
        await prisma.grupo.deleteMany({ where: { id_componente: labComp.id } });
        for (let i = 0; i < maxG; i++) {
           await prisma.grupo.create({
             data: {
               id_componente: labComp.id,
               codigo: maxG === 1 ? 'UNICO' : String.fromCharCode(65 + i),
               capacidad_maxima: 18,
               activo: true
             }
           });
        }

        // Assign this teacher L * teacherG hours
        await prisma.asignacion_docente_componente.create({
          data: {
            id_componente: labComp.id,
            id_docente: docente.id,
            horas_asignadas: l * teacherG
          }
        });
        count++;
      }
    }
  }

  console.log(`Successfully fixed groups and created ${count} assignments!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
