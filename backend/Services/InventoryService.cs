using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using StockInventory.Api.Data;
using StockInventory.Api.Models;

namespace StockInventory.Api.Services;

public partial class InventoryService : IInventoryService
{
    private readonly AppDbContext _db;

    [GeneratedRegex(@"^[A-Za-z0-9_\-\.]{2,50}$")]
    private static partial Regex SkuRegex();

    public InventoryService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<ProductDetailDto>> GetProductsAsync(string? search = null, string? category = null, string? status = null)
    {
        var query = _db.Products
            .Include(p => p.Batches.Where(b => b.Status == BatchStatus.Active))
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(p =>
                p.Sku.ToLower().Contains(s) ||
                (p.Barcode != null && p.Barcode.ToLower().Contains(s)) ||
                p.Name.ToLower().Contains(s));
        }

        if (!string.IsNullOrWhiteSpace(category) && !category.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(p => p.Category.ToLower() == category.Trim().ToLower());
        }

        var products = await query.OrderBy(p => p.Name).ToListAsync();
        var dtos = products.Select(MapToProductDetailDto).ToList();

        if (!string.IsNullOrWhiteSpace(status) && !status.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            dtos = dtos.Where(p => p.Status.Equals(status.Trim(), StringComparison.OrdinalIgnoreCase)).ToList();
        }

