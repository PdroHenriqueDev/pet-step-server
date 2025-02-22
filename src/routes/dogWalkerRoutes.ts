import express from 'express';
import DogWalker from '../controllers/dogWalkerController';
import {authenticateToken} from '../middleware/authenticateToken';
import multer from 'multer';

const dogWalkerRouter = express.Router();

const upload = multer({storage: multer.memoryStorage()});

dogWalkerRouter.get('/nearest', authenticateToken, DogWalker.nearests);
dogWalkerRouter.get('/recommended', authenticateToken, DogWalker.recommended);
dogWalkerRouter.get(
  '/account-requirements',
  authenticateToken,
  DogWalker.accountPendingItems,
);
dogWalkerRouter.get(
  '/account-status',
  authenticateToken,
  DogWalker.accountStatus,
);
dogWalkerRouter.get('/:id', authenticateToken, DogWalker.findById);

dogWalkerRouter.post('/accept-terms', authenticateToken, DogWalker.acceptTerm);
dogWalkerRouter.post(
  '/notify-closure',
  authenticateToken,
  DogWalker.notifyAboutClosure,
);
dogWalkerRouter.post('/add-account', authenticateToken, DogWalker.addAccount);
dogWalkerRouter.post(
  '/account/document',
  authenticateToken,
  upload.single('document'),
  DogWalker.accountDocument,
);
dogWalkerRouter.post('/', DogWalker.store);
dogWalkerRouter.post(
  '/profile-image',
  authenticateToken,
  upload.single('profile'),
  DogWalker.imageProfile,
);

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
