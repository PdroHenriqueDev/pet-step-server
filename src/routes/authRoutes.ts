import express from 'express';
import AuthController from '../controllers/authController';

const dogWalkerRouter = express.Router();

dogWalkerRouter.post('/login', AuthController.login);

export default dogWalkerRouter;
