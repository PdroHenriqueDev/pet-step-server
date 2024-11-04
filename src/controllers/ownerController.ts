import {Request, Response} from 'express';
import OwnerRepository from '../repositories/ownerRepository';
import {Owner as OwnerProps} from '../interfaces/owner';
import axios from 'axios';
import {
  calculateAverageWeight,
  getSizeCategory,
  getSizeCategoryEnglish,
} from '../utils/dog';

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

  async listBreeds(req: Request, res: Response) {
    try {
      const response = await axios.get('https://api.thedogapi.com/v1/breeds', {
        headers: {
          'x-api-key': process.env.DOG_API_KEY as string,
        },
      });

      const breeds = response.data.map((breed: any) => {
        const averageWeight = calculateAverageWeight(breed.weight.metric);
        const sizeCategory = getSizeCategory(averageWeight);

        return {
          name: breed.name,
          size: sizeCategory,
        };
      });

      return res.status(200).send({status: 200, data: breeds});
    } catch (error) {
      console.log('Error list breeds', error);
      return res.status(500).send({status: 500, data: 'Erro ao buscar raças'});
    }
  }

  async searchBreeds(req: Request, res: Response) {
    const {query} = req.query;

    if (!query) {
      return res
        .status(400)
        .send({status: 400, data: 'O parâmetro "query" é obrigatório.'});
    }

    try {
      const response = await axios.get(
        `https://api.thedogapi.com/v1/breeds/search?q=${query}`,
        {
          headers: {
            'x-api-key': process.env.DOG_API_KEY as string,
          },
        },
      );

      const breeds = response.data.map((breed: any) => {
        const averageWeight = calculateAverageWeight(breed.weight.metric);
        const sizeCategory = getSizeCategoryEnglish(averageWeight);

        return {
          id: breed.id,
          name: breed.name,
          size: sizeCategory,
        };
      });

      return res.status(200).send({status: 200, data: breeds});
    } catch (error) {
      console.log('Error searching breeds', error);
      return res.status(500).send({status: 500, data: 'Erro ao buscar raças'});
    }
  }

  async getBreedById(req: Request, res: Response) {
    const {breedId} = req.params;

    if (!breedId) {
      return res
        .status(400)
        .send({status: 400, data: 'ID da raça é obrigatório'});
    }

    try {
      const response = await axios.get(
        `https://api.thedogapi.com/v1/breeds/${breedId}`,
        {
          headers: {
            'x-api-key': process.env.DOG_API_KEY as string,
          },
        },
      );

      const breed = response.data;
      const averageWeight = calculateAverageWeight(breed.weight.metric);
      const sizeCategory = getSizeCategory(averageWeight);

      const result = {
        name: breed.name,
        size: sizeCategory,
      };

      return res.status(200).send({status: 200, data: result});
    } catch (error) {
      console.log('Error fetching breed by ID', error);
      return res
        .status(500)
        .send({status: 500, data: 'Erro ao buscar raça pelo ID'});
    }
  }

  async addMoreDog(req: Request, res: Response) {
    const {id} = req.user;
    const {name, breed, size} = req.body;

    if (!id) {
      return res.status(400).send({status: 400, data: 'Requisição inválida'});
    }

    const requiredFields = ['name', 'breed', 'size'];
    const missingField = requiredFields.find(field => !req.body[field]);

    if (missingField) {
      return res
        .status(400)
        .send({data: `O campo "${missingField}" é obrigatório.`});
    }

    const newDog = {name, breed, size};

    const response = await OwnerRepository.addDog(id, newDog);
    const {status} = response;

    return res.status(status).send(response);
  }
}

export default new Owner();
