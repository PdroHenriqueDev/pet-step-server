import express from 'express';
import DogWalker from '../controllers/dogWalkerController';
import {authenticateToken} from '../middleware/authenticateToken';

const dogWalkerRouter = express.Router();

dogWalkerRouter.get('/nearest', authenticateToken, DogWalker.nearests);
dogWalkerRouter.get('/recommended', authenticateToken, DogWalker.recommeded);
dogWalkerRouter.get('/:id', authenticateToken, DogWalker.findById);

// dogWalkerRouter.post('/:id', DogWalker.notification);
dogWalkerRouter.post('/:id/feedback', authenticateToken, DogWalker.feedback);
dogWalkerRouter.post('/', DogWalker.store);

export default dogWalkerRouter;
