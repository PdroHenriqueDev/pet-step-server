import {Request, Response} from 'express';
import {ApiResponse} from '../interfaces/apitResponse';
import banks from '../utils/bancos.json';

class StaticDataController {
  async listBanks(req: Request, res: Response): Promise<Response<ApiResponse>> {
    try {
      if (!banks || !Array.isArray(banks) || banks.length === 0) {
        return res.status(200).send({status: 200, data: []});
      }

      const mappedBank = banks.map(bank => ({
        label: `${bank.COMPE} - ${bank.ShortName}`,
        value: bank.COMPE,
      }));

      return res.status(200).send({status: 200, data: mappedBank});
    } catch (error) {
      console.error('Erro listening banks:', error);
      return res.status(500).send({status: 500, data: 'Erro interno.'});
    }
  }
}

export default new StaticDataController();
