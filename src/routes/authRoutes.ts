import express from 'express';
import AuthController from '../controllers/authController';
import {authenticateToken} from '../middleware/authenticateToken';

const authRouter = express.Router();

authRouter.post('/login', AuthController.login);
authRouter.post('/recovery-password', AuthController.forgotPassword);
authRouter.post('/reset-password', AuthController.resetPassword);
authRouter.post('/renew-token', AuthController.refreshToken);

authRouter.delete(
  '/remove-account',
  authenticateToken,
  AuthController.removeAccount,
);

export default authRouter;
