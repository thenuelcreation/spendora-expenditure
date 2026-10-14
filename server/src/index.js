require("dotenv").config();

const bcrypt = require("bcrypt");
const cors = require("cors");
const express = require("express");
const jwt = require("jsonwebtoken");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");
const {
  currencies,
  validateExpense,
  validateExpenseFilters,
  validateProfile,
} = require("./validation");

const app = express();
const port = Number(process.env.PORT || 4000);
const jwtSecret = process.env.JWT_SECRET;
const databaseUrl = process.env.DATABASE_URL;
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must be set to a secret of at least 32 characters.");
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });
const cookieName = "spendora_session";
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed by CORS."));
    },
  })
);
app.use(express.json({ limit: "1mb" }));

const defaultCategories = [
  {
    name: "Spendora Operations",
    subcategories: ["Legal Costs", "Marketing"],
  },
  {
    name: "Spendora Costs",
    subcategories: [
      "Figma Subscriptions/Payments",
      "Agents/AI",
      "KYC Tools",
      "Server Costs",
    ],
  },
  {
    name: "Office Operations",
    subcategories: [
      "Electricity Bill",
      "Water",
      "Cleaning",
      "Starlink Subscription",
      "Food",
    ],
  },
  {
    name: "Salaries",
    subcategories: ["Salary-related expenditure"],
  },
];

function sendError(res, status, message) {
  return res.status(status).json({ error: message });
}

function getCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;

  const pair = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  if (!pair) return null;

  try {
    return decodeURIComponent(pair.slice(name.length + 1));
  } catch {
    return null;
  }
}

function issueSession(res, userId) {
  const token = jwt.sign({ sub: userId }, jwtSecret, { expiresIn: "7d" });
  res.cookie(cookieName, token, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function serializeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    appearance: user.appearance,
    notifications: user.notifications,
    preferredCurrency: user.preferredCurrency,
  };
}

function requireAuth(req, res, next) {
  const token = getCookie(req, cookieName);
  if (!token) return sendError(res, 401, "Please sign in to continue.");

  try {
    const payload = jwt.verify(token, jwtSecret);
    if (typeof payload === "string" || typeof payload.sub !== "string") {
      return sendError(res, 401, "Your session is invalid. Please sign in again.");
    }
    req.userId = payload.sub;
    return next();
  } catch {
    return sendError(res, 401, "Your session has expired. Please sign in again.");
  }
}

function periodRange(period) {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  if (period === "month") {
    return {
      gte: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)),
      lt: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1)),
    };
  }
  if (period === "3months") {
    return {
      gte: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 2, 1)),
      lt: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1)),
    };
  }
  if (period === "year") {
    return {
      gte: new Date(Date.UTC(today.getUTCFullYear(), 0, 1)),
      lt: new Date(Date.UTC(today.getUTCFullYear() + 1, 0, 1)),
    };
  }
  return undefined;
}

function expenditureWhere(userId, query) {
  const where = { userId };
  const range = periodRange(query.period);
  const gte = query.dateFrom ? new Date(`${query.dateFrom}T00:00:00.000Z`) : range?.gte;
  const lt = query.dateTo
    ? new Date(`${query.dateTo}T00:00:00.000Z`)
    : range?.lt;
  const date = {};
  if (gte && !Number.isNaN(gte.getTime())) date.gte = gte;
  if (lt && !Number.isNaN(lt.getTime())) date.lt = query.dateTo
    ? new Date(lt.getTime() + 24 * 60 * 60 * 1000)
    : lt;
  if (Object.keys(date).length) where.date = date;
  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.search) {
    const search = String(query.search).trim().slice(0, 100);
    if (search) {
      const searchConditions = [
        { vendor: { contains: search, mode: "insensitive" } },
        { reference: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { category: { name: { contains: search, mode: "insensitive" } } },
        { subcategory: { name: { contains: search, mode: "insensitive" } } },
      ];
      const amount = Number(search.replace(/,/g, ""));
      if (Number.isFinite(amount) && amount > 0) {
        searchConditions.push({ amount: { equals: amount } });
      }
      where.OR = searchConditions;
    }
  }
  return where;
}

