import {Request, Response} from 'express';
import WalkRepository from '../repositories/walkRepository';
import {ApiResponse} from '../interfaces/apitResponse';

class WalkController {
  async calculateCost(
    req: Request,
    res: Response,
  ): Promise<Response<ApiResponse>> {
    const {
      dogWalkerId,
      numberOfDogs,
      walkDurationMinutes,
      ownerId,
      receivedLocation,
    } = req.body;

    if (!dogWalkerId || !ownerId)
      return res.status(400).send({status: 400, data: 'Requisição inválida'});

    if (!numberOfDogs || !walkDurationMinutes) {
      return res.status(400).send({
        status: 400,
        data: !numberOfDogs
          ? 'Número de cachorros é obrigatório'
          : 'Duração do passeio é obrigatória',
      });
    }

    if (numberOfDogs > 3) {
      return res.status(400).send({
        status: 400,
        data: 'Somente é permitido até 3 dogs por passeio',
      });
    }

    if (numberOfDogs <= 0 || walkDurationMinutes <= 0) {
      return res
        .status(400)
        .send(
          numberOfDogs <= 0
            ? 'Número de cachorros deve ser maiore que zero.'
            : 'Duração deve ser maior que zero.',
        );
    }

    const response = await WalkRepository.calculateWalk({
      ownerId,
      dogWalkerId,
      numberOfDogs,
      walkDurationMinutes,
      receivedLocation,
    });

    const {status, data} = response;
    return res.status(status).send(data);
  }

  async requestWalk(
    req: Request,
    res: Response,
  ): Promise<Response<ApiResponse>> {
    const {calculationId} = req.params;

    if (!calculationId) {
      return res.status(400).send({status: 400, data: 'Requisição inválida'});
    }

    const response = await WalkRepository.requestWalk(calculationId);

    const {status} = response;
    return res.status(status).send(response);
  }

  async acceptRide(
    req: Request,
    res: Response,
  ): Promise<Response<ApiResponse>> {
    const {requestId} = req.params;

    if (!requestId) {
      return res.status(400).send({data: 'Requisição inválida'});
    }

    const response = await WalkRepository.acceptRide(requestId);

    const {status} = response;
    return res.status(status).send(response);
  }

  async requestById(
    req: Request,
    res: Response,
  ): Promise<Response<ApiResponse>> {
    const {requestId} = req.params;

    if (!requestId) {
      return res.status(400).send({status: 400, data: 'Requisição inválida'});
    }

    const response = await WalkRepository.getRequestById(requestId);

    const {status} = response;
    return res.status(status).send(response);
  }

  async walkData(req: Request, res: Response) {
    const {requestId} = req.params;

    if (!requestId) {
      return res.status(400).send({data: 'Requisição inválida'});
    }

    const response = await WalkRepository.getRequestData(requestId);

    const {status, data} = response;
    return res.status(status).send(data);
  }
  async listWalks(req: Request, res: Response) {
    const {ownerId} = req.params;
    const {page} = req.query;

    if (!ownerId) {
      return res.status(400).send({data: 'Requisição inválida'});
    }

    const pageNumber = parseInt(page as string, 10) || 1;

    const response = await WalkRepository.requestsByOwner(ownerId, pageNumber);

    const {status, data} = response;
    return res.status(status).send(data);
  }

  async deny(req: Request, res: Response): Promise<Response<ApiResponse>> {
    const {requestId} = req.params;

    const role = req.user.role;

    if (!requestId) {
      return res.status(400).send({status: 400, data: 'Requisição inválida'});
    }

    const response = await WalkRepository.denyWalk(requestId, role);

    const {status} = response;
    return res.status(status).send(response);
  }

  async cancel(req: Request, res: Response): Promise<Response<ApiResponse>> {
    const {requestId} = req.params;

    const role = req.user.role;

    if (!requestId) {
      return res.status(400).send({status: 400, data: 'Requisição inválida'});
    }

    const response = await WalkRepository.cancelWalk(requestId, role);

    const {status} = response;
    return res.status(status).send(response);
  }
}

export default new WalkController();
