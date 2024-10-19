import {Request, Response} from 'express';
import DogWalkerRepository from '../repositories/dogWalkerRepository';
import {DogWalkerProps} from '../interfaces/dogWalker';
import {ApiResponse} from '../interfaces/apitResponse';

class DogWalker {
  async store(req: Request, res: Response): Promise<Response<ApiResponse>> {
    const requiredFields = [
      'name',
      'lastName',
      'document',
      'birthdate',
      'email',
      'password',
      'address',
      'phone',
    ];
    const missingField = requiredFields.find(field => !req.body[field]);

    if (missingField) {
      return res
        .status(400)
        .send({data: `O campo "${missingField}" é obrigatório.`});
    }

    const {
      name,
      lastName,
      birthdate,
      email,
      password,
      document,
      address,
      phone,
    } = req.body;
    const walker: DogWalkerProps = {
      name,
      lastName,
      birthdate,
      email,
      phone,
      address,
      document,
      password,
    };

    // const reqIp = req.ip;

    const response = await DogWalkerRepository.addDogWalker(
      walker,
      // reqIp as string,
    );
    const {status} = response;

    return res.status(status).send(response);
  }

  async nearests(req: Request, res: Response) {
    const {latitude, longitude} = req.query;
    if (!latitude || !longitude) {
      return res.status(400).send({error: 'Requisição inválida'});
    }

    const response = await DogWalkerRepository.findNearestDogWalkers(
      parseFloat(latitude as string),
      parseFloat(longitude as string),
    );

    const {status, data} = response;
    return res.status(status).send(data);
  }

  async recommeded(req: Request, res: Response) {
    const {latitude, longitude} = req.query;
    if (!latitude || !longitude) {
      return res.status(400).send({error: 'Requisição inválida'});
    }

    const response = await DogWalkerRepository.findRecommededDogWalkers(
      parseFloat(latitude as string),
      parseFloat(longitude as string),
    );

    const {status, data} = response;
    return res.status(status).send(data);
  }

  async findById(req: Request, res: Response) {
    const {id} = req.params;
    if (!id) {
      return res.status(400).send({error: 'Dog walker não encontrado'});
    }

    const response = await DogWalkerRepository.findDogWalkerById(id);

    const {status} = response;
    return res.status(status).send(response);
  }

  // async notification(req: Request, res: Response) {
  //   const {id} = req.params;
  //   const {title, body} = req.body;

  //   if (!id) {
  //     return res.status(400).send({error: 'Dog walker não encontrado'});
  //   }

  //   if (!title || !body) {
  //     return res.status(400).send({error: 'Requisição inválida'});
  //   }

  //   const response = await DogWalkerRepository.sendNotificationDogWalker({
  //     dogWalkerId: id,
  //     title,
  //     body,
  //   });

  //   const {status, data, error} = response as any;

  //   return res.status(status).send(data ?? error);
  // }

  async feedback(req: Request, res: Response) {
    const {id} = req.params;

    if (!id) return res.status(400).send({error: 'Dog walker não encontrado'});

    const {rate, comment} = req.body;

    if (!rate) return res.status(400).send({error: 'Requisição inválida'});

    const response = await DogWalkerRepository.saveFeedback({
      dogWalkerId: id,
      rate,
      comment,
    });

    const {status, data} = response;
    return res.status(status).send(data);
  }

  async updateLocation(
    req: Request,
    res: Response,
  ): Promise<Response<ApiResponse>> {
    const {id} = req.params;

    if (!id) return res.status(400).send({error: 'Dog walker não encontrado'});

    const {longitude, latitude} = req.body;

    if (!longitude || !latitude)
      return res.status(400).send({error: 'Requisição inválida'});

    const response = await DogWalkerRepository.addLocationToDogWalker({
      walkerId: id,
      longitude,
      latitude,
    });

    const {status, data} = response;
    return res.status(status).send(data);
  }

  async updateAvailability(
    req: Request,
    res: Response,
  ): Promise<Response<ApiResponse>> {
    const userId = req.user?.id;

    if (!userId)
      return res.status(400).send({data: 'Dog walker não encontrado'});

    const {isOnline, longitude, latitude} = req.body;

    if (typeof isOnline !== 'boolean')
      return res.status(400).send({data: 'Requisição inválida'});

    if (isOnline === true && (!longitude || !latitude))
      return res.status(400).send({data: 'Requisição inválida'});

    const response = await DogWalkerRepository.updateOnlineStatus({
      dogWalkerId: userId,
      isOnline,
      longitude,
      latitude,
    });

    const {status} = response;
    return res.status(status).send(response);
  }

  async acceptTerm(
    req: Request,
    res: Response,
  ): Promise<Response<ApiResponse>> {
    const userId = req.user?.id;

    if (!userId)
      return res.status(400).send({data: 'Dog walker não encontrado'});

    const response = await DogWalkerRepository.termsAcceptance(userId);

    const {status} = response;
    return res.status(status).send(response);
  }
}

export default new DogWalker();
