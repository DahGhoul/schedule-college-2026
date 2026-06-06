# Auditoría funcional de horarios 2026-I

Objetivo: dejar una lista operativa de lo que ya existe en el sistema, lo que existe pero todavía falta revisar en detalle, y lo que falta construir para cerrar el flujo de horarios del periodo 2026-I.

## Estado actual detectado

### Seeder y datos base

| Estado | Hallazgo | Archivo |
| --- | --- | --- |
| Existe | El seed crea el periodo 2026-I con fechas, estado activo y configuraciones base. | [backend/prisma/seed.ts](backend/prisma/seed.ts) |
| Existe | El seed registra ciclos 1 al 10, usuarios administrativos, docentes, ambientes y laboratorios. | [backend/prisma/seed.ts](backend/prisma/seed.ts) |
| Existe | El seed limpia datos del periodo antes de recrear bloques, asignaciones, grupos y ofertas. | [backend/prisma/seed.ts](backend/prisma/seed.ts) |
| Falta revisar | El seed está basado en datos hardcodeados; hay que validar contra la lista actual real de docentes, aulas y horarios del 2026-I. | [backend/prisma/seed.ts](backend/prisma/seed.ts) |
| Falta revisar | Falta confirmar que el comando de seed se ejecute sin errores en entorno limpio y que sea idempotente en una corrida repetida. | [backend/package.json](backend/package.json), [backend/docker-entrypoint.sh](backend/docker-entrypoint.sh) |
| Bloqueado | La validación real del seed falla en este entorno porque no existe la variable DATABASE_URL. | [backend/prisma/seed.ts](backend/prisma/seed.ts), [backend/prisma/schema.prisma](backend/prisma/schema.prisma) |

#### Comando único para re-seed rápido en Docker

Si el stack ya está levantado con `docker compose up --build -d`, el re-seed se ejecuta con un solo comando desde la raíz del proyecto:

```bash
docker compose exec -T backend npx prisma db seed
```

Notas operativas:

- Este comando corre el seed dentro del contenedor `backend`, así evita el problema de `tsx` o dependencias faltantes en el host Windows.
- Si el contenedor `backend` no está levantado, primero hay que arrancar el stack con `docker compose up -d` o `docker compose up --build -d`.
- El seed actual limpia y recrea los datos del periodo 2026-I, así que conviene usarlo solo cuando se quiera refrescar la base de pruebas.

### Carga horaria

| Estado | Hallazgo | Archivo |
| --- | --- | --- |
| Existe | Hay lógica para asignar carga, validar horas máximas, evitar excedentes por componente y activar multi-docente. | [backend/src/modules/carga-horaria/carga-horaria.service.ts](backend/src/modules/carga-horaria/carga-horaria.service.ts) |
| Existe | Hay resumen de carga por periodo para listar docentes con sus asignaciones. | [backend/src/modules/carga-horaria/carga-horaria.service.ts](backend/src/modules/carga-horaria/carga-horaria.service.ts) |
| Falta revisar | Hay que probar la lógica con casos reales: docente sin límite, docente con límite legal, componente con varios grupos y reasignaciones parciales. | [backend/src/modules/carga-horaria/carga-horaria.service.ts](backend/src/modules/carga-horaria/carga-horaria.service.ts) |
| Falta revisar | Falta verificar que la vista de carga horaria en frontend represente bien el progreso, conflictos y totales. | [frontend/src/app/dashboard/secretaria/docentes/page.tsx](frontend/src/app/dashboard/secretaria/docentes/page.tsx) |

### Reportes PDF y Excel

| Estado | Hallazgo | Archivo |
| --- | --- | --- |
| Existe | Ya hay generación de PDF por docente y global. | [backend/src/modules/reportes/reportes.service.ts](backend/src/modules/reportes/reportes.service.ts) |
| Existe | Ya hay generación de Excel por docente y global. | [backend/src/modules/reportes/reportes.service.ts](backend/src/modules/reportes/reportes.service.ts) |
| Existe | El frontend descarga PDF y Excel globales desde secretaría y desde el dashboard del docente. | [frontend/src/components/dashboard/SecretariaDashboard.tsx](frontend/src/components/dashboard/SecretariaDashboard.tsx), [frontend/src/components/dashboard/docente/page.tsx](frontend/src/components/dashboard/docente/page.tsx) |
| Falta revisar | El PDF necesita revisión de cabeceras por página, legibilidad de tablas largas y consistencia visual con el formato actual esperado. | [backend/src/modules/reportes/reportes.service.ts](backend/src/modules/reportes/reportes.service.ts) |
| Falta revisar | El Excel existe, pero hay que validar que conserve el formato actual deseado y que el global quede comparable con la versión manual buena. | [backend/src/modules/reportes/reportes.service.ts](backend/src/modules/reportes/reportes.service.ts) |

## Lo que ya existe pero falta revisar bien

