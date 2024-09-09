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

  async listAccountRequirements(
    req: Request,
    res: Response,
  ): Promise<Response<ApiResponse>> {
    const {accountId} = req.params;
    if (!accountId) return res.status(400).send('Requisição inválida');
    try {
      const list = await StripeUtils.accountRequirements(accountId);

      const response = {
        status: 200,
        data: list,
      };

      const {status, data} = response;

      return res.status(status).send(data);
    } catch (error) {
      console.log('Error ao listar :', error);
      return res.status(500).send('Error');
    }
  }

  async uploadAccountDocument(
    req: Request,
    res: Response,
  ): Promise<Response<ApiResponse>> {
    const {accountId} = req.params;
    if (!accountId) return res.status(400).send('Requisição inválida');
    try {
      await StripeUtils.uploadDocument(accountId);

      const response = {
        status: 200,
        data: 'Documento enviado',
      };

      const {status, data} = response;

      return res.status(status).send(data);
    } catch (error) {
      console.log('Erro uploading document:', error);
      return res.status(500).send('Error');
    }
  }

  async accountBalance(
    req: Request,
    res: Response,
  ): Promise<Response<ApiResponse>> {
    const {accountId} = req.params;
    if (!accountId) return res.status(400).send('Requisição inválida');
    try {
      const balance = await StripeUtils.balance(accountId);

      const response = {
        status: 200,
        data: balance,
      };

      const {status, data} = response;

      return res.status(status).send(data);
    } catch (error) {
      console.log('Error ao mostrar saldo :', error);
      return res.status(500).send('Error');
    }
  }

  async accountBalanceTransactions(
    req: Request,
    res: Response,
  ): Promise<Response<ApiResponse>> {
    const {accountId} = req.params;
    if (!accountId) return res.status(400).send('Requisição inválida');
    try {
      const transactions = await StripeUtils.balanceTransactions(accountId);

      const response = {
        status: 200,
        data: transactions,
      };

      const {status, data} = response;

      return res.status(status).send(data);
    } catch (error) {
      console.log('Error ao mostrar transações:', error);
      return res.status(500).send('Error');
    }
  }

  async accountTransfers(
    req: Request,
    res: Response,
  ): Promise<Response<ApiResponse>> {
    const {accountId} = req.params;
    if (!accountId) return res.status(400).send('Requisição inválida');
    try {
      const transfers = await StripeUtils.transfers(accountId);

      const response = {
        status: 200,
        data: transfers,
      };

      const {status, data} = response;

      return res.status(status).send(data);
    } catch (error) {
      console.log('Error ao mostrar transferências:', error);
      return res.status(500).send('Error');
    }
  }

  async addExternalAccount(
    req: Request,
    res: Response,
  ): Promise<Response<ApiResponse>> {
    const {accountId} = req.params;
    if (!accountId) return res.status(400).send('Requisição inválida');

    const {name, lastName, bankCode, accountNumber} = req.body;

    const requiredFields = ['name', 'lastName', 'bankCode', 'accountNumber'];
    const missingField = requiredFields.find(field => !req.body[field]);

    if (missingField) {
      return res
        .status(400)
        .send({error: `O campo "${missingField}" é obrigatório.`});
    }

    try {
      await StripeUtils.addExternalAccount({
        accountId,
        name,
        lastName,
        bankCode,
        accountNumber,
      });

      const response = {
        status: 200,
        data: 'Conta adicionada',
      };

      const {status, data} = response;

      return res.status(status).send(data);
    } catch (error) {
      console.log('Error ao mostrar transferências:', error);
      return res.status(500).send('Error');
    }
  }
}

export default new PaymentController();
