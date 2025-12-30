require('dotenv').config();

const config = {
    apiKey: process.env.API_KEY,
    merchantId: process.env.MERCHANT_ID,
    paymentPageClientId: process.env.PAYMENT_PAGE_CLIENT_ID,
    baseUrl: process.env.BASE_URL,
    enableLogging: process.env.ENABLE_LOGGING === 'true',
    loggingPath: process.env.LOGGING_PATH,
    responseKey: process.env.RESPONSE_KEY,
};

module.exports = config;