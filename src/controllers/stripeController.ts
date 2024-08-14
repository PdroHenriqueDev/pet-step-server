import {Request, Response} from 'express';
import StripeUtils from '../utils/stripe';

class StripeController {
  async createSetupIntent(req: Request, res: Response) {
    const {customerId} = req.params;
    if (!customerId) return res.status(400).send('Requisição inválida');
    try {
      const customerStripe = await StripeUtils.setupIntent(customerId);

      const response = {
        status: 200,
        data: customerStripe,
      };

      const {status, data} = response;

      return res.status(status).send(data);
    } catch {
      return {
        status: 500,
        data: 'Error',
      };
    }
  }

  async listCustomerPayments(req: Request, res: Response) {
    const {customerId} = req.params;
    if (!customerId) return res.status(400).send('Requisição inválida');
    try {
      const list = await StripeUtils.listPayments(customerId);

      const response = {
        status: 200,
        data: list,
      };

      const {status, data} = response;

      return res.status(status).send(data);
    } catch {
      return {
        status: 500,
        data: 'Error',
      };
    }
  }
}

export default new StripeController();
