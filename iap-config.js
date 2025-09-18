// In-App Purchase Configuration
// These product IDs must match what you configure in App Store Connect

const IAP_PRODUCTS = {
  tip_coffee: {
    id: 'com.khamrozabdukhoshimov.txttopdf.tip.coffee',
    name: 'Buy me a coffee',
    price: '$1.00',
    emoji: '☕'
  },
  tip_lunch: {
    id: 'com.khamrozabdukhoshimov.txttopdf.tip.lunch',
    name: 'Buy me lunch',
    price: '$5.00',
    emoji: '🍕'
  },
  tip_support: {
    id: 'com.khamrozabdukhoshimov.txttopdf.tip.support',
    name: 'Support future updates',
    price: '$10.00',
    emoji: '🚀'
  }
};

// For development/testing, you can use these sandbox product IDs
const IAP_SANDBOX_PRODUCTS = {
  tip_coffee: {
    id: 'com.khamrozabdukhoshimov.txttopdf.tip.coffee.sandbox',
    name: 'Buy me a coffee',
    price: '$1.00',
    emoji: '☕'
  },
  tip_lunch: {
    id: 'com.khamrozabdukhoshimov.txttopdf.tip.lunch.sandbox',
    name: 'Buy me lunch',
    price: '$5.00',
    emoji: '🍕'
  },
  tip_support: {
    id: 'com.khamrozabdukhoshimov.txttopdf.tip.support.sandbox',
    name: 'Support future updates',
    price: '$10.00',
    emoji: '🚀'
  }
};

module.exports = {
  IAP_PRODUCTS,
  IAP_SANDBOX_PRODUCTS,
  // Use sandbox products in development
  getProducts: () => process.env.NODE_ENV === 'development' ? IAP_SANDBOX_PRODUCTS : IAP_PRODUCTS
};
