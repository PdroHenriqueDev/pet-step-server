import express from 'express';
import Owner from '../controllers/ownerController';
import {authenticateToken} from '../middleware/authenticateToken';

const router = express.Router();

router.post('/dog', authenticateToken, Owner.addMoreDog);
router.post('/', Owner.store);

router.get('/payments/:id', Owner.payments);
router.get('/dogs-breeds', authenticateToken, Owner.listBreeds);
router.get('/dogs-breeds/search', authenticateToken, Owner.searchBreeds);
router.get('/dogs-breeds/:breedId', authenticateToken, Owner.getBreedById);
router.get('/:id', authenticateToken, Owner.findById);

router.put('/:id/defaultPayment', Owner.updateDefaultPaymentMethod);

export default router;
