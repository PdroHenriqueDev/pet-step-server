import {Request, Response} from 'express';
import {ApiResponse} from '../interfaces/apitResponse';
import ApplicationRepository from '../repositories/applicationRepository';
import jwt, {JwtPayload} from 'jsonwebtoken';
import {Availability, DogExperience, Transport} from '../types/application';

class ApplicationController {
  async sendDocuments(
    req: Request,
    res: Response,
  ): Promise<Response<ApiResponse>> {
    const token = req.headers.authorization?.split(' ')[1];
    const {documentType} = req.body;
    const file = req.file;

    try {
      if (!token || !documentType) {
        return res.status(400).send({status: 400, data: 'Requisição inválida'});
      }

      if (!file) {
        return res
          .status(400)
          .json({status: 400, data: 'Nenhum arquivo enviado'});
      }

      const user = jwt.verify(
        token,
        process.env.JWT_SECRET_ACCESS_TOKEN!,
      ) as JwtPayload;

      if (!user) {
        return res.status(401).send({
          status: 401,
          data: 'Faça login novamente',
        });
      }

      const response = await ApplicationRepository.addDocument(
        user.id,
        documentType,
        file,
      );

      const {status, data} = response;
      return res.status(status).send(data);
    } catch (error) {
      console.log('Error ao adicionar documento', error);
      return res.status(500).send({
        status: 500,
        data: 'Erro ao adicionar documento',
      });
    }
  }

  async documentsStatus(
    req: Request,
    res: Response,
  ): Promise<Response<ApiResponse>> {
    const response = await ApplicationRepository.verifyDocuments(req.user.id);

    const {status, data} = response;
    return res.status(status).send(data);
  }

  async aboutMe(req: Request, res: Response): Promise<Response<ApiResponse>> {
    const {aboutMe} = req.body;

    if (!aboutMe || aboutMe.length > 600) {
      return res.status(400).send({
        data: !aboutMe
          ? 'Campo sobre mim obrigatório'
          : 'O campo sobre mim deve ter no máximo 600 caracteres',
        statu: 400,
      });
    }

    const response = await ApplicationRepository.aboutMeDogWalker(
      req.user.id,
      aboutMe,
    );

    const {status, data} = response;
    return res.status(status).send(data);
  }

  async profile(req: Request, res: Response): Promise<Response<ApiResponse>> {
    const {availability, transport, dogExperience} = req.body;
    console.log('got here profile', {availability, transport, dogExperience});
    const validAvailability: Availability[] = [
      'everyDay',
      'occasionally',
      'weekends',
    ];
    const validTransport: Transport[] = [
      'carMotorcycle',
      'bicycle',
      'onFoot',
      'rideSharing',
    ];
    const validDogExperience: DogExperience[] = ['allDogs', 'calmDogs'];

    if (
      !validAvailability.includes(availability) ||
      !validTransport.includes(transport) ||
      !validDogExperience.includes(dogExperience)
    ) {
      return res.status(400).send({
        data: 'Requisição inválida',
        statu: 400,
      });
    }

    const response = await ApplicationRepository.addProfile({
      dogWalkerId: req.user.id,
      availability,
      transport,
      dogExperience,
    });

    const {status, data} = response;
    return res.status(status).send(data);
  }

  async updateApplication(
    req: Request,
    res: Response,
  ): Promise<Response<ApiResponse>> {
    const {dogWalkerId} = req.params;
    const {statusApplication} = req.body;

    const response = await ApplicationRepository.updateStatus(
      dogWalkerId,
      statusApplication,
    );

    const {status} = response;
    return res.status(status).send(response);
  }

  async deactivateAccount(req: Request, res: Response): Promise<Response> {
    const userId = req.user.id;

    const response = await ApplicationRepository.deactivateAccount(userId);
    const {status} = response;

    return res.status(status).send(response);
  }
}

export default new ApplicationController();
