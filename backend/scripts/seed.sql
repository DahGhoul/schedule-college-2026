-- Inserta datos de ejemplo para pruebas
BEGIN;

-- Período
INSERT INTO periodo_academico (nombre, fecha_inicio, fecha_fin, estado) VALUES
('2026-I', '2026-06-08', '2026-10-30', 'ACTIVO');

-- Docentes
INSERT INTO docente (nombres, apellidos, email, telefono, modalidad, categoria, antiguedad) VALUES
('Juan', 'Pérez Gómez', 'jperez@unt.edu.pe', '999000111', 'NOMBRADO', 'PRINCIPAL', 15),
('Pedro', 'Sánchez López', 'psanchez@unt.edu.pe', '999000222', 'NOMBRADO', 'PRINCIPAL', 12),
('Rosa', 'Martínez Díaz', 'rmartinez@unt.edu.pe', '999000333', 'NOMBRADO', 'ASOCIADO', 10),
('Carlos', 'Torres Ríos', 'ctorres@unt.edu.pe', '999000444', 'CONTRATADO', 'PRINCIPAL', 8),
('María', 'García Vega', 'mgarcia@unt.edu.pe', '999000555', 'CONTRATADO', 'AUXILIAR', 5);

-- Cursos
INSERT INTO curso (nombre, codigo, horas_teoria, horas_laboratorio, creditos) VALUES
('Programación I', 'IS101', 4, 2, 4),
('Estructura de Datos', 'IS201', 4, 2, 4),
('Base de Datos', 'IS301', 4, 2, 4),
('Ingeniería de Software', 'IS401', 4, 2, 4);

-- Ambientes
INSERT INTO ambiente (codigo, tipo, capacidad, piso, equipamiento) VALUES
('A-101', 'AULA', 40, 1, 'Proyector, pizarra'),
('A-102', 'AULA', 35, 1, 'Proyector, pizarra'),
('A-201', 'AULA', 50, 2, 'Proyector, pizarra inteligente'),
('A-301', 'AULA', 30, 3, 'Proyector'),
('LAB-1', 'LABORATORIO', 25, 1, '25 PC, proyector'),
('LAB-2', 'LABORATORIO', 30, 1, '30 PC, proyector'),
('LAB-3', 'LABORATORIO', 20, 2, '20 PC');

-- Asignación docente-curso (preasignación)
INSERT INTO docente_curso (id_docente, id_curso) VALUES
(1, 1), (1, 2), (2, 3), (3, 4), (4, 1), (5, 2);

-- Curso-Ambiente (configuración de ambientes válidos)
INSERT INTO curso_ambiente (id_curso, id_ambiente, tipo_clase) VALUES
(1, 1, 'TEORIA'), (1, 2, 'TEORIA'), (1, 5, 'LABORATORIO'),
(2, 1, 'TEORIA'), (2, 6, 'LABORATORIO'),
(3, 2, 'TEORIA'), (3, 7, 'LABORATORIO');

-- Grupos
INSERT INTO grupo (id_curso, codigo_grupo, capacidad_maxima) VALUES
(1, 'A', 40),
(1, 'B', 40),
(2, 'A', 35);

-- Configuración institucional
INSERT INTO configuracion (id_periodo, clave, valor) VALUES
(1, 'FRANJA_INICIO', '07:00'),
(1, 'FRANJA_FIN', '22:00'),
(1, 'HORAS_MAX_DIARIAS', '8'),
(1, 'BLOQUEO_ALMUERZO_INICIO', '12:00'),
(1, 'BLOQUEO_ALMUERZO_FIN', '13:00');

COMMIT;