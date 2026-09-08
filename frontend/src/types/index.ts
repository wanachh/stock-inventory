export interface InventoryBatch {
  id: number;
  productId: number;
  batchNumber: string;
  quantityReceived: number;
  quantityRemaining: number;
  unitCost: number;
  totalBatchValue: number;
  receivedDate: string;
  reference?: string | null;
  status: "Active" | "Depleted";
}

export interface ProductDetail {
  id: number;
  sku: string;
  barcode?: string | null;
  name: string;
  category: string;
  minThreshold: number;
  totalQuantityRemaining: number;
  totalValuation: number;
  status: "InStock" | "LowStock" | "OutOfStock";
  createdAt: string;
  updatedAt: string;
  activeBatches: InventoryBatch[];
}

export interface TransactionDetailItem {
  batchId: number;
  batchNumber: string;
  quantityDrawn: number;
  unitCost: number;
  subtotalCost: number;
}

export interface StockTransaction {
  id: number;
  productId: number;
  sku: string;
  productName: string;
  type: "StockIn" | "StockOut";
  quantity: number;
  totalCost: number;
  referenceNote?: string | null;
  createdAt: string;
  details: TransactionDetailItem[];
}

export interface StockOutPreviewItem {
  batchId: number;
  batchNumber: string;
  availableInBatch: number;
  quantityToDraw: number;
  unitCost: number;
  subtotalCost: number;
}

export interface StockOutPreviewResponse {
  productId: number;
  sku: string;
  productName: string;
  requestedQuantity: number;
  availableQuantity: number;
  totalCostOut: number;
  allocatedBatches: StockOutPreviewItem[];
}

export interface DashboardKpis {
  totalRemainingItems: number;
  totalRemainingValuation: number;
  totalItemsOut: number;
  totalCostOut: number;
  totalItemsIn: number;
  totalCostIn: number;
  lowStockProductCount: number;
}

export interface CategoryValuation {
  category: string;
  totalItems: number;
  totalValuation: number;
}

export interface TopValuedProduct {
  id: number;
  sku: string;
  name: string;
  category: string;
  quantityRemaining: number;
  totalValuation: number;
}

export interface DailyMovementSummary {
  date: string;
  inQuantity: number;
  inCost: number;
  outQuantity: number;
  outCost: number;
}

export interface DashboardSummary {
  kpis: DashboardKpis;
  categoryValuations: CategoryValuation[];
  topValuedProducts: TopValuedProduct[];
  lowStockAlerts: ProductDetail[];
  recentTransactions: StockTransaction[];
  movementTrend: DailyMovementSummary[];
}

export interface CreateProductRequest {
  sku: string;
  barcode?: string | null;
  name: string;
  category?: string;
  minThreshold?: number;
  initialQuantity?: number;
  initialUnitCost?: number;
  reference?: string;
}

export interface UpdateProductRequest {
  sku: string;
  barcode?: string | null;
  name: string;
  category?: string;
  minThreshold?: number;
}

export interface UpdateTransactionRequest {
  quantity?: number;
  unitCost?: number;
  referenceNote?: string;
  createdAt?: string;
}

export interface StockInRequest {
  productId?: number;
  skuOrBarcode?: string;
  quantity: number;
  unitCost: number;
  reference?: string;
  batchNumber?: string;
}

export interface StockOutRequest {
  productId?: number;
  skuOrBarcode?: string;
  quantity: number;
  referenceNote?: string;
}

export interface VisitorStats {
  totalVisits: number;
  todayVisits: number;
  activeNow: number;
}

export interface ExcelImportItem {
  lineNumber?: number;
  sku: string;
  barcode?: string | null;
  brand?: string | null;
  quantity: number;
  priceBeforeVat: number;
  vat?: number | null;
  priceAfterVat?: number | null;
  receivedDate?: string | null;
}

export interface ExcelImportRequest {
  items: ExcelImportItem[];
  usePriceAfterVatAsCost?: boolean;
}

export interface ExcelImportResult {
  totalProcessed: number;
  createdProductsCount: number;
  stockInBatchesCount: number;
  totalUnits: number;
  totalValue: number;
  messages: string[];
}
