import express from 'express';
import FeedbackController from '../controllers/feedbackController';

const feedbackRouter = express.Router();

feedbackRouter.post('/', FeedbackController.feedback);
feedbackRouter.post('/remove', FeedbackController.removePendingFeedback);

export default feedbackRouter;
