import express from 'express';
import AuthController from '../controllers/authController';

const authRouter = express.Router();

authRouter.post('/login', AuthController.login);
authRouter.post('/recovery-password', AuthController.forgotPassword);
authRouter.post('/reset-password', AuthController.resetPassword);

export default authRouter;
