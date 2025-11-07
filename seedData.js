// ==========================================
// 🌱 Seed Script for FirstChoice ERP
// ==========================================

const mongoose = require("mongoose");
const Category = require("./models/Category");
const Product = require("./models/Product");
const Customer = require("./models/Customer");
const Sale = require("./models/Sale");
// 🧠 MongoDB Connection
mongoose.connect("mongodb://127.0.0.1:27017/firstChoice", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "❌ Connection error:"));
db.once("open", async () => {
  console.log("✅ Connected to MongoDB | Seeding data...");

  try {
    // Clear old data
    await Promise.all([
      Category.deleteMany({}),
      Product.deleteMany({}),
      Customer.deleteMany({}),
      Sale.deleteMany({}),
    ]);

    // ===========================
    // 1️⃣ Categories
    // ===========================
    const categories = await Category.insertMany([
      { name: "Snacks", code: "CAT01" },
      { name: "Beverages", code: "CAT02" },
      { name: "Dairy", code: "CAT03" },
      { name: "Bakery", code: "CAT04" },
      { name: "Personal Care", code: "CAT05" },
    ]);

    console.log(`📂 Inserted ${categories.length} categories`);

    // ===========================
    // 2️⃣ Products
    // ===========================
    const products = await Product.insertMany([
      {
        productId: "P001",
        name: "Parle-G Biscuits",
        category: categories[0]._id,
        markedPrice: 10,
        wholesalePrice: 6,
        stockQty: 500,
      },
      {
        productId: "P002",
        name: "Lays Chips",
        category: categories[0]._id,
        markedPrice: 20,
        wholesalePrice: 12,
        stockQty: 300,
      },
      {
        productId: "P003",
        name: "Coca-Cola 500ml",
        category: categories[1]._id,
        markedPrice: 35,
        wholesalePrice: 25,
        stockQty: 200,
      },
      {
        productId: "P004",
        name: "Amul Milk 1L",
        category: categories[2]._id,
        markedPrice: 50,
        wholesalePrice: 40,
        stockQty: 100,
      },
      {
        productId: "P005",
        name: "Bread Loaf",
        category: categories[3]._id,
        markedPrice: 30,
        wholesalePrice: 20,
        stockQty: 80,
      },
      {
        productId: "P006",
        name: "Shampoo 100ml",
        category: categories[4]._id,
        markedPrice: 120,
        wholesalePrice: 80,
        stockQty: 60,
      },
    ]);

    console.log(`📦 Inserted ${products.length} products`);

    // ===========================
    // 3️⃣ Customers
    // ===========================
    const customers = await Customer.insertMany([
      { name: "Raj Kumar", phone: "9998887771", address: "Patna" },
      { name: "Akash Sharma", phone: "9998887772", address: "Nalanda" },
      { name: "Priya Singh", phone: "9998887773", address: "Delhi" },
      { name: "Ankit Verma", phone: "9998887774", address: "Bihar Sharif" },
      { name: "Riya Das", phone: "9998887775", address: "Kolkata" },
    ]);

    console.log(`👤 Inserted ${customers.length} customers`);

    // ===========================
    // 4️⃣ Sales
    // ===========================
    const randomSale = () => {
      const items = [
        {
          product: products[Math.floor(Math.random() * products.length)]._id,
          qty: Math.floor(Math.random() * 5) + 1,
          unitPrice: Math.floor(Math.random() * 50) + 10,
        },
      ];

      const totalAmount = items.reduce(
        (sum, item) => sum + item.qty * item.unitPrice,
        0
      );

      const totalPaid = totalAmount;
      const profit = items.reduce(
        (sum, item) => sum + (item.unitPrice - 20) * item.qty,
        0
      );

      return {
        billNumber: "BILL" + Math.floor(Math.random() * 10000),
        customer: customers[Math.floor(Math.random() * customers.length)]._id,
        items,
        discounts: { globalPercent: 0, additionalAmount: 0 },
        totalAmount,
        totalPaid,
        profit,
        createdAt: new Date(2025, 9, Math.floor(Math.random() * 30) + 1), // October 2025
      };
    };

    const sales = [];
    for (let i = 0; i < 20; i++) sales.push(randomSale());
    await Sale.insertMany(sales);

    console.log(`💰 Inserted ${sales.length} sales`);

    console.log("🎉 Database successfully seeded!");
  } catch (error) {
    console.error("❌ Error seeding data:", error);
  } 
  finally {
    mongoose.connection.close();
  }
});
