import express from 'express';
import DogWalker from '../controllers/dogWalkerController';
import {authenticateToken} from '../middleware/authenticateToken';

const dogWalkerRouter = express.Router();

dogWalkerRouter.get('/nearest', DogWalker.nearests);
dogWalkerRouter.get('/recommended', DogWalker.recommeded);
dogWalkerRouter.get('/:id', authenticateToken, DogWalker.findById);

dogWalkerRouter.post('/accept-terms', authenticateToken, DogWalker.acceptTerm);
dogWalkerRouter.post('/:id/feedback', DogWalker.feedback);
dogWalkerRouter.post('/', DogWalker.store);

dogWalkerRouter.put(
  '/update-location/:id',
  authenticateToken,
  DogWalker.updateLocation,
);
dogWalkerRouter.put(
  '/update-availability',
  authenticateToken,
  DogWalker.updateAvailability,
);
dogWalkerRouter.put('/update', authenticateToken, DogWalker.updateField);

export default dogWalkerRouter;
