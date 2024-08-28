import express from 'express';
import PaymentController from '../controllers/paymentController';

const router = express.Router();

router.get(
  '/create-setup-intent/:customerId',
  PaymentController.createSetupIntent,
);
router.get('/list/:customerId', PaymentController.listCustomerPayments);

router.delete(
  '/remove/:ownerId/:paymentMethodId',
  PaymentController.removePayment,
);

export default router;
