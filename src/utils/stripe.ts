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
} 

export default new StripUtils();