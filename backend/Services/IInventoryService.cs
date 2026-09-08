using StockInventory.Api.Models;

namespace StockInventory.Api.Services;

public interface IInventoryService
{
    Task<List<ProductDetailDto>> GetProductsAsync(string? search = null, string? category = null, string? status = null);
    Task<ProductDetailDto?> GetProductByIdAsync(int id);
    Task<ProductDetailDto?> LookupProductAsync(string code);
    Task<ProductDetailDto> CreateProductAsync(CreateProductRequest req);
    Task<ProductDetailDto> UpdateProductAsync(int id, UpdateProductRequest req);
    Task<bool> DeleteProductAsync(int id);

    Task<List<BatchResponseDto>> GetProductBatchesAsync(int productId);
    Task<StockOutPreviewResponse> PreviewStockOutAsync(int? productId, string? skuOrBarcode, int quantity);
    Task<StockTransactionDto> StockInAsync(StockInRequest req);
    Task<StockTransactionDto> StockOutAsync(StockOutRequest req);

    Task<List<StockTransactionDto>> GetTransactionsAsync(int? productId = null, TransactionType? type = null, DateTime? fromDate = null, DateTime? toDate = null);
    Task<StockTransactionDto?> GetTransactionByIdAsync(int id);
    Task<StockTransactionDto> UpdateTransactionAsync(int id, UpdateTransactionRequest req);
    Task<bool> DeleteTransactionAsync(int id);
    Task<DashboardSummaryResponse> GetDashboardSummaryAsync();
}
