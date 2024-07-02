import { Request, Response } from 'express';
import OwnerRepository from '../repositories/ownerRepository';

class Owner {
    async store(req: Request, res: Response) {
        const owner = req.body;
        const response = await OwnerRepository.add(owner);
        const { status, data } = response;

        return res.status(status).send(data);
    }
}

export default new Owner();