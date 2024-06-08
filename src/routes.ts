import express from 'express';
import DogWalker from './controllers/DogWalkerController';
const router = express.Router();

const dogWalkerController = new DogWalker();

router.get('/', (req, res) => {
  res.send('Hello World!');
});

router.post('/dog-walker', dogWalkerController.store);
router.get('/dog-walker/nearest', dogWalkerController.nearests);

export default router;