function serializeExpense(expense) {
  return {
    id: expense.id,
    categoryId: expense.categoryId,
    subcategoryId: expense.subcategoryId,
    paymentMethod: expense.paymentMethod,
    currency: expense.currency,
    description: expense.description,
    vendor: expense.vendor,
    reference: expense.reference,
    amount: expense.amount.toString(),
    date: expense.date.toISOString().slice(0, 10),
    category: { id: expense.category.id, name: expense.category.name },
    subcategory: { id: expense.subcategory.id, name: expense.subcategory.name },
  };
}

app.get("/api/health", async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  return res.json({ status: "ok" });
});

app.post("/api/auth/signup", async (req, res) => {
  const { name, email, password } = req.body || {};
  const profileError = validateProfile(name, email);
  if (profileError) return sendError(res, 400, profileError);
  if (typeof password !== "string" || password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
    return sendError(res, 400, "Password must be at least 8 characters and no more than 72 UTF-8 bytes.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) return sendError(res, 409, "An account with this email already exists.");

  const passwordHash = await bcrypt.hash(password, 12);
  let user;
  try {
    user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      categories: {
        create: defaultCategories.map(({ name: categoryName, subcategories }) => ({
          name: categoryName,
          subcategories: { create: subcategories.map((subcategoryName) => ({ name: subcategoryName })) },
        })),
      },
    },
    });
  } catch (error) {
    if (error.code === "P2002") return sendError(res, 409, "An account with this email already exists.");
    throw error;
  }

  issueSession(res, user.id);
  return res.status(201).json({ user: serializeUser(user) });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== "string" || typeof password !== "string") {
    return sendError(res, 400, "Enter your email address and password.");
  }

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return sendError(res, 401, "Email or password is incorrect.");
  }

  issueSession(res, user.id);
  return res.json({ user: serializeUser(user) });
});

app.post("/api/auth/logout", (_req, res) => {
  res.clearCookie(cookieName, cookieOptions);
  return res.status(204).end();
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return sendError(res, 401, "Your account could not be found. Please sign in again.");
  return res.json({ user: serializeUser(user) });
});

app.patch("/api/users/me", requireAuth, async (req, res) => {
  const { name, email } = req.body || {};
  const error = validateProfile(name, email);
  if (error) return sendError(res, 400, error);

  try {
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { name: name.trim(), email: email.trim().toLowerCase() },
    });
    return res.json({ user: serializeUser(user) });
  } catch (error) {
    if (error.code === "P2002") return sendError(res, 409, "That email address is already in use.");
    throw error;
  }
});

app.patch("/api/users/me/preferences", requireAuth, async (req, res) => {
  const data = {};
  if (req.body?.appearance !== undefined) {
    if (!["System", "Light", "Dark"].includes(req.body.appearance)) {
      return sendError(res, 400, "Select a supported appearance.");
    }
    data.appearance = req.body.appearance;
  }
  if (req.body?.notifications !== undefined) {
    if (typeof req.body.notifications !== "boolean") {
      return sendError(res, 400, "Notifications must be enabled or disabled.");
    }
    data.notifications = req.body.notifications;
  }
  if (req.body?.preferredCurrency !== undefined) {
    if (!currencies.has(req.body.preferredCurrency)) {
      return sendError(res, 400, "Select a supported currency.");
    }
    data.preferredCurrency = req.body.preferredCurrency;
  }
  if (!Object.keys(data).length) return sendError(res, 400, "Provide at least one preference to update.");

  const user = await prisma.user.update({ where: { id: req.userId }, data });
  return res.json({ user: serializeUser(user) });
});

