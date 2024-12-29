import express from 'express';
import { blueprintController } from '../controllers/blueprintController.js';

const blueprintRouter = express.Router();

blueprintRouter.get('/getPaginatedBlueprints', blueprintController.getPaginatedBlueprints);
blueprintRouter.put('/create', blueprintController.createBlueprint);
blueprintRouter.put('/update', blueprintController.updateBlueprint);

export { blueprintRouter };
