import { Router } from 'express';
import { ChatController } from './chat.controller';

const router = Router();

router.post('/consulta', ChatController.consultar);

export default router;
