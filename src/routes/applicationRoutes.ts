import express from 'express';
import multer from 'multer';
import ApplicationController from '../controllers/applicationController';
import {authenticateToken} from '../middleware/authenticateToken';

const applicationRouter = express.Router();

const upload = multer({storage: multer.memoryStorage()});

applicationRouter.get(
  '/documents-status',
  authenticateToken,
  ApplicationController.documentsStatus,
);

applicationRouter.post(
  '/upload-document',
  authenticateToken,
  upload.single('document'),
  ApplicationController.sendDocuments,
);
applicationRouter.post(
  '/about-me',
  authenticateToken,
  ApplicationController.aboutMe,
);
applicationRouter.post(
  '/profile',
  authenticateToken,
  ApplicationController.profile,
);
applicationRouter.post(
  '/deactivate-account',
  authenticateToken,
  ApplicationController.deactivateAccount,
);

applicationRouter.put(
  '/status/:dogWalkerId',
  authenticateToken,
  ApplicationController.updateApplication,
);

export default applicationRouter;
