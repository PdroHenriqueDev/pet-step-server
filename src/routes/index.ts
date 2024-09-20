import express from 'express';
import dogWalkerRoutes from './dogWalkerRoutes';
import ownerRoutes from './ownerRoutes';
import paymentRoutes from './paymentRoute';
import walkRoutes from './walkRoutes';
import authRoutes from './authRoutes';
import applicationRoutes from './applicationRoutes';

const router = express.Router();

router.get('/', (req, res) => {
  res.send('Hello World!');
});

router.use('/dog-walker', dogWalkerRoutes);
router.use('/owner', ownerRoutes);
router.use('/payment', paymentRoutes);
router.use('/walk', walkRoutes);
router.use('/auth', authRoutes);
router.use('/application', applicationRoutes);

export default router;
