const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.asignacion_docente_componente.count();
  console.log(`Total asignaciones: ${count}`);

  const asignaciones = await prisma.asignacion_docente_componente.findMany({
    include: {
      docente: true,
      componente: { include: { curso_oferta: { include: { curso: true } } } }
    }
  });

  console.log('First 3:');
  asignaciones.slice(0, 3).forEach(a => {
    console.log(`Docente: ${a.docente.nombres} ${a.docente.apellidos}, Curso: ${a.componente.curso_oferta.curso.nombre}, Tipo: ${a.componente.tipo_componente}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