| Área | Qué existe | Qué falta revisar |
| --- | --- | --- |
| Vista secretaria | Hay dashboard con KPIs, descarga de reportes y acceso a módulos de registro, ambientes y horarios finales. | Revisar si la interfaz realmente ayuda a asignar horario rápido y si la jerarquía visual es clara. [frontend/src/components/dashboard/SecretariaDashboard.tsx](frontend/src/components/dashboard/SecretariaDashboard.tsx) |
| Registro manual | Hay una pantalla con matriz de disponibilidad, selección de docente, ambiente, componente y grupo. | Revisar si la experiencia se parece lo suficiente al Excel operativo que usa secretaría. [frontend/src/app/dashboard/secretaria/registro-horarios/page.tsx](frontend/src/app/dashboard/secretaria/registro-horarios/page.tsx) |
| Ambientes | Hay vista de disponibilidad general por periodo. | Revisar si sirve para encontrar aula libre por rango horario y no solo para listar disponibilidad general. [frontend/src/app/dashboard/secretaria/ambientes/page.tsx](frontend/src/app/dashboard/secretaria/ambientes/page.tsx) |
| Docentes | Hay vista básica de carga horaria por docente. | Revisar si necesita filtros, semáforos, detalle por curso, exportación o drill-down por conflicto. [frontend/src/app/dashboard/secretaria/docentes/page.tsx](frontend/src/app/dashboard/secretaria/docentes/page.tsx) |
| Horarios por día | Existen componentes y datos ordenados por días de semana. | Falta un reporte o vista dedicada para consultar, por ejemplo, los horarios del lunes y qué profesores tienen clase. [frontend/src/components/horarios/VistaHorarioDocente.tsx](frontend/src/components/horarios/VistaHorarioDocente.tsx), [frontend/src/components/horarios/VistaHorarioAula.tsx](frontend/src/components/horarios/VistaHorarioAula.tsx), [backend/src/modules/reportes/reportes.service.ts](backend/src/modules/reportes/reportes.service.ts) |

## Lo que falta construir o cerrar

| Prioridad | Pendiente | Detalle |
| --- | --- | --- |
| Alta | Ejecutar y validar el seeder del 2026-I con datos reales | Confirmar docentes, aulas, laboratorios, cursos y bloques actuales; dejar evidencia de que el seed corre limpio. |
| Alta | Probar la lógica de carga horaria | Casos con múltiples grupos, límites legales, reasignaciones y eliminación segura de asignaciones. |
| Alta | Mejorar la vista de carga horaria | Hacerla más útil para revisión administrativa: semáforos, filtros, detalle por componente, conflictos y acciones rápidas. |
| Alta | Mejorar la vista de secretaría para asignar horario | Llevar la UI hacia una experiencia similar al Excel bueno, más compacta, visual y directa. |
| Alta | Exportar horario Excel con formato actual | Mantener el formato bueno actual y evitar que el export cambie el aspecto que ya usa el equipo. |
| Alta | Exportar horario PDF con cabeceras | Agregar cabeceras repetidas, mejor jerarquía visual y soporte para tablas largas o múltiples páginas. |
| Alta | Crear horarios por día | Vista o reporte para consultar un día específico y saber qué docentes dictan clase en ese momento. |
| Alta | Buscar aula libre por rango de tiempo | Debe permitir filtrar por periodo, día, hora inicial y hora final para encontrar disponibilidad real. |
| Media | Mejorar vista de ambientes | Pasar de una tabla general a una vista útil para búsqueda operativa y control de ocupación. |
| Media | Agregar filtros por periodo y por día en reportes | Evitar depender solo de reportes globales o por docente. |
| Media | Añadir totales, resúmenes y alertas | Bloques ocupados, horas libres, docentes sin carga, aulas saturadas y conflictos. |
| Media | Fortalecer validaciones de negocio | Evitar cruces de horario, aulas duplicadas y asignaciones incompletas desde frontend y backend. |
| Media | Revisar permisos de secretaria | Confirmar que cada acción esté protegida por rol y por estado del periodo. |
| Media | Revisar estado vacío y errores | Mensajes claros cuando no hay periodos, docentes, horarios o ambientes cargados. |
| Baja | Mejorar accesibilidad y responsive | Hacer la UI usable en laptop y tablet, con contraste y navegación clara. |

## Revisión recomendada por bloques

1. Seed 2026-I y datos de base.
2. Carga horaria y reglas de validación.
3. Reportes PDF y Excel.
4. Vista de secretaría para asignación.
5. Búsqueda de aula libre y horarios por día.
6. Ajustes visuales y de usabilidad.

## Criterio de cierre

Se puede considerar listo cuando el seed cargue el periodo 2026-I con datos reales, la carga horaria pase pruebas de negocio, los reportes PDF y Excel respeten el formato esperado y la secretaría pueda asignar, consultar y buscar horarios con una UI clara y rápida.