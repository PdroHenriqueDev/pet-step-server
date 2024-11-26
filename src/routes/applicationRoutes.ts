import express from 'express';
import multer from 'multer';
import ApplicationController from '../controllers/applicationController';

const applicationRouter = express.Router();

const upload = multer({storage: multer.memoryStorage()});

applicationRouter.get(
  '/documents-status',
  ApplicationController.documentsStatus,
);
applicationRouter.get('/list', ApplicationController.list);
applicationRouter.get('/:dogWalkerId', ApplicationController.application);

applicationRouter.post(
  '/upload-document',
  upload.single('document'),
  ApplicationController.sendDocuments,
);
applicationRouter.post('/about-me', ApplicationController.aboutMe);
applicationRouter.post('/profile', ApplicationController.profile);
applicationRouter.post(
  '/deactivate-account',
  ApplicationController.deactivateAccount,
);

applicationRouter.put(
  '/status/:dogWalkerId',
  ApplicationController.updateApplication,
);

export default applicationRouter;
