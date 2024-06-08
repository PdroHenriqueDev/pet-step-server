import { Request, Response } from 'express';
import DogWalkerRepository from '../repositories/DogWalkerRepository';

class DogWalker {
    async store(req: Request, res: Response) {
        const { name, longitude, latitude } = req.body;
        if (!name || !longitude || !latitude) {
            return res.status(400).send({ error: 'Missing required fields' });
        }

        const walker = { name, longitude, latitude };

        const response = await DogWalkerRepository.addDogWalker(walker);
        const { status, data } = response;

        return res.status(status).send(data);
    }

    async nearests(req: Request, res: Response) {
        const { latitude, longitude } = req.query;
        if (!latitude || !longitude) {
            return res.status(400).send({ error: 'Missing required query parameters' });
        }

        const response = await DogWalkerRepository.findNearestDogWalkers(
            parseFloat(latitude as string),
            parseFloat(longitude as string),
        );

        const { status, data } = response;
        return res.status(status).send(data);
    }

    async findById(req: Request, res: Response) {
        const { id } = req.params;
        if (!id) {
            return res.status(400).send({ error: 'Dog walker não encontrado' });
        }

        const response = await DogWalkerRepository.findDogWalkerById(id);

        const { status, data } = response;
        return res.status(status).send(data);
    }

    async notification(req: Request, res: Response) {
        const { id } = req.params;
        const { title, body } = req.body;

        if (!id) {
            return res.status(400).send({ error: 'Dog walker não encontrado' });
        }

        if (!title || !body) {
            return res.status(400).send({ error: 'Requisição inválida' });
        }

        const response = await DogWalkerRepository.sendNotificationDogWalker({ dogWalkerId: id, title, body });
        
        const { status, data, error } = response as any;

        return res.status(status).send(data ?? error);
    }
}

export default DogWalker;