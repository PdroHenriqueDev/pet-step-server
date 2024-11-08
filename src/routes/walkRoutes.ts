import express from 'express';
import WalkController from '../controllers/walkController';

const dogWalkerRouter = express.Router();

dogWalkerRouter.get('/list/:ownerId', WalkController.listWalks);
dogWalkerRouter.get('/request/:requestId', WalkController.requestById);
dogWalkerRouter.get('/status/:requestId', WalkController.status);
dogWalkerRouter.get('/:requestId', WalkController.walkData);
dogWalkerRouter.get('/dog-walker/list', WalkController.walksByDogWalker);

dogWalkerRouter.post('/calculate-cost', WalkController.calculateCost);
dogWalkerRouter.post('/request/:calculationId', WalkController.requestWalk);
dogWalkerRouter.post('/accept/:requestId', WalkController.acceptRide);
dogWalkerRouter.post('/start/:requestId', WalkController.start);
dogWalkerRouter.post('/finalize/:requestId', WalkController.finalize);

dogWalkerRouter.delete('/owner/cancel', WalkController.ownerCancel);
dogWalkerRouter.delete('/deny/:requestId', WalkController.deny);
dogWalkerRouter.delete('/cancel/:requestId', WalkController.cancel);

export default dogWalkerRouter;
