import stripePackage from 'stripe';
import fs from 'fs';
import path from 'path';

class StripUtils {
  get stripe() {
    return new stripePackage(process.env?.STRIPE_SECRET_KEY ?? '');
  }

  async getStripeCustomerByEmail(email: string) {
    const custumers = await this.stripe.customers.list({email});
    return custumers.data[0];
  }

  async createStripeCustomer({email, name}: {email: string; name: string}) {
    const custumerExists = await this.getStripeCustomerByEmail(email);
    if (custumerExists) return custumerExists;

    const custumer = await this.stripe.customers.create({
      email,
      name,
    });

    return custumer;
  }

  async setupIntent(customerId: string) {
    const setupIntent = await this.stripe.setupIntents.create({
      customer: customerId,
    });

    return {
      setupIntentClientSecret: setupIntent.client_secret,
    };
  }

  async listPayments(customerId: string) {
    const paymentMethods =
      await this.stripe.customers.listPaymentMethods(customerId);

    const {data} = paymentMethods;

    return data;
  }

  async handlePayment({
    valueInCents,
    customerStripeId,
    defaultPayment,
    requestId,
    dogWalkerStripeAccountId,
  }: {
    valueInCents: number;
    customerStripeId: string;
    defaultPayment: string;
    requestId: string;
    dogWalkerStripeAccountId: string;
  }) {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: valueInCents,
      currency: 'brl',
      customer: customerStripeId,
      payment_method: defaultPayment,
      off_session: true,
      confirm: true,
      description: requestId,
      transfer_group: requestId,
      transfer_data: {
        destination: dogWalkerStripeAccountId,
      },
      application_fee_amount: Math.round(valueInCents * 0.3),
    });

    return paymentIntent;
  }

  async detachPayment(paymentMethodId: string) {
    const result = await this.stripe.paymentMethods.detach(paymentMethodId);

    return result;
  }

  async createAccount({
    email,
    firstName,
    lastName,
    dob,
    address,
    documentId,
    reqIp,
    idNumber,
    phone,
  }: {
    email: string;
    firstName: string;
    lastName: string;
    dob: {
      day: number;
      month: number;
      year: number;
    };
    address: {
      city?: string;
      country?: string;
      line1?: string;
      line2?: string;
      postal_code?: string;
      state?: string;
    };
    documentId?: string;
    reqIp: string;
    idNumber: string;
    phone: string;
  }) {
    const result = await this.stripe.accounts.create({
      type: 'custom',
      country: 'BR',
      email,
      capabilities: {
        card_payments: {requested: true},
        transfers: {requested: true},
      },
      business_type: 'individual',
      individual: {
        first_name: firstName,
        last_name: lastName,
        email,
        dob,
        address: address,
        verification: {
          document: {
            front: documentId,
          },
        },
        id_number: idNumber,
        phone,
        political_exposure: 'none',
      },
      tos_acceptance: {
        date: Math.floor(Date.now() / 1000),
        ip: reqIp,
      },
      business_profile: {
        mcc: '7299',
        product_description: 'Serviço de dog walking',
      },
    });

    return result;
  }

  async accountRequirements(accountId: string) {
    const account = await this.stripe.accounts.retrieve(accountId);

    const requirements = account.requirements?.currently_due;

    return requirements;
  }

  async uploadDocument(accountId: string) {
    const filePath = path.resolve(
      __dirname,
      '../../fileStripeTest/success.png',
    );

    const file = await this.stripe.files.create(
      {
        purpose: 'identity_document',
        file: {
          data: fs.readFileSync(filePath),
          name: 'file_name.jpg',
          type: 'application/octet-stream',
        },
      },
      {
        stripeAccount: accountId,
      },
    );

    const updatedAccount = await this.stripe.accounts.update(accountId, {
      individual: {
        verification: {
          document: {
            front: file.id,
          },
        },
      },
    });

    return updatedAccount;
  }

  async addExternalAccount({
    accountId,
    name,
    lastName,
    bankCode,
    accountNumber,
  }: {
    accountId: string;
    name: string;
    lastName: string;
    bankCode: string;
    accountNumber: string;
  }) {
    const updatedAccount = await this.stripe.accounts.update(accountId, {
      external_account: {
        object: 'bank_account',
        country: 'BR',
        currency: 'BRL',
        account_holder_name: `${name} ${lastName}`,
        account_holder_type: 'individual',
        routing_number: bankCode,
        account_number: accountNumber,
      },
    });

    return updatedAccount;
  }

  async balance(accountId: string) {
    const balance = await this.stripe.balance.retrieve({
      stripeAccount: accountId,
    });
    return balance;
  }

  async balanceTransactions(accountId: string) {
    const transactions = await this.stripe.balanceTransactions.list({
      stripeAccount: accountId,
    });

    return transactions;
  }

  async transfers(accountId: string) {
    const transfers = await this.stripe.transfers.list({
      stripeAccount: accountId,
    });

    return transfers;
  }

  async handleRefund({
    paymentIntentId,
    requestId,
    amountInCents,
  }: {
    paymentIntentId: string;
    requestId: string;
    amountInCents?: number;
  }) {
    const transfers = await this.stripe.transfers.list({
      transfer_group: requestId,
    });

    const transferId = transfers.data.length > 0 ? transfers.data[0].id : null;

    if (!transferId) {
      return {
        status: 500,
        data: 'Erro interno.',
      };
    }
    await this.stripe.transfers.createReversal(transferId, {
      amount: amountInCents,
    });

    await this.stripe.refunds.create({payment_intent: paymentIntentId});

    return {
      status: 200,
      data: 'Reembolso processado e transferência revertida com sucesso',
    };
  }
}

export default new StripUtils();
