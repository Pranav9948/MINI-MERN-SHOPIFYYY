const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
  shopId: { type: String, required: true },
  accessToken: { type: String, required: true },
  
});

const Shop = mongoose.model('Shop', shopSchema);

module.exports = Shop;
