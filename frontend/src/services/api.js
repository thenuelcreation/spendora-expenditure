export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function readResponse(response) {
  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("application/json")
    ? response.json()
    : response.text();
}

function errorMessage(body, fallback) {
  if (typeof body === "object" && body?.error) {
    return typeof body.error === "string" ? body.error : body.error.message || fallback;
  }
  return typeof body === "string" && body ? body : fallback;
}

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers,
      credentials: "include",
    });
  } catch (error) {
    throw new Error("Unable to connect to Spendora. Check your connection and try again.", {
      cause: error,
    });
  }

  const body = await readResponse(response);
  if (!response.ok) {
    throw new ApiError(errorMessage(body, "The request could not be completed."), response.status);
  }
  return body;
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
    response = await fetch(`/api${path}`, { credentials: "include" });
  } catch (error) {
    throw new Error("Unable to connect to Spendora. Check your connection and try again.", {
      cause: error,
    });
  }
  if (!response.ok) {
    const body = await readResponse(response);
    throw new ApiError(errorMessage(body, "The download could not be created."), response.status);
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
