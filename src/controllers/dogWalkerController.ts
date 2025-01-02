import {Request, Response} from 'express';
import DogWalkerRepository from '../repositories/dogWalkerRepository';
import {DogWalkerProps} from '../interfaces/dogWalker';
import {ApiResponse} from '../interfaces/apitResponse';
import {UserRole} from '../enums/role';

class DogWalker {
  async store(req: Request, res: Response): Promise<Response<ApiResponse>> {
    const requiredFields = [
      'name',
      'lastName',
      'document',
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

    const {name, lastName, email, password, document, address, phone} =
      req.body;

    const normalizedName = name.trim().replace(/\s+/g, ' ');
    const normalizedLastName = lastName.trim().replace(/\s+/g, ' ');
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedDocument = document.trim();
    const normalizedPhone = phone.trim();
    const normalizedAddress = {
      zipCode: address.zipCode.trim(),
      street: address.street.trim().replace(/\s+/g, ' '),
      houseNumber: address.houseNumber.trim(),
      neighborhood: address.neighborhood.trim().replace(/\s+/g, ' '),
      city: address.city.trim().replace(/\s+/g, ' '),
      state: address.state.trim().toUpperCase(),
    };

    const walker: DogWalkerProps = {
      name: normalizedName,
      lastName: normalizedLastName,
      email: normalizedEmail,
      phone: normalizedPhone,
      address: normalizedAddress,
      document: normalizedDocument,
      password,
    };

    const response = await DogWalkerRepository.addDogWalker(walker);
    const {status} = response;

    return res.status(status).send(response);
  }

  async nearests(req: Request, res: Response) {
    const {latitude, longitude, limit, skip} = req.query;
    if (!latitude || !longitude) {
      return res.status(400).send({error: 'Requisição inválida'});
    }

    const parsedLimit = limit ? parseInt(limit as string, 10) : 10;
    const parsedSkip = skip ? parseInt(skip as string, 10) : 0;

    const response = await DogWalkerRepository.findNearestDogWalkers({
      latitude: parseFloat(latitude as string),
      longitude: parseFloat(longitude as string),
      limit: parsedLimit,
      skip: parsedSkip,
    });

    const {status} = response;
    return res.status(status).send(response);
  }

  async recommended(req: Request, res: Response) {
    const {latitude, longitude, limit, skip} = req.query;
    if (!latitude || !longitude) {
      return res.status(400).send({error: 'Requisição inválida'});
    }

    const parsedLimit = limit ? parseInt(limit as string, 10) : 10;
    const parsedSkip = skip ? parseInt(skip as string, 10) : 0;

    const response = await DogWalkerRepository.findRecommendedDogWalkers({
      latitude: parseFloat(latitude as string),
      longitude: parseFloat(longitude as string),
      limit: parsedLimit,
      skip: parsedSkip,
    });

    const {status} = response;
    return res.status(status).send(response);
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

  async updateField(
    req: Request,
    res: Response,
  ): Promise<Response<ApiResponse>> {
    const dogWalkerId = req?.user?.id;

    const {field, newValue} = req.body;

    const allowedFields = ['name', 'lastName', 'phone', 'address'];

    if (!allowedFields.includes(field)) {
      return res
        .status(400)
        .send({status: 400, data: 'Campo inválido para atualização'});
    }

    if (!dogWalkerId || !field || !newValue) {
      return res.status(400).send({status: 400, data: 'Requisição inválida'});
    }

    const response = await DogWalkerRepository.updateDogWalker({
      dogWalkerId,
      field,
      newValue,
    });

    const {status} = response;
    return res.status(status).send(response);
  }

  async addAccount(
    req: Request,
    res: Response,
  ): Promise<Response<ApiResponse>> {
    const dogWalkerId = req?.user?.id;
    const reqIp = req.ip;
    const {bankCode, agencyNumber, accountNumber, birthdate} = req.body;

    const requiredFields = [
      'bankCode',
      'agencyNumber',
      'accountNumber',
      'birthdate',
    ];

    const missingField = requiredFields.find(field => !req.body[field]);
    if (missingField || !dogWalkerId) {
      return res.status(400).send({status: 400, data: 'Requsição inválida'});
    }

    const numericFields = {
      bankCode: bankCode as string,
      agencyNumber: agencyNumber as string,
      accountNumber: accountNumber as string,
    };

    for (const [fieldName, value] of Object.entries(numericFields)) {
      if (!/^\d+$/.test(value)) {
        return res.status(400).send({
          status: 400,
          data: `O campo ${fieldName} deve conter apenas números.`,
        });
      }
    }

    if (!reqIp) {
      console.log('Error getting req ip');
      return res.status(500).send({status: 500, data: 'Erro'});
    }

    const response = await DogWalkerRepository.addStripeAccount({
      dogWalkerId,
      reqIp,
      bankCode,
      agencyNumber,
      accountNumber,
      dob: birthdate,
    });

    const {status} = response;
    return res.status(status).send(response);
  }

  async accountPendingItems(
    req: Request,
    res: Response,
  ): Promise<Response<ApiResponse>> {
    const dogWalkerId = req?.user?.id;
    if (!dogWalkerId) {
      return res.status(400).send({status: 400, data: 'Requsição inválida'});
    }

    const response = await DogWalkerRepository.accountRequirements(dogWalkerId);

    const {status} = response;
    return res.status(status).send(response);
  }

  async accountDocument(
    req: Request,
    res: Response,
  ): Promise<Response<ApiResponse>> {
    const dogWalkerId = req?.user?.id;
    if (!dogWalkerId) {
      return res.status(400).send({status: 400, data: 'Requsição inválida'});
    }

    const file = req.file;

    if (!file) {
      return res
        .status(400)
        .json({status: 400, data: 'Nenhum arquivo enviado'});
    }

    const response = await DogWalkerRepository.accountDocumentUpload(
      dogWalkerId,
      file,
    );

    const {status} = response;
    return res.status(status).send(response);
  }

  async accountStatus(
    req: Request,
    res: Response,
  ): Promise<Response<ApiResponse>> {
    const dogWalkerId = req?.user?.id;
    if (!dogWalkerId) {
      return res.status(400).send({status: 400, data: 'Requsição inválida'});
    }

    const response = await DogWalkerRepository.accountCheckStatus(dogWalkerId);

    const {status} = response;
    return res.status(status).send(response);
  }

  async imageProfile(
    req: Request,
    res: Response,
  ): Promise<Response<ApiResponse>> {
    const file = req.file;

    if (!file) {
      return res
        .status(400)
        .json({status: 400, data: 'Nenhum arquivo enviado'});
    }

    const userId = req?.user?.id;

    if (!userId) {
      return res.status(401).send({
        status: 401,
        data: 'Faça login novamente',
      });
    }

    const response = await DogWalkerRepository.updateProfileImage(userId, file);

    const {status} = response;
    return res.status(status).send(response);
  }

  async notifyAboutClosure(
    req: Request,
    res: Response,
  ): Promise<Response<ApiResponse>> {
    const isAdmin = req.user.role === UserRole.Admin;

    if (!isAdmin) {
      return res
        .status(401)
        .send({status: 401, data: 'Usuário não autorizado.'});
    }

    const response = await DogWalkerRepository.notifyDogWalkersAboutClosure();

    const {status} = response;
    return res.status(status).send(response);
  }
}

export default new DogWalker();
