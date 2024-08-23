import express from 'express';
import dogWalkerRoutes from './dogWalkerRoutes';
import ownerRoutes from './ownerRoutes';
import stripeRoutes from './stripeRoute';
import walkRoutes from './walkRoutes';

const router = express.Router();

router.get('/', (req, res) => {
  res.send('Hello World!');
});

router.use('/dog-walker', dogWalkerRoutes);
router.use('/owner', ownerRoutes);
router.use('/payment', stripeRoutes);
router.use('/walk', walkRoutes);

export default router;
