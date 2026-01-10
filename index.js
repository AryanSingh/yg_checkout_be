const express = require("express");
const cors = require("cors");
const axios = require("axios");
require('dotenv').config();
const config = require('./config');
const {
  PaymentHandler,
  APIException,
  validateHMAC_SHA256,
} = require("./PaymentHandler");
const crypto = require("crypto");
const path = require("path");
const app = express();
const port = process.env.PORT || "";

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.get("/", (_, res) =>
  res.sendFile(path.join(__dirname, "public", "initiatePaymentDataForm.html"))
);
// app.use(cors({
//   origin: 'http://localhost:5174',
//   credentials: true
// }));
app.use(cors({
  origin: '*',
  credentials: true
}));
app.post("/initiatePayment", async (req, res) => {
  const orderId = `order_${Date.now()}`;
  const amount = req.body.amount;
  const returnUrl = `${process.env.PUBLIC_BASE_URL}/handlePaymentResponse`;
  const paymentHandler = PaymentHandler.getInstance();
  const payload = {
    order_id: orderId,
    amount,
    currency: "INR",
    return_url: returnUrl,
    email: req.body.email,
    phone: req.body.phone,
    address: req.body.address,
    name: req.body.name,
    customer_id: process.env.MERCHANT_ID,
  }
  try {
    const orderSessionResp = await paymentHandler.orderSession(payload);
    return res.json({
      paymentUrl: orderSessionResp.payment_links.web
    });
  } catch (error) {
    // [MERCHANT_TODO]:- please handle errors
    if (error instanceof APIException) {
      return res.send("PaymentHandler threw some error");
    }
    // [MERCHANT_TODO]:- please handle errors
    return res.send("Something went wrong");
  }
});

app.post("/handlePaymentResponse", async (req, res) => {
  const orderId = req.body.order_id || req.body.orderId;
  const paymentHandler = PaymentHandler.getInstance();

  if (orderId === undefined) {
    return res.send("Something went wrong");
  }

  try {
    const orderStatusResp = await paymentHandler.orderStatus(orderId);
    if (
      validateHMAC_SHA256(req.body, paymentHandler.getResponseKey()) === false
    ) {
      // [MERCHANT_TODO]:- validation failed, it's critical error
      return res.send("Signature verification failed");
    }

    const orderStatus = orderStatusResp.status;
    let message = "";
    switch (orderStatus) {
      case "CHARGED":
        message = "order payment done successfully";
        break;
      case "PENDING":
      case "PENDING_VBV":
        message = "order payment pending";
        break;
      case "AUTHORIZATION_FAILED":
        message = "order payment authorization failed";
        break;
      case "AUTHENTICATION_FAILED":
        message = "order payment authentication failed";
        break;
      default:
        message = "order status " + orderStatus;
        break;
    }

    const redirectUrl = `${process.env.REDIRECT_URL}?order_id=${encodeURIComponent(orderId)}`;
    return res.redirect(redirectUrl);
    // return res.redirect(process.env.REDIRECT_URL);

    // const html = makeOrderStatusResponse(
    //   "Merchant Payment Response Page",
    //   message,
    //   req,
    //   orderStatusResp
    // );
    // res.set("Content-Type", "text/html");
    // return res.send(html);
  } catch (error) {
    // [MERCHANT_TODO]:- please handle errors
    if (error instanceof APIException) {
      return res.send("PaymentHandler threw some error");
    }
    // [MERCHANT_TODO]:- please handle errors
    return res.send("Something went wrong");
  }
});

app.get('/', (req, res) => res.send('Checkout API running'))



app.post("/initiateRefund", async (req, res) => {
  const paymentHandler = PaymentHandler.getInstance();

  try {
    const refundResp = await paymentHandler.refund({
      order_id: req.body.order_id,
      amount: req.body.amount,
      unique_request_id: req.body.unique_request_id || `refund_${Date.now()}`,
    });
    const html = makeOrderStatusResponse(
      "Merchant Refund Page",
      `Refund status:- ${refundResp.status}`,
      req,
      refundResp
    );
    res.set("Content-Type", "text/html");
    return res.send(html);
  } catch (error) {
    console.error(error);
    // [MERCHANT_TODO]:- please handle errors
    if (error instanceof APIException) {
      return res.send("PaymentHandler threw some error");
    }
    // [MERCHANT_TODO]:- please handle errors
    return res.send("Something went wrong");
  }
});

app.get('/orders/:orderId', async (req, res) => {
  const { orderId } = req.params;
  const paymentHandler = PaymentHandler.getInstance();

  if (!orderId) {
    return res.status(400).json({ error: 'Order ID is required' });
  }

  try {
    const orderStatusResp = await paymentHandler.orderStatus(orderId);
    return res.json(orderStatusResp);
  } catch (error) {
    if (error instanceof APIException) {
      return res.status(500).json({ error: 'PaymentHandler threw some error' });
    }
    return res.status(500).json({ error: 'Something went wrong' });
  }
});

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw46Ki0nKFuDwRUyXhWqfEPVIqQRdYBFL5e_8RPYpRPNZavzrY5SnFhHeLvldF3m7TfGw/exec"; // e.g., "https://script.google.com/macros/s/AKfycbx.../exec"

app.post("/submit-form", async (req, res) => {
  try {
    // 1️⃣ Forward data to Google Apps Script
    await axios.post(APPS_SCRIPT_URL, null, {
      params: req.body, // important: Apps Script reads e.parameter
    });

    const PaymentType = Object.freeze({
      "100_WITH_ACCOM": 900,
      "100_WITHOUT_ACCOM": 600,
      "200_WITH_ACCOM": 1800,
      "200_WITHOUT_ACCOM": 900
    });



    // 2️⃣ Build redirect URL
    const redirectUrl =
        "https://checkout.purnamyogashala.com" +
        "?name=" + encodeURIComponent(req.body.et_pb_contact_name_0 || "") +
        "&email=" + encodeURIComponent(req.body.et_pb_contact_email_0 || "") +
        "&phone=" + encodeURIComponent(req.body.et_pb_contact_mobile_0 || "") +
        `&amount=${PaymentType["100_WITH_ACCOM"]}` ;

    // 3️⃣ Redirect browser
    return res.redirect(302, redirectUrl);

  } catch (error) {
    console.error(error);
    return res.status(500).send("Something went wrong");
  }
});


// [MERCHAT_TODO]:- Please modify this as per your requirements
const makeOrderStatusResponse = (title, message, req, response) => {
  let inputParamsTableRows = "";
  for (const [key, value] of Object.entries(req.body)) {
    const pvalue = value !== null ? JSON.stringify(value) : "";
    inputParamsTableRows += `<tr><td>${key}</td><td>${pvalue}</td></tr>`;
  }

  let orderTableRows = "";
  for (const [key, value] of Object.entries(response)) {
    const pvalue = value !== null ? JSON.stringify(value) : "";
    orderTableRows += `<tr><td>${key}</td><td>${pvalue}</td></tr>`;
  }

  return `
        <html>
        <head>
            <title>${title}</title>
        </head>
        <body>
            <h1>${message}</h1>

            <center>
                <font size="4" color="blue"><b>Return url request body params</b></font>
                <table border="1">
                    ${inputParamsTableRows}
                </table>
            </center>

            <center>
                <font size="4" color="blue"><b>Response received from order status payment server call</b></font>
                <table border="1">
                    ${orderTableRows}
                </table>
            </center>
        </body>
        </html>
    `;
};

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
