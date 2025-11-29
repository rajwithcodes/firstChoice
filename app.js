// -----------------------------
// Imports
// -----------------------------
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const cron = require("node-cron"); // For auto dashboard refresh

// -----------------------------
// Model Imports
// -----------------------------
const Category = require("./models/Category");
const Product = require("./models/Product");
const Customer = require("./models/Customer");
const Sale = require("./models/Sale");

// -----------------------------
// App Configuration
// -----------------------------
const app = express();
const PORT = 3000;
const mongo_URL = "mongodb://127.0.0.1:27017/firstChoice";

// -----------------------------
// Middleware & View Setup
// -----------------------------
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));

// -----------------------------
// MongoDB Connection
// -----------------------------
async function connectDB() {
  try {
    await mongoose.connect(mongo_URL);
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ Database connection error:", err);
  }
}
connectDB();

// -----------------------------
// DASHBOARD CACHE + AUTO REFRESH
// -----------------------------
let dashboardCache = {
  categoryCount: 0,
  productCount: 0,
  customerCount: 0,
};

async function updateDashboardCounts() {
  try {
    dashboardCache = {
      categoryCount: await Category.countDocuments(),
      productCount: await Product.countDocuments(),
      customerCount: await Customer.countDocuments(),
    };
    console.log("📦 Dashboard counts refreshed:", new Date().toLocaleString());
  } catch (err) {
    console.error("❌ Error refreshing dashboard counts:", err);
  }
}
updateDashboardCounts();
cron.schedule("5 0 * * *", updateDashboardCounts); // Every day at 00:05

// -----------------------------
// ROUTES
// -----------------------------
app.get("/", (req, res) => res.render("Home"));

// -----------------------------
// LOGIN ROUTES
// -----------------------------
app.get("/login", (req, res) => res.render("login", { error: null }));

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === "Admin" && password === "firstChoice") {
    res.redirect("/dashboard");
  } else {
    res.render("login", { error: "Invalid username or password" });
  }
});

// -----------------------------
// DASHBOARD ROUTE
// -----------------------------
app.get("/dashboard", async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59
    );
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0,
      23,
      59,
      59
    );

    const todaySales = await Sale.find({
      createdAt: { $gte: startOfToday, $lte: endOfToday },
    });
    const monthSales = await Sale.find({
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
    });

    const todayTotal = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);
    const monthTotal = monthSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const todayProfit = todaySales.reduce((sum, s) => sum + (s.profit || 0), 0);
    const monthProfit = monthSales.reduce((sum, s) => sum + (s.profit || 0), 0);

    res.render("dashboard", {
      categoryCount: dashboardCache.categoryCount,
      productCount: dashboardCache.productCount,
      customerCount: dashboardCache.customerCount,
      todaySales: todayTotal,
      monthSales: monthTotal,
      todayProfit,
      monthProfit,
    });
  } catch (err) {
    console.error("❌ Dashboard Error:", err);
    res.render("dashboard", {
      categoryCount: 0,
      productCount: 0,
      customerCount: 0,
      todaySales: 0,
      monthSales: 0,
      todayProfit: 0,
      monthProfit: 0,
    });
  }
});

// -----------------------------
// CATEGORY ROUTES
// -----------------------------
app.get("/categories/new", (req, res) => res.render("categories/newCategory"));

app.post("/categories", async (req, res) => {
  try {
    const { name, code } = req.body;
    const exists = await Category.findOne({ code });
    if (exists) return res.status(400).send("⚠️ Category code must be unique.");
    await new Category({ name, code }).save();
    await updateDashboardCounts();
    res.redirect("/categories");
  } catch (err) {
    console.error("❌ Error adding category:", err);
    res.status(500).send("Error adding category");
  }
});

app.get("/categories", async (req, res) => {
  const categories = await Category.find();
  res.render("categories/viewCategories", { categories });
});

