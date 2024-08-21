import express from 'express';
import Owner from '../controllers/ownerController';

const router = express.Router();

router.post('/', Owner.store);

router.get('/payments/:id', Owner.payments);
router.get('/:id', Owner.findById);

router.put('/:id/defaultPayment', Owner.updateDefaultPaymentMethod);

export default router;
