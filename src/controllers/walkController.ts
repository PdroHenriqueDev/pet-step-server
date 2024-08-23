import {Request, Response} from 'express';
import WalkRepository from '../repositories/walkRepository';

class WalkController {
  async calculateCost(req: Request, res: Response) {
    const {
      dogWalkerId,
      numberOfDogs,
      walkDurationMinutes,
      ownerId,
      receivedLocation,
    } = req.body;

    if (!dogWalkerId || !ownerId)
      return res.status(400).send({message: 'Requisição inválida'});

    if (!numberOfDogs || !walkDurationMinutes) {
      return res.status(400).send({
        message: !numberOfDogs
          ? 'Número de cachorros são obrigatórios'
          : 'Duração do passeio é obrigatório',
      });
    }

    if (numberOfDogs > 3)
      return res
        .status(400)
        .send({message: 'Somente é permitido até 3 dogs por passeio'});

    if (numberOfDogs <= 0 || walkDurationMinutes <= 0) {
      return {
        status: 400,
        error:
          numberOfDogs <= 0
            ? 'Número de cachorros deve ser maiore que zero.'
            : 'Duração deve ser maior que zero.',
      };
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

  async requestWalk(req: Request, res: Response) {
    const {calculationId} = req.params;

    if (!calculationId) {
      return res.status(400).send({message: 'Requisição inválida'});
    }

    const response = await WalkRepository.requestWalk(calculationId);

    const {status, data} = response;
    return res.status(status).send(data);
  }

  async acceptRide(req: Request, res: Response) {
    const {requestId} = req.params;

    if (!requestId) {
      return res.status(400).send({message: 'Requisição inválida'});
    }

    const response = await WalkRepository.acceptRide(requestId);

    const {status, data} = response;
    return res.status(status).send(data);
  }

  async requestById(req: Request, res: Response) {
    const {requestId} = req.params;

    if (!requestId) {
      return res.status(400).send({message: 'Requisição inválida'});
    }

    const response = await WalkRepository.getRequestById(requestId);

    const {status, data} = response;
    return res.status(status).send(data);
  }
}

export default new WalkController();
