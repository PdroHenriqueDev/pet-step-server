import express from 'express';
import Owner from '../controllers/ownerController';
import {authenticateToken} from '../middleware/authenticateToken';
import multer from 'multer';

const router = express.Router();

const upload = multer({storage: multer.memoryStorage()});

router.post('/dog', authenticateToken, Owner.addMoreDog);
router.post(
  '/profile-image',
  authenticateToken,
  upload.single('profile'),
  Owner.imageProfile,
);
router.post('/notify-all', authenticateToken, Owner.notifyAll);
router.post('/', Owner.store);

router.get('/payment/set-up-intent', authenticateToken, Owner.paymentIntent);
router.get('/payment', authenticateToken, Owner.payments);
router.get('/dogs-breeds', authenticateToken, Owner.listBreeds);
router.get('/dogs-breeds/search', authenticateToken, Owner.searchBreeds);
router.get('/dogs-breeds/:breedId', authenticateToken, Owner.getBreedById);
router.get('/:id', authenticateToken, Owner.findById);

router.put('/update', authenticateToken, Owner.updateField);
router.put('/dog/:dogId', authenticateToken, Owner.updateDog);
router.put(
  '/:id/defaultPayment',
  authenticateToken,
  Owner.updateDefaultPaymentMethod,
);

router.delete('/dog/:dogId', authenticateToken, Owner.deleteDog);

export default router;
