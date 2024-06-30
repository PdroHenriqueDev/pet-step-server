import express from 'express';
import dogWalkerRoutes from './dogWalkerRoutes';
import ownerRoutes from './ownerRoutes';

const router = express.Router();

router.get('/', (req, res) => {
  res.send('Hello World!');
});

router.use('/dog-walker', dogWalkerRoutes);
router.use('/owner', ownerRoutes);

export default router;
