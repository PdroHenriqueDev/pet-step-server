import express from 'express';
import PaymentController from '../controllers/paymentController';

const router = express.Router();

router.get(
  '/create-setup-intent/:customerId',
  PaymentController.createSetupIntent,
);
router.get('/list/:customerId', PaymentController.listCustomerPayments);
router.get(
  '/account-requirements/:accountId',
  PaymentController.listAccountRequirements,
);
router.get(
  '/account-balance-transactions/:accountId',
  PaymentController.accountBalanceTransactions,
);
router.get('/account-balance/:accountId', PaymentController.accountBalance);
router.get('/account-transfers/:accountId', PaymentController.accountTransfers);

router.delete(
  '/remove/:ownerId/:paymentMethodId',
  PaymentController.removePayment,
);

router.post('/add-account/:accountId', PaymentController.addExternalAccount);

export default router;
