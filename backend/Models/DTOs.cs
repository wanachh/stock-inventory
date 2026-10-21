namespace StockInventory.Api.Models;

public record CreateProductRequest(
    string Sku,
    string? Barcode,
    string Name,
    string? Brand,
    string? Category,
    int? MinThreshold,
    int? InitialQuantity,
    decimal? InitialUnitCost,
    string? Reference,
    DateTime? TransactionDate = null,
    string? Location = "BT"
);

public record UpdateProductRequest(
    string Sku,
    string? Barcode,
    string Name,
    string? Brand,
    string? Category,
    int? MinThreshold
);

public record StockInRequest(
    int? ProductId,
    string? SkuOrBarcode,
    int Quantity,
    decimal UnitCost,
    string? Reference,
    string? BatchNumber,
    DateTime? TransactionDate = null,
    string? Location = "BT"
);

public record StockOutRequest(
    int? ProductId,
    string? SkuOrBarcode,
    int Quantity,
    string? ReferenceNote,
    DateTime? TransactionDate = null,
    string? Location = null
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
    decimal SubtotalCost,
    string Location = "BT"
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
    string Status,
    string Location = "BT"
);

public record ProductDetailDto(
    int Id,
    string Sku,
    string? Barcode,
    string Name,
    string? Brand,
    string Category,
    int MinThreshold,
    int TotalQuantityRemaining,
    decimal TotalValuation,
    string Status, // "InStock", "LowStock", "OutOfStock"
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<BatchResponseDto> ActiveBatches,
    bool IsDeleted = false,
    DateTime? DeletedAt = null
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
    List<TransactionDetailItemDto> Details,
    string? Brand = null,
    bool IsProductDeleted = false,
    string? Location = "BT"
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
    string? Brand,
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
    string? Sku,
    string? Barcode,
    string? Name,
    string? Brand,
    int Quantity,
    decimal PriceBeforeVat,
    decimal? Vat,
    decimal? PriceAfterVat,
    DateTime? ReceivedDate,
    string? Location = null
);

public record ExcelImportRequest(
    List<ExcelImportItem> Items,
    bool UsePriceAfterVatAsCost = false,
    string? DefaultLocation = "BT"
);

public record ExcelImportResult(
    int TotalProcessed,
    int CreatedProductsCount,
    int StockInBatchesCount,
    int StockOutBatchesCount,
    int ZeroQuantityCount,
    int TotalUnitsIn,
    int TotalUnitsOut,
    decimal TotalValueIn,
    decimal TotalValueOut,
    List<string> Messages
);

public record ClearAllDataRequest(
    string Confirmation
);
