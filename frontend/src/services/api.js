const apiBase = process.env.NEXT_PUBLIC_API_URL || "";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function backendPath(path) {
  const [pathname, search = ""] = path.split("?", 2);
  const params = new URLSearchParams(search);
  const aliases = {
    search: "q",
    categoryId: "category_id",
    dateFrom: "from",
    dateTo: "to",
    pageSize: "page_size",
  };

  for (const [frontendName, backendName] of Object.entries(aliases)) {
    if (params.has(frontendName)) {
      params.set(backendName, params.get(frontendName));
      params.delete(frontendName);
    }
  }

  if (pathname === "/dashboard" && params.has("period")) {
    const period = params.get("period");
    params.set("year", period === "lastYear" ? "previous" : "current");
    params.delete("period");
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function normalizeUser(user) {
  return {
    ...user,
    appearance: user.appearance[0].toUpperCase() + user.appearance.slice(1),
  };
}

function normalizeExpense(expense) {
  return {
    ...expense,
    category: { id: expense.categoryId, name: expense.categoryName },
    subcategory: { id: expense.subcategoryId, name: expense.subcategoryName },
  };
}

function normalizeResponse(path, body) {
  const pathname = path.split("?", 1)[0];

  if (pathname === "/auth/me" || pathname === "/auth/login" ||
      pathname === "/auth/signup" || pathname === "/users/me" ||
      pathname === "/users/me/preferences") {
    return { user: normalizeUser(body) };
  }
  if (pathname === "/categories" && Array.isArray(body)) {
    return { categories: body };
  }
  if (pathname === "/categories" && body?.id) {
    return { category: body };
  }
  if (/^\/categories\/[^/]+$/.test(pathname) &&
      (body?.id || body?.name)) {
    return { category: body };
  }
  if (pathname === "/expenses" && Array.isArray(body?.items)) {
    return {
      items: body.items.map(normalizeExpense),
      total: body.totalItems,
      summary: {
        totalCount: body.totalItems,
        totalsByCurrency: Object.fromEntries(
          body.totals.map(({ currency, total }) => [currency, total]),
        ),
      },
    };
  }
  if (/^\/expenses\/[^/]+$/.test(pathname) && body?.categoryName) {
    return { expenditure: normalizeExpense(body) };
  }
  if (pathname === "/dashboard") {
    const categoryTotal = body.categoryBreakdown.reduce(
      (total, item) => total + Number(item.amount),
      0,
    );
    return {
      summary: {
        totalAmount: body.totalAmount,
        overallCount: body.totalCount +
          body.otherCurrencies.reduce((total, item) => total + item.count, 0),
        monthAmount: body.currentMonth.amount,
        monthCount: body.currentMonth.count,
        yearCount: body.yearCount,
        monthChangePercent: body.monthOverMonthChangePercent,
      },
      monthly: body.monthlyTrend.map((item) => ({
        ...item,
        amount: Number(item.amount),
      })),
      categories: body.categoryBreakdown.map((item) => ({
        name: item.category,
        amount: Number(item.amount),
        percentage: categoryTotal
          ? Math.round(Number(item.amount) / categoryTotal * 100)
          : 0,
      })),
      recent: body.recent.map(normalizeExpense),
    };
  }
  return body;
}

function requestBody(path, body) {
  if (path.split("?", 1)[0] !== "/users/me/preferences" ||
      typeof body?.appearance !== "string") {
    return body;
  }
  return { ...body, appearance: body.appearance.toLowerCase() };
}

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let response;
  try {
    const body = options.body && !(options.body instanceof FormData)
      ? requestBody(path, JSON.parse(options.body))
      : options.body;
    response = await fetch(`${apiBase}/api${backendPath(path)}`, {
      ...options,
      body: body && !(body instanceof FormData) ? JSON.stringify(body) : body,
      headers,
      credentials: "include",
    });
  } catch (error) {
    throw new Error("Unable to connect to Spendora. Check your connection and try again.", {
      cause: error,
    });
  }

  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();
  if (!response.ok) {
    const message = typeof body === "object" && body?.error
      ? body.error.message || body.error
      : "The request could not be completed.";
    throw new ApiError(message, response.status);
  }
  return normalizeResponse(path, body);
}

export function apiGet(path, options) {
  return apiRequest(path, options);
}

export function apiPost(path, body) {
  return apiRequest(path, { method: "POST", body: JSON.stringify(body) });
}

export function apiPatch(path, body) {
  return apiRequest(path, { method: "PATCH", body: JSON.stringify(body) });
}

export function apiDelete(path) {
  return apiRequest(path, { method: "DELETE" });
}

export async function apiDownload(path, fallbackName) {
  let response;
  try {
    response = await fetch(`${apiBase}/api${backendPath(path)}`, { credentials: "include" });
  } catch (error) {
    throw new Error("Unable to connect to Spendora. Check your connection and try again.", {
      cause: error,
    });
  }
  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json")
      ? await response.json()
      : await response.text();
    const message = typeof body === "object" && body?.error
      ? body.error.message || body.error
      : typeof body === "string" && body
        ? body
        : "The download could not be created.";
    throw new ApiError(message, response.status);
  }

  const disposition = response.headers.get("content-disposition") || "";
  const fileName = disposition.match(/filename="?([^";]+)"?/i)?.[1] || fallbackName;
  const objectUrl = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
