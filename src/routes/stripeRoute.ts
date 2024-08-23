import express from 'express';
import StripeController from '../controllers/stripeController';

const router = express.Router();

router.get(
  '/create-setup-intent/:customerId',
  StripeController.createSetupIntent,
);
router.get('/list/:customerId', StripeController.listCustomerPayments);

export default router;
