import express from 'express';
import DogWalker from './controllers/DogWalkerController';
const router = express.Router();

router.get('/', (req, res) => {
  res.send('Hello World!');
});

router.get('/dog-walker/nearest', DogWalker.nearests);
router.get('/dog-walker/:id', DogWalker.findById);

router.post('/dog-walker/:id', DogWalker.notification);
router.post('/dog-walker/:id/feedback', DogWalker.feedback);
router.post('/dog-walker', DogWalker.store);

export default router;