app.get("/categories/:id/edit", async (req, res) => {
  const category = await Category.findById(req.params.id);
  res.render("categories/editCategory", { category });
});

app.put("/categories/:id", async (req, res) => {
  await Category.findByIdAndUpdate(req.params.id, req.body);
  await updateDashboardCounts();
  res.redirect("/categories");
});

app.delete("/categories/:id", async (req, res) => {
  await Category.findByIdAndDelete(req.params.id);
  await updateDashboardCounts();
  res.redirect("/categories");
});

// -----------------------------
// PRODUCT ROUTES
// -----------------------------
app.get("/products/new", async (req, res) => {
  const categories = await Category.find();
  res.render("products/newProduct", { categories });
});

app.post("/products", async (req, res) => {
  try {
    const { productId, name, category, markedPrice, wholesalePrice, stockQty } =
      req.body;
    const existing = await Product.findOne({ productId });
    if (existing)
      return res
        .status(400)
        .send(`⚠️ Product ID '${productId}' already exists.`);

    const product = new Product({
      productId,
      name,
      category,
      markedPrice,
      wholesalePrice,
      stockQty,
    });
    await product.save();
    await updateDashboardCounts();
    res.redirect("/products/new");
  } catch (err) {
    console.error("❌ Error adding product:", err);
    res.status(500).send("Error adding product");
  }
});

app.get("/products", async (req, res) => {
  const products = await Product.find().populate("category");
  res.render("products/viewProducts", { products });
});

app.get("/products/:id/edit", async (req, res) => {
  const product = await Product.findById(req.params.id);
  const categories = await Category.find();
  res.render("products/editProduct", { product, categories });
});

app.put("/products/:id", async (req, res) => {
  const { name, category, markedPrice, wholesalePrice, stockQty } = req.body;
  await Product.findByIdAndUpdate(req.params.id, {
    name,
    category,
    markedPrice,
    wholesalePrice,
    stockQty,
  });
  res.redirect("/products");
});

app.delete("/products/:id", async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  await updateDashboardCounts();
  res.redirect("/products");
});

// -----------------------------
// CUSTOMER ROUTES
// -----------------------------
app.get("/customers", async (req, res) => {
  const customers = await Customer.find().sort({ name: 1 });
  res.render("customers/viewCustomers", { customers });
});

app.get("/customers/search", async (req, res) => {
  try {
    const query = (req.query.q || "").trim();
    if (!query) return res.json([]);
    const customers = await Customer.find({
      $or: [
        { phone: { $regex: query, $options: "i" } },
        { name: { $regex: query, $options: "i" } },
      ],
    })
      .limit(10)
      .select("name phone address");
    res.json(customers);
  } catch (err) {
    console.error("❌ Error searching customers:", err);
    res.status(500).json([]);
  }
});

app.get("/customers/:id/edit", async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  res.render("customers/editCustomer", { customer });
});

app.put("/customers/:id", async (req, res) => {
  await Customer.findByIdAndUpdate(req.params.id, req.body);
  await updateDashboardCounts();
  res.redirect("/customers");
});

app.delete("/customers/:id", async (req, res) => {
  await Customer.findByIdAndDelete(req.params.id);
  await updateDashboardCounts();
  res.redirect("/customers");
});

// -----------------------------
// BILLING ROUTES
// -----------------------------
app.get("/billing/new", (req, res) => res.render("billing/newBilling"));

