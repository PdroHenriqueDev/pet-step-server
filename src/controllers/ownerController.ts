import {Request, Response} from 'express';
import OwnerRepository from '../repositories/ownerRepository';
import {Owner as OwnerProps} from '../interfaces/owner';

class Owner {
  async store(req: Request, res: Response) {
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
    const owner: OwnerProps = {
      name,
      lastName,
      email,
      phone,
      address,
      document,
      password,
    };

    const response = await OwnerRepository.add(owner);
    const {status} = response;

    return res.status(status).send(response);
  }

  async findById(req: Request, res: Response) {
    const {id} = req.params;
    if (!id) {
      return res.status(400).send({error: 'Dog walker não encontrado'});
    }

    const response = await OwnerRepository.findOwnerById(id);

    const {status, data} = response;
    return res.status(status).send(data);
  }

  async payments(req: Request, res: Response) {
    const {id} = req.params;
    if (!id) {
      return res.status(400).send({error: 'Dog walker não encontrado'});
    }

    const response = await OwnerRepository.listPayments(id);

    const {status, data} = response;
    return res.status(status).send(data);
  }

  async updateDefaultPaymentMethod(req: Request, res: Response) {
    const {id} = req.params;
    const {paymentMethodId} = req.body;

    if (!id || !paymentMethodId) {
      return res.status(400).send({error: 'Requisição inválida'});
    }

    const response = await OwnerRepository.updateDefaultPaymentMethod({
      ownerId: id,
      paymentMethodId,
    });

    const {status, data} = response;
    return res.status(status).send(data);
  }
}

export default new Owner();
