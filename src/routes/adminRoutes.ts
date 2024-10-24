import express from 'express';
import AdminController from '../controllers/adminController';
import {authenticateToken} from '../middleware/authenticateToken';

const router = express.Router();

router.post('/', authenticateToken, AdminController.store);
router.post('/auth', AdminController.login);
router.post('/reset-user-password', AdminController.resetUserPassword);

export default router;