app.patch("/api/users/me/password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    return sendError(res, 400, "Enter your current password and a new password.");
  }
  if (newPassword.length < 8 || Buffer.byteLength(newPassword, "utf8") > 72) {
    return sendError(res, 400, "New password must be at least 8 characters and no more than 72 UTF-8 bytes.");
  }
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    return sendError(res, 400, "Your current password is incorrect.");
  }

  await prisma.user.update({
    where: { id: req.userId },
    data: { passwordHash: await bcrypt.hash(newPassword, 12) },
  });
  issueSession(res, req.userId);
  return res.json({ message: "Password updated successfully." });
});

app.get("/api/categories", requireAuth, async (req, res) => {
  const categories = await prisma.category.findMany({
    where: { userId: req.userId },
    include: { subcategories: { orderBy: { name: "asc" } } },
    orderBy: { name: "asc" },
  });
  return res.json({ categories });
});

app.post("/api/categories", requireAuth, async (req, res) => {
  const { name, description = "", subcategories = [] } = req.body || {};
  if (typeof name !== "string" || !name.trim() || name.trim().length > 100) {
    return sendError(res, 400, "Category name is required and must be 100 characters or fewer.");
  }
  if (typeof description !== "string" || description.length > 1000) {
    return sendError(res, 400, "Description must be 1,000 characters or fewer.");
  }
  if (!Array.isArray(subcategories) || subcategories.length > 100 ||
      subcategories.some((item) => typeof item !== "string" || !item.trim() || item.trim().length > 100)) {
    return sendError(res, 400, "Enter valid sub-category names.");
  }

  try {
    const category = await prisma.category.create({
      data: {
        userId: req.userId,
        name: name.trim(),
        description: description.trim(),
        subcategories: {
          create: [...new Set(subcategories.map((item) => item.trim()))].map((subcategoryName) => ({
            name: subcategoryName,
          })),
        },
      },
      include: { subcategories: { orderBy: { name: "asc" } } },
    });
    return res.status(201).json({ category });
  } catch (error) {
    if (error.code === "P2002") return sendError(res, 409, "That category already exists.");
    throw error;
  }
});

app.patch("/api/categories/:id", requireAuth, async (req, res) => {
  const { name, description = "", subcategories = [] } = req.body || {};
  if (typeof name !== "string" || !name.trim() || name.trim().length > 100) {
    return sendError(res, 400, "Category name is required and must be 100 characters or fewer.");
  }
  if (typeof description !== "string" || description.length > 1000) {
    return sendError(res, 400, "Description must be 1,000 characters or fewer.");
  }
  if (!Array.isArray(subcategories) || subcategories.length > 100 ||
      subcategories.some((item) => typeof item !== "string" || !item.trim() || item.trim().length > 100)) {
    return sendError(res, 400, "Enter valid sub-category names.");
  }

  const category = await prisma.category.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: { subcategories: true },
  });
  if (!category) return sendError(res, 404, "Category not found.");

  const names = [...new Set(subcategories.map((item) => item.trim()))];
  const existingNames = new Set(category.subcategories.map((item) => item.name));
  const removed = category.subcategories.filter((item) => !names.includes(item.name));
  const added = names
    .filter((subcategoryName) => !existingNames.has(subcategoryName))
    .map((subcategoryName) => ({ categoryId: category.id, name: subcategoryName }));
  const referenced = removed.length
    ? await prisma.expenditure.count({
        where: { userId: req.userId, subcategoryId: { in: removed.map((item) => item.id) } },
      })
    : 0;
  if (referenced) {
    return sendError(res, 409, "A sub-category in use by an expenditure cannot be removed.");
  }

  try {
    const operations = [];
    if (removed.length) {
      operations.push(prisma.subcategory.deleteMany({
        where: { id: { in: removed.map((item) => item.id) } },
      }));
    }
    if (added.length) operations.push(prisma.subcategory.createMany({ data: added }));
    operations.push(prisma.category.update({
      where: { id: category.id },
      data: { name: name.trim(), description: description.trim() },
    }));
    await prisma.$transaction(operations);
    const updatedCategory = await prisma.category.findUnique({
      where: { id: category.id },
      include: { subcategories: { orderBy: { name: "asc" } } },
    });
    return res.json({ category: updatedCategory });
  } catch (error) {
    if (error.code === "P2002") return sendError(res, 409, "That category already exists.");
    if (error.code === "P2003") {
      return sendError(res, 409, "A sub-category in use by an expenditure cannot be removed.");
    }
    throw error;
  }
});

