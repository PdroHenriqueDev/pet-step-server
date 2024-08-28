import {Request, Response} from 'express';
import StripeUtils from '../utils/stripe';
import {ApiResponse} from '../interfaces/apitResponse';
import OwnerRepository from '../repositories/ownerRepository';
import {Owner} from '../interfaces/owner';

class PaymentController {
  async createSetupIntent(
    req: Request,
    res: Response,
  ): Promise<Response<ApiResponse>> {
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
    } catch (error) {
      console.log('Error ao criar intent:', error);
      return res.status(500).send('Error');
    }
  }

  async listCustomerPayments(
    req: Request,
    res: Response,
  ): Promise<Response<ApiResponse>> {
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
    } catch (error) {
      console.log('Error ao criar listar :', error);
      return res.status(500).send('Error');
    }
  }

  async removePayment(
    req: Request,
    res: Response,
  ): Promise<Response<ApiResponse>> {
    const {paymentMethodId, ownerId} = req.params;
    if (!paymentMethodId) return res.status(400).send('Requisição inválida');
    try {
      await StripeUtils.detachPayment(paymentMethodId);

      const result = await OwnerRepository.findOwnerById(ownerId);

      const {defaultPayment} = result.data as Owner;

      if (defaultPayment === paymentMethodId) {
        await OwnerRepository.updateDefaultPaymentMethod({
          ownerId,
          paymentMethodId: null,
        });
      }

      const response = {
        status: 200,
        data: 'Removido',
      };

      const {status, data} = response;

      return res.status(status).send(data);
    } catch (error) {
      console.log('Erro ao remover pagamento: ', error);
      return res.status(500).send('Error');
    }
  }
}

export default new PaymentController();
