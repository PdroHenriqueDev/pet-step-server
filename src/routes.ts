import express from 'express';
import DogWalker from './controllers/DogWalkerController';
const router = express.Router();

const dogWalkerController = new DogWalker();

router.get('/', (req, res) => {
  res.send('Hello World!');
});

router.get('/dog-walker/nearest', dogWalkerController.nearests);
router.get('/dog-walker/:id', dogWalkerController.findById);

router.post('/dog-walker/:id', dogWalkerController.notification);
router.post('/dog-walker', dogWalkerController.store);

export default router;