app.delete("/api/categories/:id", requireAuth, async (req, res) => {
  const category = await prisma.category.findFirst({
    where: { id: req.params.id, userId: req.userId },
    select: { id: true },
  });
  if (!category) return sendError(res, 404, "Category not found.");

  const useCount = await prisma.expenditure.count({
    where: { userId: req.userId, categoryId: category.id },
  });
  if (useCount) return sendError(res, 409, "This category has expenditures and cannot be deleted.");

  try {
    await prisma.category.delete({ where: { id: category.id } });
  } catch (error) {
    if (error.code === "P2003") {
      return sendError(res, 409, "This category has expenditures and cannot be deleted.");
    }
    throw error;
  }
  return res.status(204).end();
});

app.get("/api/expenses/export", requireAuth, async (req, res) => {
  const period = req.query.period || "all";
  if (!["all", "month", "3months", "year"].includes(period)) {
    return sendError(res, 400, "Select a supported export period.");
  }
  const expenses = await prisma.expenditure.findMany({
    where: expenditureWhere(req.userId, { period }),
    include: { category: true, subcategory: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  const headers = ["Date", "Category", "Sub-category", "Amount", "Currency", "Payment method", "Vendor", "Reference", "Description"];
  const escapeCsv = (value) => {
    let text = String(value ?? "");
    if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  const rows = expenses.map((expense) => [
    expense.date.toISOString().slice(0, 10),
    expense.category.name,
    expense.subcategory.name,
    expense.amount.toString(),
    expense.currency,
    expense.paymentMethod,
    expense.vendor,
    expense.reference,
    expense.description,
  ]);
  const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
  const filename = `spendora-expenditures-${period}.csv`;
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.send(`\uFEFF${csv}`);
});

app.get("/api/expenses", requireAuth, async (req, res) => {
  const filterError = validateExpenseFilters(req.query);
  if (filterError) return sendError(res, 400, filterError);
  const where = expenditureWhere(req.userId, req.query);
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(req.query.pageSize, 10) || 10));
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { preferredCurrency: true },
  });
  if (!user) return sendError(res, 401, "Your account could not be found. Please sign in again.");
  const [items, total, totalsByCurrency, currentMonth] = await Promise.all([
    prisma.expenditure.findMany({
      where,
      include: { category: true, subcategory: true },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.expenditure.count({ where }),
    prisma.expenditure.groupBy({
      by: ["currency"],
      where,
      _sum: { amount: true },
    }),
    prisma.expenditure.aggregate({
      where: {
        userId: req.userId,
        date: periodRange("month"),
        currency: user.preferredCurrency,
      },
      _sum: { amount: true },
    }),
  ]);
  return res.json({
    items: items.map(serializeExpense),
    total,
    page,
    pageSize,
    summary: {
      totalCount: await prisma.expenditure.count({ where: { userId: req.userId } }),
      thisMonthAmount: currentMonth._sum.amount?.toString() || "0",
      totalsByCurrency: Object.fromEntries(
        totalsByCurrency.map(({ currency, _sum }) => [currency, _sum.amount?.toString() || "0"])
      ),
    },
  });
});

app.get("/api/expenses/:id", requireAuth, async (req, res) => {
  const expense = await prisma.expenditure.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: { category: true, subcategory: true },
  });
  if (!expense) return sendError(res, 404, "Expenditure not found.");
  return res.json({ expenditure: serializeExpense(expense) });
});

