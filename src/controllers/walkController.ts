import {Request, Response} from 'express';
import WalkRepository from '../repositories/walkRepository';
import {ApiResponse} from '../interfaces/apitResponse';
import {UserRole} from '../enums/role';

class WalkController {
  async calculateCost(
    req: Request,
    res: Response,
  ): Promise<Response<ApiResponse>> {
    const {dogWalkerId, dogs, walkDurationMinutes, ownerId, receivedLocation} =
      req.body;

    if (!dogWalkerId || !ownerId)
      return res.status(400).send({status: 400, data: 'Requisição inválida'});

    if (!dogs || !walkDurationMinutes) {
      return res.status(400).send({
        status: 400,
        data: !dogs
          ? 'Cachorro é obrigatório'
          : 'Duração do passeio é obrigatória',
      });
    }

    if (dogs.length > 4) {
      return res.status(400).send({
        status: 400,
        data: 'Somente é permitido até 3 dogs por passeio',
      });
    }

    if (dogs.length <= 0 || walkDurationMinutes <= 0) {
      return res
        .status(400)
        .send(
          dogs <= 0
            ? 'Número de cachorros deve ser maiore que zero.'
            : 'Duração deve ser maior que zero.',
        );
    }

    const response = await WalkRepository.calculateWalk({
      ownerId,
      dogWalkerId,
      dogs,
      walkDurationMinutes,
      receivedLocation,
    });

    const {status} = response;
    return res.status(status).send(response);
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
    const {id} = req.user;
    const {page} = req.query;

    if (!id) {
      return res.status(400).send({data: 'Requisição inválida'});
    }

    const pageNumber = parseInt(page as string, 10) || 1;

    const response = await WalkRepository.requestsByOwner(id, pageNumber);

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

  async ownerCancel(
    req: Request,
    res: Response,
  ): Promise<Response<ApiResponse>> {
    const {role, id} = req.user;

    if (!role || !id) {
      return res.status(400).send({status: 400, data: 'Requisição inválida'});
    }

    const response = await WalkRepository.ownerCancelWalk(id);

    const {status} = response;
    return res.status(status).send(response);
  }

  async start(req: Request, res: Response): Promise<Response<ApiResponse>> {
    const {requestId} = req.params;

    const role = req.user.role;

    if (!requestId) {
      return res.status(400).send({status: 400, data: 'Requisição inválida'});
    }

    const response = await WalkRepository.startWalk(requestId, role);

    const {status} = response;
    return res.status(status).send(response);
  }

  async status(req: Request, res: Response): Promise<Response<ApiResponse>> {
    const {requestId} = req.params;

    if (!requestId) {
      return res.status(400).send({status: 400, data: 'Requisição inválida'});
    }

    const response = await WalkRepository.getWalkStatus(requestId);

    const {status} = response;
    return res.status(status).send(response);
  }

  async finalize(req: Request, res: Response): Promise<Response<ApiResponse>> {
    const {requestId} = req.params;

    const role = req.user.role;

    if (!requestId || role !== UserRole.DogWalker) {
      return res.status(400).send({status: 400, data: 'Requisição inválida'});
    }

    const response = await WalkRepository.completeWalk(requestId);

    const {status} = response;
    return res.status(status).send(response);
  }

  async walksByDogWalker(req: Request, res: Response) {
    const dogWalkerId = req?.user?.id;
    const {page} = req.query;

    if (!dogWalkerId) {
      return res.status(400).send({data: 'Requisição inválida'});
    }

    const pageNumber = parseInt(page as string, 10) || 1;

    const response = await WalkRepository.requestsByDogWalker(
      dogWalkerId,
      pageNumber,
    );

    const {status} = response;
    return res.status(status).send(response);
  }
}

export default new WalkController();
