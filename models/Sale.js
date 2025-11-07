const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema({
  billNumber: String,
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      name: String,
      qty: Number,
      unitPrice: Number,
      markedPriceAtSale: Number,
    },
  ],
  discounts: {
    globalPercent: Number,
    additionalAmount: Number,
  },
  payments: [
    {
      method: { type: String, enum: ["cash", "upi", "card"] },
      amount: Number,
    },
  ],
  totalAmount: Number,
  totalPaid: Number,
  profit: { type: Number, default: 0 }, // 💰 add this line
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Sale", saleSchema);
