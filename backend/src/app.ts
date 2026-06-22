import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rutasAuth from './modules/auth/auth.routes';
import rutasPeriodos from './modules/periodos/periodos.routes';
import rutasDocentes from './modules/docentes/docentes.routes';
import rutasCursos from './modules/cursos/cursos.routes';
import rutasAmbientes from './modules/ambientes/ambientes.routes';
import rutasGrupos from './modules/grupos/grupos.routes';
import rutasConfiguracion from './modules/configuracion/configuracion.routes';
import rutasVentanas from './modules/ventanas/ventanas.routes';
import rutasHorarios from './modules/horarios/horarios.routes';
import rutasAuditoria from './modules/auditoria/auditoria.routes';
import rutasEstadisticas from './modules/estadisticas/estadisticas.routes';
import rutasReportes from './modules/reportes/reportes.routes';
import rutasNotificaciones from './modules/notificaciones/notificaciones.routes';
import rutasDisponibilidad from './modules/disponibilidad/disponibilidad.routes';
import rutasUsuarios from './modules/usuarios/usuarios.routes';
import rutasCargaHoraria from './modules/carga-horaria/carga-horaria.routes';
import rutasCargaNoLectiva from './modules/carga-no-lectiva/carga-no-lectiva.routes';
import rutasCurricula from './modules/curricula/curricula.routes';

const app: Express = express();

// Middlewares globales
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use('/api/auth', rutasAuth);
app.use('/api/periodos', rutasPeriodos);
app.use('/api/docentes', rutasDocentes);
app.use('/api/cursos', rutasCursos);
app.use('/api/ambientes', rutasAmbientes);
app.use('/api/grupos', rutasGrupos);
app.use('/api/configuracion', rutasConfiguracion);
app.use('/api/ventanas', rutasVentanas);
app.use('/api/horarios', rutasHorarios);
app.use('/api/auditoria', rutasAuditoria);
app.use('/api/estadisticas', rutasEstadisticas);
app.use('/api/reportes', rutasReportes);
app.use('/api/notificaciones', rutasNotificaciones);
app.use('/api/disponibilidad', rutasDisponibilidad);
app.use('/api/usuarios', rutasUsuarios);
app.use('/api/carga-horaria', rutasCargaHoraria);
app.use('/api/carga-no-lectiva', rutasCargaNoLectiva);
app.use('/api/curricula', rutasCurricula);


// Ruta de salud
app.get('/api/salud', (req, res) => {
  res.json({ estado: 'ok', servicio: 'horarios-unt-backend' });
});

// Aquí se montarán las rutas de los módulos en fases posteriores
// app.use('/api/auth', rutasAuth);

export default app;