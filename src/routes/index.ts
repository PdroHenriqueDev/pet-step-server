import express from 'express';
import dogWalkerRoutes from './dogWalkerRoutes';
import ownerRoutes from './ownerRoutes';
import paymentRoutes from './paymentRoute';
import walkRoutes from './walkRoutes';
import authRoutes from './authRoutes';
import applicationRoutes from './applicationRoutes';
import notificationRoutes from './notificationRoutes';
import adminRoutes from './adminRoutes';
import feedbackRoutes from './feedbackRoutes';
import staticDataRoutes from './staticDataRoutes';
import {authenticateToken} from '../middleware/authenticateToken';

const router = express.Router();

router.get('/', (req, res) => {
  res.send('Hello, World!');
});

router.use('/dog-walker', dogWalkerRoutes);
router.use('/owner', ownerRoutes);
router.use('/payment', authenticateToken, paymentRoutes);
router.use('/walk', authenticateToken, walkRoutes);
router.use('/auth', authRoutes);
router.use('/application', authenticateToken, applicationRoutes);
router.use('/notification', authenticateToken, notificationRoutes);
router.use('/admin', adminRoutes);
router.use('/feedback', authenticateToken, feedbackRoutes);
router.use('/static-data', authenticateToken, staticDataRoutes);

export default router;
