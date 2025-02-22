import express from 'express';
import AdminController from '../controllers/adminController';
import {authenticateToken} from '../middleware/authenticateToken';

const router = express.Router();

router.post('/auth', AdminController.login);
router.post('/', authenticateToken, AdminController.store);
router.post(
  '/reset-user-password',
  authenticateToken,
  AdminController.resetUserPassword,
);
router.post(
  '/dog-walker/add-account',
  authenticateToken,
  AdminController.addAccountToDogWalker,
);

export default router;
