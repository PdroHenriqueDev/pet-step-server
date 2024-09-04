import express from 'express';
import WalkController from '../controllers/WalkController';

const dogWalkerRouter = express.Router();

dogWalkerRouter.get('/list/:ownerId', WalkController.listWalks);
dogWalkerRouter.get('/request/:requestId', WalkController.requestById);
dogWalkerRouter.get('/:requestId', WalkController.walkData);

dogWalkerRouter.post('/calculate-cost', WalkController.calculateCost);
dogWalkerRouter.post('/request/:calculationId', WalkController.requestWalk);
dogWalkerRouter.post('/accept/:requestId', WalkController.acceptRide);

export default dogWalkerRouter;