// ✅ FIXED BILL SAVE ROUTE (FINAL)
app.post("/billing", async (req, res) => {
  try {
    let { customer, items, discounts, payments, totalAmount, totalPaid } =
      req.body;

    // Handle both array and object forms
    if (!Array.isArray(payments)) {
      if (typeof payments === "object") payments = Object.values(payments);
      else payments = [];
    }

    if (payments.length > 0) {
      const p = payments[0];
      if (p.method === "mixed") {
        payments = [
          { method: "cash", amount: parseFloat(p.cashAmount || 0) },
          { method: "upi", amount: parseFloat(p.upiAmount || 0) },
        ];
      } else {
        payments = [{ method: p.method, amount: parseFloat(p.amount || 0) }];
      }
    }

    let foundCustomer = null;
    if (customer?.phone) {
      foundCustomer = await Customer.findOne({ phone: customer.phone });
    }
    if (!foundCustomer) {
      foundCustomer = new Customer(customer || {});
      await foundCustomer.save();
    }

    const billCount = await Sale.countDocuments();
    const billNumber = `FC-${String(billCount + 1).padStart(5, "0")}`;
    const processedItems = [];
    let totalProfit = 0;

    for (const key in items) {
      const item = items[key];
      if (!item) continue;

      let product = null;
      const prodVal = (item.product || "").toString().trim();
      const qtySold = parseFloat(item.qty) || 0;
      let isNewProduct = false;

      if (mongoose.Types.ObjectId.isValid(prodVal)) {
        product = await Product.findById(prodVal);
      } else if (prodVal.length > 0) {
        product = await Product.findOne({
          name: { $regex: `^${escapeRegExp(prodVal)}$`, $options: "i" },
        });

        if (!product) {
          let categoryRef = null;
          if (item.category && mongoose.Types.ObjectId.isValid(item.category)) {
            categoryRef = item.category;
          } else if (
            item.category &&
            typeof item.category === "string" &&
            item.category.trim().length > 0
          ) {
            const catName = item.category.trim();
            let foundCat = await Category.findOne({
              name: { $regex: `^${escapeRegExp(catName)}$`, $options: "i" },
            });
            if (!foundCat) {
              foundCat = await new Category({
                name: catName,
                code: Date.now(),
              }).save();
            }
            categoryRef = foundCat._id;
          }

          product = await new Product({
            productId: `AUTO-${Date.now()}`,
            name: prodVal,
            category: categoryRef,
            markedPrice: parseFloat(item.unitPrice) || 0,
            wholesalePrice: 0,
            stockQty: qtySold,
          }).save();
          isNewProduct = true;
        }
      } else continue;

      if (!product) continue;
      if (!isNewProduct && typeof product.stockQty === "number") {
        if (qtySold > product.stockQty) {
          return res
            .status(400)
            .send(`❌ Not enough stock for ${product.name}`);
        }
      }

      if (!isNewProduct) {
        product.stockQty = Math.max(0, (product.stockQty || 0) - qtySold);
      }

      if (
        (!product.markedPrice || product.markedPrice === 0) &&
        parseFloat(item.unitPrice) > 0
      ) {
        product.markedPrice = parseFloat(item.unitPrice);
      }

      await product.save();

      const profitPerItem =
        (parseFloat(item.unitPrice || 0) - (product.wholesalePrice || 0)) *
        qtySold;
      totalProfit += profitPerItem;

      processedItems.push({
        product: product._id,
        name: product.name,
        qty: qtySold,
        unitPrice: parseFloat(item.unitPrice || 0),
        markedPriceAtSale: parseFloat(product.markedPrice || 0),
      });
    }

    const newSale = new Sale({
      billNumber,
      customer: foundCustomer._id,
      items: processedItems,
      discounts,
      payments,
      totalAmount: parseFloat(totalAmount || 0),
      totalPaid: parseFloat(totalPaid || 0),
      profit: totalProfit,
    });

    await newSale.save();
    await updateDashboardCounts();
    res.redirect(`/billing/print/${newSale._id}`);
  } catch (err) {
    console.error("❌ Error saving bill:", err);
    res.status(500).send("Error saving bill");
  }
});
// Edit Bill Page
app.get("/billing/edit/:id", async (req, res) => {
  try {
    const { view, from, to } = req.query; // capture all context
    const sale = await Sale.findById(req.params.id)
      .populate("customer")
      .populate("items.product");

    if (!sale) return res.status(404).send("Bill not found");

    // pass context to the page
    res.render("billing/editBill", { sale, view, from, to });
  } catch (err) {
    console.error("❌ Error loading edit bill:", err);
    res.status(500).send("Error loading bill for edit");
  }
});

