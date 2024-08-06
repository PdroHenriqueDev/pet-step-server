import { Request, Response } from 'express';
import OwnerRepository from '../repositories/ownerRepository';

class Owner {
    async store(req: Request, res: Response) {
        const owner = req.body;

        const { name, email } = owner;

        if (!name || !email) {
            return res.status(400).send({ error: 'Requisição inválida' });
        }

        const response = await OwnerRepository.add(owner);
        const { status, data } = response;

        return res.status(status).send(data);
    }

    async findById(req: Request, res: Response) {
        const { id } = req.params;
        if (!id) {
            return res.status(400).send({ error: 'Dog walker não encontrado' });
        }

        const response = await OwnerRepository.findOwnerById(id);

        const { status, data } = response;
        return res.status(status).send(data);
    }
}

export default new Owner();