import express from 'express';
import Owner from '../controllers/ownerController';

const router = express.Router();

router.post('/', Owner.store);

router.get('/:id', Owner.findById);

export default router;
