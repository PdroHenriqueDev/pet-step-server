import express from 'express';
import multer from 'multer';
import ApplicationController from '../controllers/application';
import {authenticateToken} from '../middleware/authenticateToken';

const authRouter = express.Router();

const upload = multer({storage: multer.memoryStorage()});

authRouter.get(
  '/documents-status',
  authenticateToken,
  ApplicationController.documentsStatus,
);

authRouter.post(
  '/upload-document',
  authenticateToken,
  upload.single('document'),
  ApplicationController.sendDocuments,
);
authRouter.post('/about-me', authenticateToken, ApplicationController.aboutMe);

export default authRouter;