// -----------------------------
// UPDATE BILL ROUTE (FINAL)
// -----------------------------
app.put("/billing/:id", async (req, res) => {
  try {
    const {
      customer,
      items,
      discounts,
      totalAmount,
      totalPaid,
      from,
      to,
      view,
    } = req.body;

    // Find the existing sale
    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).send("Bill not found");

    // ✅ Update customer details
    if (sale.customer && customer) {
      await Customer.findByIdAndUpdate(sale.customer, customer);
    }

    // ✅ Update sale data
    sale.items = Object.values(items || {});
    sale.discounts = discounts || {};
    sale.totalAmount = parseFloat(totalAmount) || 0;
    sale.totalPaid = parseFloat(totalPaid) || 0;

    await sale.save();

    // ✅ Redirect to correct page after saving
    if (view === "range" && from && to) {
      return res.redirect(`/sales/range?from=${from}&to=${to}`);
    } else {
      return res.redirect("/sales/today");
    }
  } catch (err) {
    console.error("❌ Error updating bill:", err);
    res.status(500).send("Error updating bill");
  }
});

// -----------------------------
// Utility
// -----------------------------
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// -----------------------------
// Print Bill
// -----------------------------
app.get("/billing/print/:id", async (req, res) => {
  const sale = await Sale.findById(req.params.id).populate("customer");
  if (!sale) return res.status(404).send("Bill not found");
  res.render("billing/printBill", { sale });
});

// -----------------------------
// SALES ROUTES
// -----------------------------
app.get("/sales/today", async (req, res) => {
  const today = new Date();
  const start = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const end = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    23,
    59,
    59
  );

  const sales = await Sale.find({ createdAt: { $gte: start, $lte: end } })
    .populate("customer")
    .populate("items.product");

  res.render("sales/todaySales", { sales });
});

app.delete("/sales/:id", async (req, res) => {
  try {
    const { from, to, view } = req.query; // get optional range query params
    const sale = await Sale.findById(req.params.id);

    if (sale) {
      for (const item of sale.items) {
        const product = await Product.findById(item.product);
        if (product) {
          product.stockQty += item.qty;
          await product.save();
        }
      }
      await Sale.findByIdAndDelete(req.params.id);
    }

    await updateDashboardCounts();

    // ✅ Redirect logic:
    if (view === "range" && from && to) {
      return res.redirect(`/sales/range?from=${from}&to=${to}`);
    } else {
      return res.redirect("/sales/today");
    }
  } catch (err) {
    console.error("❌ Error deleting sale:", err);
    res.status(500).send("Error deleting sale");
  }
});

// -----------------------------
// RANGE SALE ROUTES
// -----------------------------
app.get("/sales/range", async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.send("Please select both dates.");
    const start = new Date(from);
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    const sales = await Sale.find({ createdAt: { $gte: start, $lte: end } })
      .populate("customer")
      .populate("items.product")
      .sort({ createdAt: -1 });

    let total = 0;
    let totalProfit = 0;
    for (const s of sales) {
      total += s.totalAmount;
      if (!s.profit || s.profit === 0) {
        let computedProfit = 0;
        for (const item of s.items) {
          if (item.product) {
            computedProfit +=
              (item.unitPrice - (item.product.wholesalePrice || 0)) * item.qty;
          }
        }
        s.profit = computedProfit;
      }
      totalProfit += s.profit;
    }
    res.render("sales/rangeSales", { sales, total, totalProfit, from, to });
  } catch (err) {
    console.error("❌ Error fetching range sales:", err);
    res.send("Error loading sales data");
  }
});