        return dtos;
    }

    public async Task<ProductDetailDto?> GetProductByIdAsync(int id)
    {
        var product = await _db.Products
            .Include(p => p.Batches.Where(b => b.Status == BatchStatus.Active))
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == id);

        return product == null ? null : MapToProductDetailDto(product);
    }

    public async Task<ProductDetailDto?> LookupProductAsync(string code)
    {
        if (string.IsNullOrWhiteSpace(code)) return null;

        var clean = code.Trim();
        var product = await _db.Products
            .Include(p => p.Batches.Where(b => b.Status == BatchStatus.Active))
            .AsNoTracking()
            .FirstOrDefaultAsync(p =>
                p.Sku.ToLower() == clean.ToLower() ||
                (p.Barcode != null && p.Barcode.ToLower() == clean.ToLower()));

        return product == null ? null : MapToProductDetailDto(product);
    }

    public async Task<ProductDetailDto> CreateProductAsync(CreateProductRequest req)
    {
        var sku = req.Sku.Trim().ToUpper();
        if (!SkuRegex().IsMatch(sku))
        {
            throw new ArgumentException("SKU must be 2-50 alphanumeric characters (letters, numbers, dash, underscore, dot).");
        }

        var exists = await _db.Products.AnyAsync(p => p.Sku.ToLower() == sku.ToLower());
        if (exists)
        {
            throw new InvalidOperationException($"SKU '{sku}' already exists in the system.");
        }

        if (!string.IsNullOrWhiteSpace(req.Barcode))
        {
            var barcodeExists = await _db.Products.AnyAsync(p => p.Barcode != null && p.Barcode.ToLower() == req.Barcode.Trim().ToLower());
            if (barcodeExists)
            {
                throw new InvalidOperationException($"Barcode '{req.Barcode.Trim()}' is already assigned to another product.");
            }
        }

        var product = new Product
        {
            Sku = sku,
            Barcode = string.IsNullOrWhiteSpace(req.Barcode) ? null : req.Barcode.Trim(),
            Name = req.Name.Trim(),
            Category = string.IsNullOrWhiteSpace(req.Category) ? "General" : req.Category.Trim(),
            MinThreshold = req.MinThreshold ?? 5,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Products.Add(product);
        await _db.SaveChangesAsync();

        // If initial quantity and cost provided, create initial batch and transaction
        if (req.InitialQuantity.HasValue && req.InitialQuantity.Value > 0)
        {
            var unitCost = req.InitialUnitCost ?? 0m;
            var batchNumber = $"LOT-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..4].ToUpper()}";
            var batch = new InventoryBatch
            {
                ProductId = product.Id,
                BatchNumber = batchNumber,
                QuantityReceived = req.InitialQuantity.Value,
                QuantityRemaining = req.InitialQuantity.Value,
                UnitCost = unitCost,
                ReceivedDate = DateTime.UtcNow,
                Reference = req.Reference ?? "Initial Stock",
                Status = BatchStatus.Active
            };
            _db.InventoryBatches.Add(batch);
            await _db.SaveChangesAsync();

            var tx = new StockTransaction
            {
                ProductId = product.Id,
                Type = TransactionType.StockIn,
                Quantity = req.InitialQuantity.Value,
                TotalCost = req.InitialQuantity.Value * unitCost,
                ReferenceNote = req.Reference ?? "Initial Stock Receipt",
                CreatedAt = DateTime.UtcNow
            };
            _db.StockTransactions.Add(tx);
            await _db.SaveChangesAsync();

            var detail = new TransactionBatchDetail
            {
                StockTransactionId = tx.Id,
                InventoryBatchId = batch.Id,
                QuantityDrawn = req.InitialQuantity.Value,
                UnitCost = unitCost,
                SubtotalCost = req.InitialQuantity.Value * unitCost
            };
            _db.TransactionBatchDetails.Add(detail);
            await _db.SaveChangesAsync();
        }

        return (await GetProductByIdAsync(product.Id))!;
    }

    public async Task<ProductDetailDto> UpdateProductAsync(int id, UpdateProductRequest req)
    {
        var product = await _db.Products.FirstOrDefaultAsync(p => p.Id == id);
        if (product == null)
        {
            throw new KeyNotFoundException($"Product with ID {id} not found.");
        }

        var newSku = req.Sku.Trim().ToUpper();
        if (!SkuRegex().IsMatch(newSku))
        {
            throw new ArgumentException("SKU must be 2-50 alphanumeric characters (letters, numbers, dash, underscore, dot).");
        }

        // Check if SKU changed and if it collides with another product
        if (!product.Sku.Equals(newSku, StringComparison.OrdinalIgnoreCase))
        {
            var skuTaken = await _db.Products.AnyAsync(p => p.Id != id && p.Sku.ToLower() == newSku.ToLower());
            if (skuTaken)
            {
                throw new InvalidOperationException($"SKU '{newSku}' is already used by another product.");
            }
            product.Sku = newSku;
        }

        if (!string.IsNullOrWhiteSpace(req.Barcode))
        {
            var cleanBarcode = req.Barcode.Trim();
            var barcodeTaken = await _db.Products.AnyAsync(p => p.Id != id && p.Barcode != null && p.Barcode.ToLower() == cleanBarcode.ToLower());
            if (barcodeTaken)
            {
                throw new InvalidOperationException($"Barcode '{cleanBarcode}' is already assigned to another product.");
            }
            product.Barcode = cleanBarcode;
        }
        else
        {
            product.Barcode = null;
        }

        product.Name = req.Name.Trim();
        product.Category = string.IsNullOrWhiteSpace(req.Category) ? "General" : req.Category.Trim();
        product.MinThreshold = req.MinThreshold ?? product.MinThreshold;
        product.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return (await GetProductByIdAsync(product.Id))!;
    }

    public async Task<bool> DeleteProductAsync(int id)
    {
        var product = await _db.Products.FirstOrDefaultAsync(p => p.Id == id);
        if (product == null) return false;

        _db.Products.Remove(product);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<BatchResponseDto>> GetProductBatchesAsync(int productId)
    {
        var batches = await _db.InventoryBatches
            .Where(b => b.ProductId == productId)
            .OrderByDescending(b => b.ReceivedDate)
            .AsNoTracking()
            .ToListAsync();

        return batches.Select(b => new BatchResponseDto(
            b.Id,
            b.ProductId,
            b.BatchNumber,
            b.QuantityReceived,
            b.QuantityRemaining,
            b.UnitCost,
            b.QuantityRemaining * b.UnitCost,
            b.ReceivedDate,
            b.Reference,
            b.Status.ToString()
        )).ToList();
    }

    public async Task<StockOutPreviewResponse> PreviewStockOutAsync(int? productId, string? skuOrBarcode, int quantity)
    {
        if (quantity <= 0)
        {
            throw new ArgumentException("Quantity to stock out must be greater than zero.");
        }

        var product = await FindProductAsync(productId, skuOrBarcode);
        if (product == null)
        {
            throw new KeyNotFoundException("Product not found.");
        }

        // Active batches ordered FIFO
        var activeBatches = await _db.InventoryBatches
            .Where(b => b.ProductId == product.Id && b.Status == BatchStatus.Active && b.QuantityRemaining > 0)
            .OrderBy(b => b.ReceivedDate)
            .ThenBy(b => b.Id)
            .AsNoTracking()
            .ToListAsync();

        var totalAvailable = activeBatches.Sum(b => b.QuantityRemaining);
        if (totalAvailable < quantity)
        {
            throw new InvalidOperationException($"Insufficient stock. Available: {totalAvailable}, Requested: {quantity}.");
        }

        var allocated = new List<StockOutPreviewItem>();
        int needed = quantity;
        decimal totalCost = 0m;

        foreach (var batch in activeBatches)
        {
            if (needed <= 0) break;

            int draw = Math.Min(batch.QuantityRemaining, needed);
            decimal subtotal = draw * batch.UnitCost;
            totalCost += subtotal;

            allocated.Add(new StockOutPreviewItem(
                batch.Id,
                batch.BatchNumber,
                batch.QuantityRemaining,
                draw,
                batch.UnitCost,
                subtotal
            ));

            needed -= draw;
        }

        return new StockOutPreviewResponse(
            product.Id,
            product.Sku,
            product.Name,
            quantity,
            totalAvailable,
            totalCost,
            allocated
        );
    }

    public async Task<StockTransactionDto> StockInAsync(StockInRequest req)
    {
        if (req.Quantity <= 0)
        {
            throw new ArgumentException("Quantity must be greater than zero.");
        }
        if (req.UnitCost < 0)
        {
            throw new ArgumentException("Unit cost cannot be negative.");
        }

        var product = await FindProductAsync(req.ProductId, req.SkuOrBarcode);
        if (product == null)
        {
            throw new KeyNotFoundException("Product not found.");
        }

        var batchNumber = !string.IsNullOrWhiteSpace(req.BatchNumber)
            ? req.BatchNumber.Trim()
            : $"LOT-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..4].ToUpper()}";

        var batch = new InventoryBatch
        {
            ProductId = product.Id,
            BatchNumber = batchNumber,
            QuantityReceived = req.Quantity,
            QuantityRemaining = req.Quantity,
            UnitCost = req.UnitCost,
            ReceivedDate = DateTime.UtcNow,
            Reference = req.Reference,
            Status = BatchStatus.Active
        };

        _db.InventoryBatches.Add(batch);
        await _db.SaveChangesAsync();

        var totalCost = req.Quantity * req.UnitCost;
        var transaction = new StockTransaction
        {
            ProductId = product.Id,
            Type = TransactionType.StockIn,
            Quantity = req.Quantity,
            TotalCost = totalCost,
            ReferenceNote = req.Reference,
            CreatedAt = DateTime.UtcNow
        };

        _db.StockTransactions.Add(transaction);
        await _db.SaveChangesAsync();

        var detail = new TransactionBatchDetail
        {
            StockTransactionId = transaction.Id,
            InventoryBatchId = batch.Id,
            QuantityDrawn = req.Quantity,
            UnitCost = req.UnitCost,
            SubtotalCost = totalCost
        };

        _db.TransactionBatchDetails.Add(detail);
        product.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return new StockTransactionDto(
            transaction.Id,
            product.Id,
            product.Sku,
            product.Name,
            transaction.Type.ToString(),
            transaction.Quantity,
            transaction.TotalCost,
            transaction.ReferenceNote,
            transaction.CreatedAt,
            [new TransactionDetailItemDto(batch.Id, batch.BatchNumber, req.Quantity, req.UnitCost, totalCost)]
        );
    }

    public async Task<StockTransactionDto> StockOutAsync(StockOutRequest req)
    {
        if (req.Quantity <= 0)
        {
            throw new ArgumentException("Quantity must be greater than zero.");
        }

        var product = await FindProductAsync(req.ProductId, req.SkuOrBarcode);
        if (product == null)
        {
            throw new KeyNotFoundException("Product not found.");
        }

        // Active batches ordered FIFO
        var batches = await _db.InventoryBatches
            .Where(b => b.ProductId == product.Id && b.Status == BatchStatus.Active && b.QuantityRemaining > 0)
            .OrderBy(b => b.ReceivedDate)
            .ThenBy(b => b.Id)
            .ToListAsync();

        int available = batches.Sum(b => b.QuantityRemaining);
        if (available < req.Quantity)
        {
            throw new InvalidOperationException($"Insufficient inventory. Requested: {req.Quantity}, Available: {available}.");
        }

        int remainingToDraw = req.Quantity;
        decimal totalCostOut = 0m;
        var detailDtos = new List<TransactionDetailItemDto>();

        var transaction = new StockTransaction
        {
            ProductId = product.Id,
            Type = TransactionType.StockOut,
            Quantity = req.Quantity,
            TotalCost = 0m,
            ReferenceNote = req.ReferenceNote,
            CreatedAt = DateTime.UtcNow
        };

        _db.StockTransactions.Add(transaction);
        await _db.SaveChangesAsync();

        foreach (var batch in batches)
        {
            if (remainingToDraw <= 0) break;

            int draw = Math.Min(batch.QuantityRemaining, remainingToDraw);
            batch.QuantityRemaining -= draw;
            if (batch.QuantityRemaining == 0)
            {
                batch.Status = BatchStatus.Depleted;
            }

            decimal subtotal = draw * batch.UnitCost;
            totalCostOut += subtotal;

            var detail = new TransactionBatchDetail
            {
                StockTransactionId = transaction.Id,
                InventoryBatchId = batch.Id,
                QuantityDrawn = draw,
                UnitCost = batch.UnitCost,
                SubtotalCost = subtotal
            };
            _db.TransactionBatchDetails.Add(detail);

            detailDtos.Add(new TransactionDetailItemDto(
                batch.Id,
                batch.BatchNumber,
                draw,
                batch.UnitCost,
                subtotal
            ));

            remainingToDraw -= draw;
        }

        transaction.TotalCost = totalCostOut;
        product.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return new StockTransactionDto(
            transaction.Id,
            product.Id,
            product.Sku,
            product.Name,
            transaction.Type.ToString(),
            transaction.Quantity,
            transaction.TotalCost,
            transaction.ReferenceNote,
            transaction.CreatedAt,
            detailDtos
        );
    }

    public async Task<List<StockTransactionDto>> GetTransactionsAsync(int? productId = null, TransactionType? type = null, DateTime? fromDate = null, DateTime? toDate = null)
    {
        var query = _db.StockTransactions
            .Include(t => t.Product)
            .Include(t => t.Details)
                .ThenInclude(d => d.InventoryBatch)
            .AsNoTracking()
            .AsQueryable();

        if (productId.HasValue)
        {
            query = query.Where(t => t.ProductId == productId.Value);
        }
        if (type.HasValue)
        {
            query = query.Where(t => t.Type == type.Value);
        }
        if (fromDate.HasValue)
        {
            query = query.Where(t => t.CreatedAt >= fromDate.Value);
        }
        if (toDate.HasValue)
        {
            query = query.Where(t => t.CreatedAt <= toDate.Value);
        }

        var list = await query.OrderByDescending(t => t.CreatedAt).Take(200).ToListAsync();

        return list.Select(t => new StockTransactionDto(
            t.Id,
            t.ProductId,
            t.Product?.Sku ?? "N/A",
            t.Product?.Name ?? "Unknown Product",
            t.Type.ToString(),
            t.Quantity,
            t.TotalCost,
            t.ReferenceNote,
            t.CreatedAt,
            t.Details.Select(d => new TransactionDetailItemDto(
                d.InventoryBatchId,
                d.InventoryBatch?.BatchNumber ?? $"Lot-{d.InventoryBatchId}",
                d.QuantityDrawn,
                d.UnitCost,
                d.SubtotalCost
            )).ToList()
        )).ToList();
    }

    public async Task<DashboardSummaryResponse> GetDashboardSummaryAsync()
    {
        // Active batches across all products
        var activeBatches = await _db.InventoryBatches
            .Where(b => b.Status == BatchStatus.Active && b.QuantityRemaining > 0)
            .AsNoTracking()
            .ToListAsync();

        int totalRemainingUnits = activeBatches.Sum(b => b.QuantityRemaining);
        decimal totalRemainingValuation = activeBatches.Sum(b => b.QuantityRemaining * b.UnitCost);

        // Transactions
        var transactions = await _db.StockTransactions
            .Include(t => t.Product)
            .Include(t => t.Details)
                .ThenInclude(d => d.InventoryBatch)
            .AsNoTracking()
            .ToListAsync();

        var outTransactions = transactions.Where(t => t.Type == TransactionType.StockOut).ToList();
        int totalUnitsOut = outTransactions.Sum(t => t.Quantity);
        decimal totalCostOut = outTransactions.Sum(t => t.TotalCost);

        var inTransactions = transactions.Where(t => t.Type == TransactionType.StockIn).ToList();
        int totalUnitsIn = inTransactions.Sum(t => t.Quantity);
        decimal totalCostIn = inTransactions.Sum(t => t.TotalCost);

        // Products for valuation breakdown & low stock
        var allProducts = await _db.Products
            .Include(p => p.Batches.Where(b => b.Status == BatchStatus.Active))
            .AsNoTracking()
            .ToListAsync();

        var productDtos = allProducts.Select(MapToProductDetailDto).ToList();
        var lowStockAlerts = productDtos.Where(p => p.Status != "InStock").OrderBy(p => p.TotalQuantityRemaining).ToList();

        var categoryValuations = productDtos
            .GroupBy(p => p.Category)
            .Select(g => new CategoryValuation(
                g.Key,
                g.Sum(p => p.TotalQuantityRemaining),
                g.Sum(p => p.TotalValuation)
            ))
            .OrderByDescending(c => c.TotalValuation)
            .ToList();

        var topValuedProducts = productDtos
            .OrderByDescending(p => p.TotalValuation)
            .Take(5)
            .Select(p => new TopValuedProduct(
                p.Id,
                p.Sku,
                p.Name,
                p.Category,
                p.TotalQuantityRemaining,
                p.TotalValuation
            ))
            .ToList();

        var recentTransactions = transactions
            .OrderByDescending(t => t.CreatedAt)
            .Take(10)
            .Select(t => new StockTransactionDto(
                t.Id,
                t.ProductId,
                t.Product?.Sku ?? "N/A",
                t.Product?.Name ?? "Unknown",
                t.Type.ToString(),
                t.Quantity,
                t.TotalCost,
                t.ReferenceNote,
                t.CreatedAt,
                t.Details.Select(d => new TransactionDetailItemDto(
                    d.InventoryBatchId,
                    d.InventoryBatch?.BatchNumber ?? $"Lot-{d.InventoryBatchId}",
                    d.QuantityDrawn,
                    d.UnitCost,
                    d.SubtotalCost
                )).ToList()
            ))
            .ToList();

        // 7-day movement trend
        var sevenDaysAgo = DateTime.UtcNow.Date.AddDays(-6);
        var movementTrend = new List<DailyMovementSummary>();
        for (int i = 0; i < 7; i++)
        {
            var day = sevenDaysAgo.AddDays(i);
            var dayEnd = day.AddDays(1);
            var dayTxs = transactions.Where(t => t.CreatedAt >= day && t.CreatedAt < dayEnd).ToList();

            var dayIn = dayTxs.Where(t => t.Type == TransactionType.StockIn).ToList();
            var dayOut = dayTxs.Where(t => t.Type == TransactionType.StockOut).ToList();

            movementTrend.Add(new DailyMovementSummary(
                day.ToString("MMM dd"),
                dayIn.Sum(t => t.Quantity),
                dayIn.Sum(t => t.TotalCost),
                dayOut.Sum(t => t.Quantity),
                dayOut.Sum(t => t.TotalCost)
            ));
        }

        var kpis = new DashboardKpis(
            totalRemainingUnits,
            totalRemainingValuation,
            totalUnitsOut,
            totalCostOut,
            totalUnitsIn,
            totalCostIn,
            lowStockAlerts.Count
        );

        return new DashboardSummaryResponse(
            kpis,
            categoryValuations,
            topValuedProducts,
            lowStockAlerts,
            recentTransactions,
            movementTrend
        );
    }

    private async Task<Product?> FindProductAsync(int? productId, string? skuOrBarcode)
    {
        if (productId.HasValue)
        {
            return await _db.Products.FirstOrDefaultAsync(p => p.Id == productId.Value);
        }

        if (!string.IsNullOrWhiteSpace(skuOrBarcode))
        {
            var clean = skuOrBarcode.Trim().ToLower();
            return await _db.Products.FirstOrDefaultAsync(p =>
                p.Sku.ToLower() == clean ||
                (p.Barcode != null && p.Barcode.ToLower() == clean));
        }

        return null;
    }

    private static ProductDetailDto MapToProductDetailDto(Product product)
    {
        var activeBatches = product.Batches.Where(b => b.Status == BatchStatus.Active && b.QuantityRemaining > 0).ToList();
        var totalQty = activeBatches.Sum(b => b.QuantityRemaining);
        var totalValuation = activeBatches.Sum(b => b.QuantityRemaining * b.UnitCost);

        string status = totalQty == 0
            ? "OutOfStock"
            : (totalQty <= product.MinThreshold ? "LowStock" : "InStock");

        var batchDtos = activeBatches.Select(b => new BatchResponseDto(
            b.Id,
            b.ProductId,
            b.BatchNumber,
            b.QuantityReceived,
            b.QuantityRemaining,
            b.UnitCost,
            b.QuantityRemaining * b.UnitCost,
            b.ReceivedDate,
            b.Reference,
            b.Status.ToString()
        )).ToList();

        return new ProductDetailDto(
            product.Id,
            product.Sku,
            product.Barcode,
            product.Name,
            product.Category,
            product.MinThreshold,
            totalQty,
            totalValuation,
            status,
            product.CreatedAt,
            product.UpdatedAt,
            batchDtos
        );
    }
}
