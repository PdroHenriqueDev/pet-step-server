import express from 'express';
import DogWalker from '../controllers/dogWalkerController';

const dogWalkerRouter = express.Router();

dogWalkerRouter.get('/nearest', DogWalker.nearests);
dogWalkerRouter.get('/recommed', DogWalker.recommeded);
dogWalkerRouter.get('/:id', DogWalker.findById);

dogWalkerRouter.post('/calculate-cost', DogWalker.calculateCost);
dogWalkerRouter.post('/:id', DogWalker.notification);
dogWalkerRouter.post('/:id/feedback', DogWalker.feedback);
dogWalkerRouter.post('/', DogWalker.store);

export default dogWalkerRouter;
