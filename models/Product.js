const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true,
    unique: true, // Ensure each productId is unique
    trim: true,
  },
  name: { type: String, required: true, trim: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  markedPrice: { type: Number, required: true },
  wholesalePrice: { type: Number },
  stockQty: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Product", productSchema);
