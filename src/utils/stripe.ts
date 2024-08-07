import stripePackage from 'stripe';

class StripUtils {
    get stripe() {
        return new stripePackage(process.env?.STRIPE_SECRET_KEY ?? '');
    }

    async getStripeCustomerByEmail(email: string) {
        const custumers = await this.stripe.customers.list({ email });
        return custumers.data[0];
    };
    
    async createStripeCustomer({email, name }: {email: string; name: string;}) {
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
        }
    }
    
    async listPayments(customerId: string) {
        const paymentMethods = await this.stripe.customers.listPaymentMethods(customerId);

        const { data } = paymentMethods;

        return data;
    }
} 

export default new StripUtils();