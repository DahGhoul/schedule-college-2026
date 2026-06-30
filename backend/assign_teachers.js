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
    return { Curso: p[3], codigo: p[0] };
  });

  const normalize = s => s ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\(e\)$/,'').trim() : '';

  const allDocentes = await prisma.docente.findMany();
  const docenteMap = {};
  allDocentes.forEach(d => {
    docenteMap[`${normalize(d.nombres)} ${normalize(d.apellidos)}`] = d;
  });

  console.log("Creating assignments...");
  let count = 0;

  // Clear existing assignments except those that might be needed, or just clear all
  await prisma.asignacion_docente_componente.deleteMany();

  for (const s of sData) {
    const normAsig = normalize(s.Asignatura);
    
    // Manual mapping for slight name differences
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
      "computacion en la nube": "computacion en la nube", // just in case
      "hackeo etico": "hackeo etico"
    };

    let searchName = manualMap[normAsig] || normAsig;
    const baseCourse = cData.find(c => normalize(c.Curso) === searchName);
    if (!baseCourse) {
      console.log(`Course not found in curriculum: ${s.Asignatura}`);
      continue;
    }

    const curso = await prisma.curso.findUnique({ where: { codigo: baseCourse.codigo } });
    if (!curso) continue;

    const oferta = await prisma.curso_oferta.findFirst({ where: { id_curso: curso.id } });
    if (!oferta) continue;

    let normProf = normalize(s.Docente);
    const manualProfMap = {
      "paul cotrina catellanos": "paul cotrina castellanos",
      "martha cardoso": "martha cardoso", // doesn't exist, we will create her
      "jhoe gonzalez vasquez": "jhon gonzales vasquez",
      "luis boy chavil": "luis roy chaul"
    };
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
          nombres: "Martha",
          apellidos: "Cardoso",
          email: "mcardoso@unitru.edu.pe",
          modalidad: "NOMBRADO",
          categoria: "ASOCIADO",
          antiguedad: 5,
          activo: true
        }
      });
      docenteMap[normProf] = docente;
    }

    if (!docente && normProf === "luis roy chaul") {
      docente = await prisma.docente.upsert({
        where: { email: "lboy@unitru.edu.pe" },
        update: {},
        create: {
          nombres: "Luis",
          apellidos: "Boy Chavil",
          email: "lboy@unitru.edu.pe",
          modalidad: "NOMBRADO",
          categoria: "PRINCIPAL",
          antiguedad: 10,
          activo: true
        }
      });
      docenteMap[normProf] = docente;
    }

    if (!docente && normProf === "jhon gonzales vasquez") {
      docente = await prisma.docente.upsert({
        where: { email: "jgonzales@unitru.edu.pe" },
        update: {},
        create: {
          nombres: "Jhoe",
          apellidos: "Gonzalez Vasquez",
          email: "jgonzales@unitru.edu.pe",
          modalidad: "NOMBRADO",
          categoria: "PRINCIPAL",
          antiguedad: 10,
          activo: true
        }
      });
      docenteMap[normProf] = docente;
    }

    if (!docente) {
      console.log(`Teacher not found: ${s.Docente}`);
      continue;
    }

    const t = parseInt(s.T) || 0;
    const p = parseInt(s.P) || 0;
    const l = parseInt(s.L) || 0;
    const g = parseInt(s.G) || 1;

    const componentes = await prisma.curso_componente.findMany({ where: { id_oferta: oferta.id } });

    if (t > 0 || p > 0) {
      const teoriaComp = componentes.find(c => c.tipo === 'TEORIA');
      if (teoriaComp) {
        await prisma.asignacion_docente_componente.upsert({
          where: { id_componente_id_docente: { id_componente: teoriaComp.id, id_docente: docente.id } },
          update: { horas_asignadas: t + p },
          create: {
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
        // Ensure G groups exist
        const gruposExistentes = await prisma.grupo.findMany({ where: { id_componente: labComp.id } });
        if (gruposExistentes.length < g) {
          for (let i = gruposExistentes.length; i < g; i++) {
             await prisma.grupo.create({
               data: {
                 id_componente: labComp.id,
                 codigo: String.fromCharCode(65 + i), // A, B, C...
                 capacidad_maxima: 18,
                 activo: true
               }
             });
          }
          if (gruposExistentes.length === 1 && gruposExistentes[0].codigo === 'UNICO') {
             await prisma.grupo.update({
               where: { id: gruposExistentes[0].id },
               data: { codigo: 'A' }
             });
          }
        }

        await prisma.asignacion_docente_componente.upsert({
          where: { id_componente_id_docente: { id_componente: labComp.id, id_docente: docente.id } },
          update: { horas_asignadas: l * g },
          create: {
            id_componente: labComp.id,
            id_docente: docente.id,
            horas_asignadas: l * g
          }
        });
        count++;
      }
    }
  }

  console.log(`Successfully created ${count} assignments!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
