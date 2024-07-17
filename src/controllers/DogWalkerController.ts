import { Request, Response } from 'express';
import DogWalkerRepository from '../repositories/dogWalkerRepository';
import { calculateWalkCost } from '../utils/calculateWalkCost';

class DogWalker {
    async store(req: Request, res: Response) {
        const { name, lastName, longitude, latitude } = req.body;
        if (!name || !longitude || !latitude) {
            return res.status(400).send({ error: 'Missing required fields' });
        }

        const walker = { name, lastName, longitude, latitude };

        const response = await DogWalkerRepository.addDogWalker(walker);
        const { status, data } = response;

        return res.status(status).send(data);
    }

    async nearests(req: Request, res: Response) {
        const { latitude, longitude } = req.query;
        if (!latitude || !longitude) {
            return res.status(400).send({ error: 'Requisição inválida' });
        }

        const response = await DogWalkerRepository.findNearestDogWalkers(
            parseFloat(latitude as string),
            parseFloat(longitude as string),
        );

        const { status, data } = response;
        return res.status(status).send(data);
    }

    async recommeded(req: Request, res: Response) {
        const { latitude, longitude } = req.query;
        if (!latitude || !longitude) {
            return res.status(400).send({ error: 'Requisição inválida' });
        }

        const response = await DogWalkerRepository.findRecommededDogWalkers(
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

    async feedback(req: Request, res: Response) {
        const { id } = req.params;

        if (!id) return res.status(400).send({ error: 'Dog walker não encontrado' });

        const { rate, comment } = req.body;

        if (!rate) return res.status(400).send({ error: 'Requisição inválida' });

        const response = await DogWalkerRepository.saveFeedback({ dogWalkerId: id, rate, comment });

        const { status, data } = response;
        return res.status(status).send(data);
    }

    async calculateCost(req: Request, res: Response) {
        const { dogWalkerId, numberOfDogs, walkDurationMinutes } = req.body;

        if (!numberOfDogs || !walkDurationMinutes) {
            return res.status(400).send({ message: !numberOfDogs ? 'Número de cachorros são obrigatórios' : 'Duração do passeio é obrigatório' });
        }

        if (numberOfDogs > 3) return res.status(400).send({ message: 'Somente é permitido até 3 dogs por passeio' });

        if (numberOfDogs <= 0 || walkDurationMinutes <= 0) {
            return {
                status: 400,
                error: numberOfDogs <= 0 ? 'Número de cachorros deve ser maiore que zero.' : 'Duração deve ser maior que zero.'
            };
        }
    
        const response = await DogWalkerRepository.calculateWalk({ dogWalkerId, numberOfDogs, walkDurationMinutes });

        const { status, data } = response;
        return res.status(status).send(data);
    }
}

export default new DogWalker();