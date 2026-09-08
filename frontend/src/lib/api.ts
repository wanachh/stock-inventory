import {
  CreateProductRequest,
  DashboardSummary,
  InventoryBatch,
  ProductDetail,
  StockInRequest,
  StockOutPreviewResponse,
  StockOutRequest,
  StockTransaction,
  UpdateProductRequest,
  UpdateTransactionRequest,
} from "../types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5200/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    let errorMsg = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const errJson = await res.json();
      if (errJson.error) errorMsg = errJson.error;
      else if (errJson.message) errorMsg = errJson.message;
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }

  if (res.status === 204) {
    return {} as T;
  }

  return res.json();
}

export const api = {
  // Dashboard
  getDashboardSummary: () => request<DashboardSummary>("/dashboard/summary"),

  // Products
  getProducts: (params?: { search?: string; category?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append("search", params.search);
    if (params?.category) q.append("category", params.category);
    if (params?.status) q.append("status", params.status);
    const qs = q.toString() ? `?${q.toString()}` : "";
    return request<ProductDetail[]>(`/products${qs}`);
  },

  getProduct: (id: number) => request<ProductDetail>(`/products/${id}`),

  lookupProduct: (code: string) =>
    request<ProductDetail>(`/products/lookup/${encodeURIComponent(code)}`),

  getProductBatches: (productId: number) =>
    request<InventoryBatch[]>(`/products/${productId}/batches`),

  createProduct: (data: CreateProductRequest) =>
    request<ProductDetail>("/products", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateProduct: (id: number, data: UpdateProductRequest) =>
    request<ProductDetail>(`/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteProduct: (id: number) =>
    request<void>(`/products/${id}`, {
      method: "DELETE",
    }),

  // Stock Movements & FIFO Engine
  previewStockOut: (data: StockOutRequest) =>
    request<StockOutPreviewResponse>("/stock/preview-out", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  stockIn: (data: StockInRequest) =>
    request<StockTransaction>("/stock/in", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  stockOut: (data: StockOutRequest) =>
    request<StockTransaction>("/stock/out", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Transactions
  getTransactions: (params?: {
    productId?: number;
    type?: string;
    fromDate?: string;
    toDate?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.productId) q.append("productId", params.productId.toString());
    if (params?.type && params.type !== "all") q.append("type", params.type);
    if (params?.fromDate) q.append("fromDate", params.fromDate);
    if (params?.toDate) q.append("toDate", params.toDate);
    const qs = q.toString() ? `?${q.toString()}` : "";
    return request<StockTransaction[]>(`/transactions${qs}`);
  },

  getTransaction: (id: number) => request<StockTransaction>(`/transactions/${id}`),

  updateTransaction: (id: number, data: UpdateTransactionRequest) =>
    request<StockTransaction>(`/transactions/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteTransaction: (id: number) =>
    request<void>(`/transactions/${id}`, {
      method: "DELETE",
    }),
};

// Formatting helpers
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(val: number): string {
  return new Intl.NumberFormat("th-TH").format(val);
}

export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}
