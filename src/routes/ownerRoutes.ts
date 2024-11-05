import express from 'express';
import Owner from '../controllers/ownerController';
import {authenticateToken} from '../middleware/authenticateToken';

const router = express.Router();

router.post('/dog', authenticateToken, Owner.addMoreDog);
router.post('/', Owner.store);

router.get('/payment/set-up-intent', authenticateToken, Owner.paymentIntent);
router.get('/payment', authenticateToken, Owner.payments);
router.get('/dogs-breeds', authenticateToken, Owner.listBreeds);
router.get('/dogs-breeds/search', authenticateToken, Owner.searchBreeds);
router.get('/dogs-breeds/:breedId', authenticateToken, Owner.getBreedById);
router.get('/:id', authenticateToken, Owner.findById);

router.put('/update', authenticateToken, Owner.updateField);
router.put(
  '/:id/defaultPayment',
  authenticateToken,
  Owner.updateDefaultPaymentMethod,
);

export default router;
