import express from 'express';
import DogWalker from '../controllers/DogWalkerController';

const dogWalkerRouter = express.Router();

dogWalkerRouter.get('/nearest', DogWalker.nearests);
dogWalkerRouter.get('/:id', DogWalker.findById);

dogWalkerRouter.post('/:id', DogWalker.notification);
dogWalkerRouter.post('/:id/feedback', DogWalker.feedback);
dogWalkerRouter.post('/', DogWalker.store);

export default dogWalkerRouter;
