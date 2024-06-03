import { Request, Response } from 'express';
import DogWalkerRepository from '../repositories/DogWalkerRepository';

const dogWalkerRepository = new DogWalkerRepository();

class DogWalker {
    async store(req: Request, res: Response) {
        const { name, longitude, latitude } = req.body;
        if (!name || !longitude || !latitude) {
            return res.status(400).send({ error: 'Missing required fields' });
        }

        const walker = { name, longitude, latitude };

        const response = await dogWalkerRepository.addDogWalker(walker);
        const { status, data } = response;

        return res.status(status).send(data);
    }

    async nearest(req: Request, res: Response) {
        const { latitude, longitude } = req.query;
        if (!latitude || !longitude) {
            return res.status(400).send({ error: 'Missing required query parameters' });
        }

        const response = await dogWalkerRepository.findNearestDogWalker(
            parseFloat(latitude as string),
            parseFloat(longitude as string),
        );

        const { status, data } = response;
        return res.status(status).send(data);
    }
}

export default DogWalker;