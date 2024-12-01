import express from 'express';
import StaticDataController from '../controllers/staticDataController';

const staticDataRouter = express.Router();

staticDataRouter.get('/banks', StaticDataController.listBanks);

export default staticDataRouter;