app.post("/api/expenses", requireAuth, async (req, res) => {
  const error = validateExpense(req.body || {});
  if (error) return sendError(res, 400, error);
  const category = await prisma.category.findFirst({
    where: {
      id: req.body.categoryId,
      userId: req.userId,
      subcategories: { some: { id: req.body.subcategoryId } },
    },
    select: { id: true },
  });
  if (!category) return sendError(res, 400, "Choose a sub-category belonging to that category.");

  const expense = await prisma.expenditure.create({
    data: {
      userId: req.userId,
      categoryId: req.body.categoryId,
      subcategoryId: req.body.subcategoryId,
      date: new Date(`${req.body.date}T00:00:00.000Z`),
      amount: req.body.amount,
      currency: req.body.currency,
      paymentMethod: req.body.paymentMethod,
      description: (req.body.description || "").trim(),
      vendor: (req.body.vendor || "").trim(),
      reference: (req.body.reference || "").trim(),
    },
    include: { category: true, subcategory: true },
  });
  return res.status(201).json({ expenditure: serializeExpense(expense) });
});

app.patch("/api/expenses/:id", requireAuth, async (req, res) => {
  const existing = await prisma.expenditure.findFirst({
    where: { id: req.params.id, userId: req.userId },
    select: { id: true },
  });
  if (!existing) return sendError(res, 404, "Expenditure not found.");

  const error = validateExpense(req.body || {});
  if (error) return sendError(res, 400, error);
  const category = await prisma.category.findFirst({
    where: {
      id: req.body.categoryId,
      userId: req.userId,
      subcategories: { some: { id: req.body.subcategoryId } },
    },
    select: { id: true },
  });
  if (!category) return sendError(res, 400, "Choose a sub-category belonging to that category.");

  const expense = await prisma.expenditure.update({
    where: { id: existing.id },
    data: {
      categoryId: req.body.categoryId,
      subcategoryId: req.body.subcategoryId,
      date: new Date(`${req.body.date}T00:00:00.000Z`),
      amount: req.body.amount,
      currency: req.body.currency,
      paymentMethod: req.body.paymentMethod,
      description: (req.body.description || "").trim(),
      vendor: (req.body.vendor || "").trim(),
      reference: (req.body.reference || "").trim(),
    },
    include: { category: true, subcategory: true },
  });
  return res.json({ expenditure: serializeExpense(expense) });
});

