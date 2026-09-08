namespace StockInventory.Api.Models;

public record CreateProductRequest(
    string Sku,
    string? Barcode,
    string Name,
    string? Category,
    int? MinThreshold,
    int? InitialQuantity,
    decimal? InitialUnitCost,
    string? Reference
);

public record UpdateProductRequest(
    string Sku,
    string? Barcode,
    string Name,
    string? Category,
    int? MinThreshold
);

public record StockInRequest(
    int? ProductId,
    string? SkuOrBarcode,
    int Quantity,
    decimal UnitCost,
    string? Reference,
    string? BatchNumber
);

public record StockOutRequest(
    int? ProductId,
    string? SkuOrBarcode,
    int Quantity,
    string? ReferenceNote
);

public record UpdateTransactionRequest(
    int? Quantity,
    decimal? UnitCost,
    string? ReferenceNote,
    DateTime? CreatedAt
);

public record StockOutPreviewItem(
    int BatchId,
    string BatchNumber,
    int AvailableInBatch,
    int QuantityToDraw,
    decimal UnitCost,
    decimal SubtotalCost
);

public record StockOutPreviewResponse(
    int ProductId,
    string Sku,
    string ProductName,
    int RequestedQuantity,
    int AvailableQuantity,
    decimal TotalCostOut,
    List<StockOutPreviewItem> AllocatedBatches
);

public record BatchResponseDto(
    int Id,
    int ProductId,
    string BatchNumber,
    int QuantityReceived,
    int QuantityRemaining,
    decimal UnitCost,
    decimal TotalBatchValue,
    DateTime ReceivedDate,
    string? Reference,
    string Status
);

public record ProductDetailDto(
    int Id,
    string Sku,
    string? Barcode,
    string Name,
    string Category,
    int MinThreshold,
    int TotalQuantityRemaining,
    decimal TotalValuation,
    string Status, // "InStock", "LowStock", "OutOfStock"
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<BatchResponseDto> ActiveBatches
);

public record TransactionDetailItemDto(
    int BatchId,
    string BatchNumber,
    int QuantityDrawn,
    decimal UnitCost,
    decimal SubtotalCost
);

public record StockTransactionDto(
    int Id,
    int ProductId,
    string Sku,
    string ProductName,
    string Type,
    int Quantity,
    decimal TotalCost,
    string? ReferenceNote,
    DateTime CreatedAt,
    List<TransactionDetailItemDto> Details
);

public record DashboardKpis(
    int TotalRemainingItems,
    decimal TotalRemainingValuation,
    int TotalItemsOut,
    decimal TotalCostOut,
    int TotalItemsIn,
    decimal TotalCostIn,
    int LowStockProductCount
);

public record CategoryValuation(
    string Category,
    int TotalItems,
    decimal TotalValuation
);

public record TopValuedProduct(
    int Id,
    string Sku,
    string Name,
    string Category,
    int QuantityRemaining,
    decimal TotalValuation
);

public record DailyMovementSummary(
    string Date,
    int InQuantity,
    decimal InCost,
    int OutQuantity,
    decimal OutCost
);

public record DashboardSummaryResponse(
    DashboardKpis Kpis,
    List<CategoryValuation> CategoryValuations,
    List<TopValuedProduct> TopValuedProducts,
    List<ProductDetailDto> LowStockAlerts,
    List<StockTransactionDto> RecentTransactions,
    List<DailyMovementSummary> MovementTrend
);

public record ExcelImportItem(
    int? LineNumber,
    string Sku,
    string? Barcode,
    string? Brand,
    int Quantity,
    decimal PriceBeforeVat,
    decimal? Vat,
    decimal? PriceAfterVat,
    DateTime? ReceivedDate
);

public record ExcelImportRequest(
    List<ExcelImportItem> Items,
    bool UsePriceAfterVatAsCost = false
);

public record ExcelImportResult(
    int TotalProcessed,
    int CreatedProductsCount,
    int StockInBatchesCount,
    int TotalUnits,
    decimal TotalValue,
    List<string> Messages
);