// -----------------------------
// FAST SEARCH & AUTO-CREATE ENDPOINTS
// -----------------------------
app.get("/api/search/categories", async (req, res) => {
  try {
    const q = req.query.q?.trim() || "";
    const categories = await Category.find({
      name: { $regex: q, $options: "i" },
    }).limit(10);
    res.json(categories);
  } catch (err) {
    console.error("❌ Error searching categories:", err);
    res.status(500).json([]);
  }
});

app.get("/api/search/products", async (req, res) => {
  try {
    const q = req.query.q?.trim() || "";
    const categoryId = req.query.category;
    const query = { name: { $regex: q, $options: "i" } };
    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      query.category = categoryId;
    }
    const products = await Product.find(query)
      .select("name markedPrice")
      .limit(10);
    res.json(products);
  } catch (err) {
    console.error("❌ Error searching products:", err);
    res.status(500).json([]);
  }
});

app.get("/api/products/by-id/:productId", async (req, res) => {
  try {
    const product = await Product.findOne({
      productId: req.params.productId,
    }).populate("category");
    if (!product)
      return res.json({ success: false, message: "Product not found" });
    res.json({
      success: true,
      product: {
        _id: product._id,
        productId: product.productId,
        name: product.name,
        markedPrice: product.markedPrice,
        stockQty: product.stockQty,
        category: {
          _id: product.category?._id || null,
          name: product.category?.name || "",
        },
      },
    });
  } catch (err) {
    console.error("❌ Error fetching product by ID:", err);
    res.json({ success: false, message: "Server error" });
  }
});
// -----------------------------
// CATEGORY ANALYTICS API (Full version for dashboard.ejs)
// -----------------------------
app.get("/api/category-analytics", async (req, res) => {
  try {
    const month = parseInt(req.query.month);
    const year = parseInt(req.query.year);
    const mode = req.query.mode === "profit" ? "profit" : "sales";

    if (!month || !year) {
      return res.status(400).json({ error: "Month and Year are required" });
    }

    // Define date range for month/year
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Fetch sales in range with product + category populated
    const sales = await Sale.find({
      createdAt: { $gte: startDate, $lte: endDate },
    })
      .populate({
        path: "items.product",
        populate: { path: "category", model: "Category" },
      })
      .lean();

    if (!sales.length) {
      return res.json({ total: 0, categories: [] });
    }

    // Aggregate
    const categoryMap = new Map();

    for (const sale of sales) {
      for (const item of sale.items) {
        const cat = item.product?.category?.name || "Uncategorized";
        const prod = item.product?.name || "Unknown";
        const wholesale = item.product?.wholesalePrice || 0;
        const unit = item.unitPrice || 0;
        const qty = item.qty || 0;

        const saleVal = unit * qty;
        const profitVal = (unit - wholesale) * qty;

        const value = mode === "profit" ? profitVal : saleVal;

        if (!categoryMap.has(cat)) {
          categoryMap.set(cat, {
            name: cat,
            value: 0,
            products: new Map(),
          });
        }
        const catObj = categoryMap.get(cat);
        catObj.value += value;

        if (!catObj.products.has(prod)) {
          catObj.products.set(prod, { name: prod, value: 0 });
        }
        catObj.products.get(prod).value += value;
      }
    }

    // Convert map → array
    const categories = Array.from(categoryMap.values()).map((cat) => ({
      name: cat.name,
      value: cat.value,
      products: Array.from(cat.products.values()).sort(
        (a, b) => b.value - a.value
      ),
    }));

    // Sort categories descending by value
    categories.sort((a, b) => b.value - a.value);

    const total = categories.reduce((sum, c) => sum + c.value, 0);

    res.json({ total, categories });
  } catch (err) {
    console.error("❌ Error loading analytics:", err);
    res.status(500).json({ error: "Server error loading analytics." });
  }
});

// -----------------------------
// 404 Handler
// -----------------------------
app.use((req, res) => {
  res.status(404).render("404", { url: req.originalUrl });
});

// -----------------------------
// Start Server
// -----------------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