app.delete("/api/expenses/:id", requireAuth, async (req, res) => {
  const result = await prisma.expenditure.deleteMany({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!result.count) return sendError(res, 404, "Expenditure not found.");
  return res.status(204).end();
});

app.get("/api/dashboard", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return sendError(res, 401, "Your account could not be found. Please sign in again.");
  const period = req.query.period || "year";
  if (!["year", "lastYear"].includes(period)) return sendError(res, 400, "Select a supported dashboard period.");
  if (req.query.currency && !currencies.has(req.query.currency)) {
    return sendError(res, 400, "Select a supported currency.");
  }
  const currency = req.query.currency || user.preferredCurrency;
  const now = new Date();
  const year = period === "lastYear" ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const nextYear = new Date(Date.UTC(year + 1, 0, 1));
  const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const previousMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const currencyWhere = { userId: req.userId, currency };
  const yearWhere = { ...currencyWhere, date: { gte: yearStart, lt: nextYear } };

  const [
    overallCount,
    currentTotal,
    monthTotal,
    previousMonthTotal,
    monthCount,
    yearCount,
    monthRows,
    categoryRows,
    recent,
  ] = await Promise.all([
    prisma.expenditure.count({ where: { userId: req.userId } }),
    prisma.expenditure.aggregate({ where: currencyWhere, _sum: { amount: true } }),
    prisma.expenditure.aggregate({
      where: { ...currencyWhere, date: { gte: currentMonthStart, lt: nextMonthStart } },
      _sum: { amount: true },
    }),
    prisma.expenditure.aggregate({
      where: { ...currencyWhere, date: { gte: previousMonthStart, lt: currentMonthStart } },
      _sum: { amount: true },
    }),
    prisma.expenditure.count({
      where: { userId: req.userId, date: { gte: currentMonthStart, lt: nextMonthStart } },
    }),
    prisma.expenditure.count({ where: yearWhere }),
    prisma.expenditure.findMany({
      where: yearWhere,
      select: { date: true, amount: true },
    }),
    prisma.expenditure.groupBy({
      by: ["categoryId"],
      where: yearWhere,
      _sum: { amount: true },
    }),
    prisma.expenditure.findMany({
      where: { userId: req.userId },
      include: { category: true, subcategory: true },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 5,
    }),
  ]);

  const monthly = Array.from({ length: 12 }, (_, index) => ({
    month: new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" })
      .format(new Date(Date.UTC(year, index, 1))),
    amount: 0,
  }));
  for (const item of monthRows) {
    monthly[item.date.getUTCMonth()].amount += Number(item.amount);
  }

  const categories = await prisma.category.findMany({
    where: { userId: req.userId },
    select: { id: true, name: true },
  });
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const categoryBreakdown = categoryRows
    .map((row) => ({
      name: categoryNames.get(row.categoryId) || "Other",
      amount: Number(row._sum.amount || 0),
    }))
    .sort((left, right) => right.amount - left.amount);
  const categoryTotal = categoryBreakdown.reduce((sum, category) => sum + category.amount, 0);
  const totalAmount = Number(currentTotal._sum.amount || 0);
  const monthAmount = Number(monthTotal._sum.amount || 0);
  const previousMonthAmount = Number(previousMonthTotal._sum.amount || 0);

  return res.json({
    user: serializeUser(user),
    currency,
    summary: {
      totalAmount,
      monthAmount,
      monthCount,
      overallCount,
      yearCount,
      monthChangePercent: previousMonthAmount
        ? Math.round(((monthAmount - previousMonthAmount) / previousMonthAmount) * 100)
        : null,
    },
    monthly,
    categories: categoryBreakdown.map((category) => ({
      ...category,
      percentage: categoryTotal ? Math.round((category.amount / categoryTotal) * 100) : 0,
    })),
    recent: recent.map(serializeExpense),
  });
});

app.use((req, res) => sendError(res, 404, `Route not found: ${req.method} ${req.path}`));
app.use((error, _req, res, _next) => {
  void _next;
  if (error.message === "Origin is not allowed by CORS.") {
    return sendError(res, 403, error.message);
  }
  if (error.type === "entity.parse.failed") return sendError(res, 400, "Request body must be valid JSON.");
  if (error.type === "entity.too.large") return sendError(res, 413, "Request body is too large.");
  console.error(error);
  return sendError(res, 500, "An unexpected server error occurred.");
});

let server;

async function start() {
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    console.error("Could not connect to PostgreSQL. Check DATABASE_URL and ensure the database is running.", error);
    await prisma.$disconnect();
    process.exitCode = 1;
    return;
  }

  server = app.listen(port, () => {
    console.log(`Spendora API listening on port ${port}.`);
  });
  server.on("error", (error) => {
    console.error(`Spendora API could not listen on port ${port}.`, error);
    process.exitCode = 1;
    void prisma.$disconnect();
  });
}

async function shutdown(signal) {
  console.log(`${signal} received; shutting down Spendora API.`);
  if (!server) {
    await prisma.$disconnect();
    return;
  }
  server.close(async (error) => {
    if (error) {
      console.error(error);
      process.exitCode = 1;
    }
    await prisma.$disconnect();
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

void start();
