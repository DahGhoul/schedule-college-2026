const { execSync } = require('child_process');
const fs = require('fs');

try {
  execSync('git checkout backend/prisma/seed.ts', { stdio: 'inherit' });
} catch (e) {
  console.log("Git checkout failed, ignoring...");
}

let seed = fs.readFileSync('backend/prisma/seed.ts', 'utf8');

// The replacement code for 5 and 6
const newCode5and6 = `// 5. AMBIENTES
    // ============================================================
    for (const amb of ambientesSeed) {
      let capacidad = 40;
      if (amb.toLowerCase().includes('posgrado')) capacidad = 45;
      else if (amb.toLowerCase().includes('industrial')) capacidad = 60;
      else if (amb.toLowerCase().includes('audiovisuales')) capacidad = 50;

      await prisma.ambiente.upsert({
        where: { codigo: amb },
        update: {},
        create: { codigo: amb, tipo: 'AULA', capacidad, piso: 1, activo: true },
      });
    }

    for (const lab of labsSeed) {
      await prisma.ambiente.upsert({
        where: { codigo: lab },
        update: {},
        create: {
          codigo: lab,
          tipo: 'LABORATORIO',
          capacidad: 18,
          piso: 1,
          equipamiento: '18 equipos, proyector y red de datos',
          activo: true,
        },
      });
    }

    // ============================================================
    // 6. DOCENTES
    // ============================================================
    console.log('Configurando docentes...');

    const docenteMap: Record<string, any> = {};
    const hashDocente = await bcrypt.hash('Docente123!', 12);

    for (const def of docentesSeed) {
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
          empleo: 'POR_COMPLETAR',
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

    // ============================================================`;

// Replace everything between "// 5. AMBIENTES" and "// 7. CURSOS Y OFERTAS"
const regex5to7 = /\/\/ 5\. AMBIENTES[\s\S]*?\/\/ ============================================================\s*\/\/ 7\. CURSOS Y OFERTAS POR CICLO/m;
seed = seed.replace(regex5to7, newCode5and6 + '\n    // 7. CURSOS Y OFERTAS POR CICLO');

// Remove dni
seed = seed.replace(/dni: String\(Math\.floor\(Math\.random\(\) \* 90000000\) \+ 10000000\), /g, "");

// Fix unicode
seed = seed.replace(/\.replace\(\/\[\\u0300-\\u036f\]\/g, ''\)/g, ".replace(/[\\u0300-\\u036f]/g, '')");

// Final log
seed = seed.replace(/docentesDef\.length/g, "docentesSeed.length");

fs.writeFileSync('backend/prisma/seed.ts', seed);
console.log('Foolproof fix applied successfully!');
