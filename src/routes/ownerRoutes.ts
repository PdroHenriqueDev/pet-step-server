import express from 'express';
import Owner from '../controllers/OwnerController';

const router = express.Router();

router.post('/', Owner.store);

export default router;
