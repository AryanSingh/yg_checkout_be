const products = {
  "100_WITH_ACCOM": {
    name: "100 Hour Yoga API with Accommodation",
    price: 900,
    currency: "INR"
  },
  "100_WITHOUT_ACCOM": {
    name: "100 Hour Yoga API without Accommodation",
    price: 600,
    currency: "INR"
  },
  "200_WITH_ACCOM": {
    name: "200 Hour Yoga API with Accommodation",
    price: 1800,
    currency: "INR"
  },
  "200_WITHOUT_ACCOM": {
    name: "200 Hour Yoga API without Accommodation",
    price: 900,
    currency: "INR"
  },
  "CUSTOM_AMOUNT": { // keeping a fallback for testing if needed, or we can remove it. Ideally strict.
     name: "Custom Payment",
     price: null, // Dynamic
     currency: "INR"
  }
};

module.exports = products;
