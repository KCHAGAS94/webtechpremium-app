import { MercadoPagoConfig, Payment } from 'mercadopago';

const ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN ?? '';

const mpConfig = new MercadoPagoConfig({ accessToken: ACCESS_TOKEN });

export const mpPaymentClient = new Payment(mpConfig);

export function hasMercadoPagoAccessToken() {
  return Boolean(ACCESS_TOKEN);
}
