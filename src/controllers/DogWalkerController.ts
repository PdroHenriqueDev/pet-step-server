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
        try {
            const { numberOfDogs, walkDuration } = req.body;

            if (!numberOfDogs || !walkDuration) {
                res.status(400).send({ message: !numberOfDogs ? 'Número de cachorros são obrigatórios' : 'Duração do passeio é obrigatório' });
                return;
            }

            const costDetails = calculateWalkCost({ numberOfDogs, walkDuration });
            return res.status(200).send(costDetails);
        } catch (error) {
            return res.status(500).send({ message: 'Erro ao calcular o custo do passeio' });
        }
    }
}

export default new DogWalker();