# Nueva Sección — Registro de Horas No Lectivas (Plan de Implementación)

## Objetivo

Agregar una nueva sección al módulo de Carga Horaria para que los docentes registren sus horas no lectivas, con validaciones automáticas para garantizar que el total de horas coincida con la dedicación declarada y que se respeten los límites por sección.

## Alcance

- Interfaz: selección de semestre, formulario de declaración (Formato #2), variante para sedes desconcentradas.
- Backend: modelos de datos, endpoints CRUD, cálculo y validaciones.
- Integración: generación automática de formatos imprimibles (5 formatos) y enlace con la asignación lectiva existente.

## Pantallas y Flujo

1. Pantalla 0 — Selección de Semestre Académico
   - Selector desplegable con semestres disponibles.
   - Botón "Continuar" que lleva a la confirmación de datos.

2. Confirmación de Datos
   - Muestra IBM, condición, categoría, dedicación (editable mediante enlace "Modificar Datos").

3. Declaración de Carga Horaria (Formato #2 - central)
   - Sección I: Datos de la institución y tabla de identificación del docente.
   - Sección 1: Trabajo Lectivo (tabla de cursos con columnas: Código, Nombre, Sección, Curso, Escuela, Ciclo, Nro Alumnos editable, HrsTeo×Grupos, HrsPra×Grupos, HrsLab×Grupos, Total Hrs.).
   - Secciones 2 a 10: campos de horas y áreas de texto según la especificación (Preparación y Evaluación; Consejería y Tutoría; Investigación; Capacitación; Actividades de Gobierno; Administración; Asesoría de Tesis/Exp. Prof.; Responsabilidad Social; Comités y Comisiones).
   - Totales calculados y botón Guardar / Volver.

4. Declaración (Formato #2 - versión desconcentrada)
   - Tabla concentrada de horas por curso, nota reglamentaria y diferencias en secciones no lectivas.

## Reglas de negocio clave (resumen ejecutable)

- RN-01: La asignación lectiva la realiza la secretaría del departamento (datos importados).
- RN-02: Horas curso = (HrsTeo × GruposTeo) + (HrsPra × GruposPra) + (HrsLab × GruposLab).
- RN-03: Límites por sección (ej.: Preparación ≤ 50% de lectivas; Consejo mínimo 1 h; Investigación mínimo 4–5 h; Capacitación máximo 5 semanas; Resp. Social mínimo 1 h).
- RN-04: Total obligatorio según modalidad (por ej. Tiempo Completo 40 h, Parcial 20 h, etc.).
- RN-05: Flujo en dos instancias (Dirección de Escuela + Sistema Web).
- RN-06: Reglas especiales para sedes descentralizadas (licencias, notas legales).
- RN-07: Generación automática de 5 formatos al completar la declaración.

## Requerimientos funcionales (implementables)

- RF-01: Selección de semestre antes de iniciar.
- RF-02: Visualización y edición controlada de datos personales del docente.
- RF-03: Visualizar cursos con desglose de horas por tipo y grupos.
- RF-04: Registrar número aproximado de alumnos por curso.
- RF-05: Ingresar horas no lectivas en 9 categorías diferenciadas.
- RF-06: Registrar código de resolución para cada actividad no lectiva.
- RF-07: Calcular automáticamente total de horas al guardar.
- RF-08: Validar que total coincida con la modalidad de dedicación.
- RF-09: Validar mínimos y máximos por sección.
- RF-10: Generar 5 formatos oficiales imprimibles.
- RF-11: Diferenciar formatos para Sede Central y Sedes Descentralizadas.
- RF-12: Permitir modificar datos guardados (historial/versión simple).
- RF-13: Mostrar nota legal en formatos desconcentrados.
- RF-14: Soportar compartición de curso entre dos o más docentes.

## Diseño de datos (alto nivel)

- Nueva tabla `non_lective_declarations` (o `carga_no_lectiva`) con: id, teacher_id, semester_id, section_code, resolution_code, hours, description, created_at, updated_at.
- Tabla `non_lective_summary` derivada o cálculo en consulta para totales por docente y verificación frente a `teacher.dedicacion`.
- Relación con cursos: referencia a `assigned_courses` existente para mostrar lectivas y permitir la suma.

## Endpoints API sugeridos

- GET /api/semesters — lista de semestres.
- GET /api/teachers/:id/data — IBM, condición, categoría, dedicación, cursos asignados.
- POST /api/teachers/:id/declarations — crear/guardar declaración completa (payload con secciones y códigos de resolución).
- PUT /api/teachers/:id/declarations/:id — actualizar.
- GET /api/teachers/:id/declarations/:semester — obtener declaración por semestre.
- POST /api/declarations/:id/generate-formats — disparar generación de formatos imprimibles.

## Validaciones y lógica en backend

- Al guardar: calcular `total_lectivo` desde cursos asignados y sumar `total_no_lectivo` desde secciones; validar que `total_lectivo + total_no_lectivo == dedicacion_requerida` (p. ej. 40).
- Validar topes por sección (prep ≤ 50% lectivas, investigación ≥ 4, consejería ≥ 1, etc.).
- Bloquear guardado si incumple, devolver lista de errores por campo.
- Registrar cambios por usuario y timestamp.

## Tareas frontend

- Componente `SelectSemester` (Pantalla 0).
- Componente `ConfirmTeacherData`.
- Componente `DeclarationForm` con subcomponentes para cada sección y tabla de cursos editable (campo alumnos, combinación de horas por tipo y grupos).
- Validaciones en cliente que reflejen reglas de negocio (feedback inmediato) y confirmación servidor-side al guardar.
- Generador de vista de impresión (PDF) para los 5 formatos.

## Entregables

- `nueva seccion.md` (este plan).
- Endpoints CRUD en backend y migración Prisma para la(s) nuevas tablas.
- Componentes React/Next.js para las pantallas y validaciones.
- Test unitarios para cálculos de horas y validaciones críticas.
- Script para generar los 5 formatos (PDF/HTML imprimible).

## Cronograma estimado (sprint rápido)

- Día 1: Modelado de datos y migración Prisma + endpoints básicos (semestres, datos docente).
- Día 2–3: Backend: guardar/validar declaración y generación de formatos.
- Día 4–6: Frontend: Pantalla 0, Confirmación datos, Formulario principal (secciones y tabla de cursos).
- Día 7: Tests, ajustes de validaciones y despliegue en entorno de staging.

## Pruebas y criterios de aceptación

- Validación automática del total de horas (ejemplo: Tiempo Completo = 40).
- Rechazo con mensajes claros si alguna sección incumple sus mínimos/máximos.
- Generación de los 5 formatos con datos correctos y nota legal en sedes desconcentradas.

## Observaciones operativas

- Integrar con el proceso existente donde la dirección de escuela carga la asignación lectiva (RN-05).
- Considerar permiso administrativo para editar declaraciones ya aprobadas.
- Priorizar la consistencia entre el mantenedor de docentes y la vista de confirmación de datos.

---

Fecha del plan: 2026-05-28
Autor: Equipo de Análisis — Plan inicial generado
