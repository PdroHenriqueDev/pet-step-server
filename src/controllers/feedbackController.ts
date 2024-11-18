import {Request, Response} from 'express';
import {ApiResponse} from '../interfaces/apitResponse';
import FeedbackRepository from '../repositories/feedbackRepository';
import {UserRole} from '../enums/role';

class FeedbackController {
  async feedback(req: Request, res: Response): Promise<Response<ApiResponse>> {
    const {id, role} = req.user;

    const requiredFields = ['requestId', 'rate', 'reviewedId'];
    const missingField = requiredFields.find(field => !req.body[field]);

    if (missingField) {
      return res
        .status(400)
        .send({data: `O campo "${missingField}" é obrigatório.`});
    }

    const {requestId, comment, rate, reviewedId} = req.body;

    const response = await FeedbackRepository.saveFeedback({
      reviewerId: id,
      reviewedId,
      rate,
      comment,
      requestId,
      roleOfReviewer: role,
      roleOfReviewed:
        role === UserRole.DogWalker ? UserRole.Owner : UserRole.DogWalker,
    });

    const {status} = response;
    return res.status(status).send(response);
  }

  async removePendingFeedback(
    req: Request,
    res: Response,
  ): Promise<Response<ApiResponse>> {
    const {id, role} = req.user;

    if (!id || !role) {
      return res.status(400).send({data: 'Requisição inválida.'});
    }

    const response = await FeedbackRepository.removePendingFeedback(id, role);

    const {status} = response;
    return res.status(status).send(response);
  }
}

export default new FeedbackController();
