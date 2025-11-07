const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, unique: true, required: true },
  address: { type: String },
  dob: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Customer", customerSchema);
