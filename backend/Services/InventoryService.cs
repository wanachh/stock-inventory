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
            Brand = string.IsNullOrWhiteSpace(req.Brand) ? null : req.Brand.Trim(),
            Category = string.IsNullOrWhiteSpace(req.Category) ? "General" : req.Category.Trim(),
            MinThreshold = req.MinThreshold ?? 5,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Products.Add(product);
        await _db.SaveChangesAsync();

        // If initial quantity provided, strictly validate > 0 and unit cost
        if (req.InitialQuantity.HasValue)
        {
            if (req.InitialQuantity.Value <= 0)
            {
                throw new ArgumentException("หากต้องการระบุสต็อกตั้งต้น จำนวนสินค้าต้องมากกว่า 0 ชิ้น (หากยังไม่มีสินค้า ให้เว้นว่างไว้ ไม่สามารถใส่ 0 ได้)");
            }

            var unitCost = req.InitialUnitCost ?? 0m;
            if (unitCost < 0)
            {
                throw new ArgumentException("ราคาต้นทุนตั้งต้นต้องไม่ติดลบ");
            }

            var effectiveDate = req.TransactionDate.HasValue
                ? (req.TransactionDate.Value.Kind == DateTimeKind.Unspecified
                    ? DateTime.SpecifyKind(req.TransactionDate.Value, DateTimeKind.Utc)
                    : req.TransactionDate.Value.ToUniversalTime())
                : DateTime.UtcNow;

            var batchNumber = $"LOT-{effectiveDate:yyyyMMdd}-{Guid.NewGuid().ToString()[..4].ToUpper()}";
            var batch = new InventoryBatch
            {
                ProductId = product.Id,
                BatchNumber = batchNumber,
                QuantityReceived = req.InitialQuantity.Value,
                QuantityRemaining = req.InitialQuantity.Value,
                UnitCost = unitCost,
                ReceivedDate = effectiveDate,
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
                CreatedAt = effectiveDate
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
        product.Brand = string.IsNullOrWhiteSpace(req.Brand) ? null : req.Brand.Trim();
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
            throw new ArgumentException("จำนวนสินค้าที่ต้องการตัดออกต้องเป็นจำนวนเต็มบวกมากกว่า 0 ชิ้น (ไม่สามารถตัดออก 0 หรือติดลบได้)");
        }

        var product = await FindProductAsync(productId, skuOrBarcode);
        if (product == null)
        {
            throw new KeyNotFoundException("ไม่พบสินค้าที่ต้องการตัดออก");
        }

        // Active batches ordered 
        var activeBatches = await _db.InventoryBatches
            .Where(b => b.ProductId == product.Id && b.Status == BatchStatus.Active && b.QuantityRemaining > 0)
            .OrderBy(b => b.ReceivedDate)
            .ThenBy(b => b.Id)
            .AsNoTracking()
            .ToListAsync();

        var totalAvailable = activeBatches.Sum(b => b.QuantityRemaining);
        if (totalAvailable < quantity)
        {
            throw new InvalidOperationException($"สินค้าคงเหลือไม่เพียงพอ (มีอยู่ {totalAvailable} ชิ้น, ต้องการตัดออก {quantity} ชิ้น)");
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
            throw new ArgumentException("จำนวนสินค้าที่รับเข้าต้องเป็นจำนวนเต็มบวกมากกว่า 0 ชิ้น (ไม่สามารถรับเข้า 0 หรือติดลบได้)");
        }
        if (req.UnitCost < 0)
        {
            throw new ArgumentException("ราคาต้นทุนต่อชิ้นต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป (ไม่สามารถติดลบได้)");
        }

        var product = await FindProductAsync(req.ProductId, req.SkuOrBarcode);
        if (product == null)
        {
            throw new KeyNotFoundException("ไม่พบสินค้าที่ต้องการรับเข้า");
        }

        var effectiveDate = req.TransactionDate.HasValue
            ? (req.TransactionDate.Value.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(req.TransactionDate.Value, DateTimeKind.Utc)
                : req.TransactionDate.Value.ToUniversalTime())
            : DateTime.UtcNow;

        var batchNumber = !string.IsNullOrWhiteSpace(req.BatchNumber)
            ? req.BatchNumber.Trim()
            : $"LOT-{effectiveDate:yyyyMMdd}-{Guid.NewGuid().ToString()[..4].ToUpper()}";

        var batch = new InventoryBatch
        {
            ProductId = product.Id,
            BatchNumber = batchNumber,
            QuantityReceived = req.Quantity,
            QuantityRemaining = req.Quantity,
            UnitCost = req.UnitCost,
            ReceivedDate = effectiveDate,
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
            CreatedAt = effectiveDate
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
            [new TransactionDetailItemDto(batch.Id, batch.BatchNumber, req.Quantity, req.UnitCost, totalCost)],
            product.Brand
        );
    }

    public async Task<StockTransactionDto> StockOutAsync(StockOutRequest req)
    {
        if (req.Quantity <= 0)
        {
            throw new ArgumentException("จำนวนสินค้าที่ต้องการตัดออกต้องเป็นจำนวนเต็มบวกมากกว่า 0 ชิ้น (ไม่สามารถตัดออก 0 หรือติดลบได้)");
        }

        var product = await FindProductAsync(req.ProductId, req.SkuOrBarcode);
        if (product == null)
        {
            throw new KeyNotFoundException("ไม่พบสินค้าที่ต้องการตัดออก");
        }

        // Active batches ordered 
        var batches = await _db.InventoryBatches
            .Where(b => b.ProductId == product.Id && b.Status == BatchStatus.Active && b.QuantityRemaining > 0)
            .OrderBy(b => b.ReceivedDate)
            .ThenBy(b => b.Id)
            .ToListAsync();

        int available = batches.Sum(b => b.QuantityRemaining);
        if (available < req.Quantity)
        {
            throw new InvalidOperationException($"สินค้าคงเหลือไม่เพียงพอสำหรับการตัดออก (มีอยู่ {available} ชิ้น, ต้องการตัด {req.Quantity} ชิ้น)");
        }

        int remainingToDraw = req.Quantity;
        decimal totalCostOut = 0m;
        var detailDtos = new List<TransactionDetailItemDto>();

        var effectiveDate = req.TransactionDate.HasValue
            ? (req.TransactionDate.Value.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(req.TransactionDate.Value, DateTimeKind.Utc)
                : req.TransactionDate.Value.ToUniversalTime())
            : DateTime.UtcNow;

        var transaction = new StockTransaction
        {
            ProductId = product.Id,
            Type = TransactionType.StockOut,
            Quantity = req.Quantity,
            TotalCost = 0m,
            ReferenceNote = req.ReferenceNote,
            CreatedAt = effectiveDate
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
            detailDtos,
            product.Brand
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
            )).ToList(),
            t.Product?.Brand
        )).ToList();
    }

    public async Task<StockTransactionDto?> GetTransactionByIdAsync(int id)
    {
        var t = await _db.StockTransactions
            .Include(t => t.Product)
            .Include(t => t.Details)
                .ThenInclude(d => d.InventoryBatch)
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == id);

        if (t == null) return null;

        return new StockTransactionDto(
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
            )).ToList(),
            t.Product?.Brand
        );
    }

    public async Task<StockTransactionDto> UpdateTransactionAsync(int id, UpdateTransactionRequest req)
    {
        var tx = await _db.StockTransactions
            .Include(t => t.Product)
            .Include(t => t.Details)
                .ThenInclude(d => d.InventoryBatch)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (tx == null)
        {
            throw new KeyNotFoundException($"ไม่พบรายการเคลื่อนไหวสต็อกรหัส {id}");
        }

        if (req.ReferenceNote != null)
        {
            tx.ReferenceNote = req.ReferenceNote.Trim();
        }
        if (req.CreatedAt.HasValue)
        {
            tx.CreatedAt = req.CreatedAt.Value;
        }

        if (tx.Type == TransactionType.StockIn)
        {
            // If updating unit cost of stock in
            if (req.UnitCost.HasValue)
            {
                if (req.UnitCost.Value < 0)
                {
                    throw new ArgumentException("ราคาต้นทุนต่อชิ้นต้องไม่ติดลบ");
                }
                foreach (var detail in tx.Details)
                {
                    detail.UnitCost = req.UnitCost.Value;
                    detail.SubtotalCost = detail.QuantityDrawn * req.UnitCost.Value;
                    if (detail.InventoryBatch != null)
                    {
                        detail.InventoryBatch.UnitCost = req.UnitCost.Value;
                    }
                }
                tx.TotalCost = tx.Quantity * req.UnitCost.Value;
            }

            // If updating quantity of stock in
            if (req.Quantity.HasValue && req.Quantity.Value != tx.Quantity)
            {
                if (req.Quantity.Value <= 0)
                {
                    throw new ArgumentException("จำนวนสินค้าต้องเป็นจำนวนเต็มบวกมากกว่า 0 ชิ้น");
                }

                var batch = tx.Details.FirstOrDefault()?.InventoryBatch;
                if (batch != null)
                {
                    int alreadyDrawn = batch.QuantityReceived - batch.QuantityRemaining;
                    if (req.Quantity.Value < alreadyDrawn)
                    {
                        throw new InvalidOperationException($"ไม่สามารถปรับลดจำนวนรับเข้าให้ต่ำกว่า {alreadyDrawn} ชิ้นได้ เนื่องจากสินค้าล็อตนี้ถูกตัดจำหน่ายไปแล้ว {alreadyDrawn} ชิ้น");
                    }

                    int diff = req.Quantity.Value - batch.QuantityReceived;
                    batch.QuantityReceived = req.Quantity.Value;
                    batch.QuantityRemaining += diff;
                    if (batch.QuantityRemaining > 0 && batch.Status == BatchStatus.Depleted)
                    {
                        batch.Status = BatchStatus.Active;
                    }

                    var detail = tx.Details.FirstOrDefault();
                    if (detail != null)
                    {
                        detail.QuantityDrawn = req.Quantity.Value;
                        detail.SubtotalCost = req.Quantity.Value * batch.UnitCost;
                    }

                    tx.Quantity = req.Quantity.Value;
                    tx.TotalCost = req.Quantity.Value * batch.UnitCost;
                }
            }
        }
        else if (tx.Type == TransactionType.StockOut)
        {
            // If updating quantity of stock out
            if (req.Quantity.HasValue && req.Quantity.Value != tx.Quantity)
            {
                if (req.Quantity.Value <= 0)
                {
                    throw new ArgumentException("จำนวนสินค้าที่ตัดออกต้องเป็นจำนวนเต็มบวกมากกว่า 0 ชิ้น");
                }

                // 1. Revert previous deductions to batches
                foreach (var detail in tx.Details)
                {
                    if (detail.InventoryBatch != null)
                    {
                        detail.InventoryBatch.QuantityRemaining += detail.QuantityDrawn;
                        detail.InventoryBatch.Status = BatchStatus.Active;
                    }
                }
                _db.TransactionBatchDetails.RemoveRange(tx.Details);
                tx.Details.Clear();

                // 2. Check total available stock across active batches for this product
                var availableBatches = await _db.InventoryBatches
                    .Where(b => b.ProductId == tx.ProductId && b.Status == BatchStatus.Active && b.QuantityRemaining > 0)
                    .OrderBy(b => b.ReceivedDate)
                    .ThenBy(b => b.Id)
                    .ToListAsync();

                int totalAvailable = availableBatches.Sum(b => b.QuantityRemaining);
                if (totalAvailable < req.Quantity.Value)
                {
                    throw new InvalidOperationException($"สินค้าคงเหลือไม่เพียงพอสำหรับการปรับจำนวน (มีคงเหลือ {totalAvailable} ชิ้น, ต้องการ {req.Quantity.Value} ชิ้น)");
                }

                // 3. Re-run  allocation
                int remainingToDraw = req.Quantity.Value;
                decimal totalCostOut = 0m;

                foreach (var batch in availableBatches)
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

                    var newDetail = new TransactionBatchDetail
                    {
                        StockTransactionId = tx.Id,
                        InventoryBatchId = batch.Id,
                        QuantityDrawn = draw,
                        UnitCost = batch.UnitCost,
                        SubtotalCost = subtotal
                    };
                    _db.TransactionBatchDetails.Add(newDetail);
                    tx.Details.Add(newDetail);

                    remainingToDraw -= draw;
                }

                tx.Quantity = req.Quantity.Value;
                tx.TotalCost = totalCostOut;
            }
        }

        if (tx.Product != null)
        {
            tx.Product.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();

        return (await GetTransactionByIdAsync(tx.Id))!;
    }

    public async Task<bool> DeleteTransactionAsync(int id)
    {
        var tx = await _db.StockTransactions
            .Include(t => t.Product)
            .Include(t => t.Details)
                .ThenInclude(d => d.InventoryBatch)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (tx == null) return false;

        if (tx.Type == TransactionType.StockIn)
        {
            var batch = tx.Details.FirstOrDefault()?.InventoryBatch;
            if (batch != null)
            {
                int alreadyDrawn = batch.QuantityReceived - batch.QuantityRemaining;
                if (alreadyDrawn > 0)
                {
                    throw new InvalidOperationException($"ไม่สามารถลบรายการรับเข้านี้ได้ เนื่องจากมีสินค้าในล็อตนี้ถูกตัดจำหน่ายไปแล้ว {alreadyDrawn} ชิ้น กรุณายกเลิกหรือแก้ไขรายการตัดออกที่เกี่ยวข้องก่อน");
                }

                _db.TransactionBatchDetails.RemoveRange(tx.Details);
                _db.InventoryBatches.Remove(batch);
            }
            _db.StockTransactions.Remove(tx);
        }
        else if (tx.Type == TransactionType.StockOut)
        {
            // Restore quantities back to original batches
            foreach (var detail in tx.Details)
            {
                if (detail.InventoryBatch != null)
                {
                    detail.InventoryBatch.QuantityRemaining += detail.QuantityDrawn;
                    if (detail.InventoryBatch.Status == BatchStatus.Depleted)
                    {
                        detail.InventoryBatch.Status = BatchStatus.Active;
                    }
                }
            }
            _db.TransactionBatchDetails.RemoveRange(tx.Details);
            _db.StockTransactions.Remove(tx);
        }

        if (tx.Product != null)
        {
            tx.Product.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        return true;
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
                p.Brand,
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
                )).ToList(),
                t.Product?.Brand
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
            product.Brand,
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

    public async Task<ExcelImportResult> ImportExcelAsync(ExcelImportRequest req)
    {
        if (req.Items == null || req.Items.Count == 0)
        {
            throw new ArgumentException("ไม่พบรายการข้อมูลในไฟล์ Excel สำหรับนำเข้า");
        }

        var messages = new List<string>();
        int createdProducts = 0;
        int stockInBatches = 0;
        int totalUnits = 0;
        decimal totalValue = 0m;

        foreach (var item in req.Items)
        {
            if (string.IsNullOrWhiteSpace(item.Sku))
            {
                continue;
            }

            if (item.Quantity <= 0)
            {
                throw new ArgumentException($"แถวที่ {item.LineNumber ?? 0} (SKU: {item.Sku}): จำนวนสินค้าต้องมากกว่า 0 ชิ้น");
            }

            var cleanSku = item.Sku.Trim();
            var cleanBarcode = string.IsNullOrWhiteSpace(item.Barcode) ? null : item.Barcode.Trim();
            var cleanBrand = string.IsNullOrWhiteSpace(item.Brand) ? cleanSku : item.Brand.Trim();

            decimal unitCost = item.PriceBeforeVat;
            if (req.UsePriceAfterVatAsCost && item.PriceAfterVat.HasValue && item.PriceAfterVat.Value > 0)
            {
                unitCost = item.PriceAfterVat.Value;
            }
            if (unitCost < 0)
            {
                unitCost = 0;
            }

            var product = await _db.Products.FirstOrDefaultAsync(p => p.Sku.ToLower() == cleanSku.ToLower());
            if (product == null)
            {
                product = new Product
                {
                    Sku = cleanSku,
                    Barcode = cleanBarcode,
                    Name = cleanBrand,
                    Brand = cleanBrand,
                    Category = cleanBrand,
                    MinThreshold = 5,
                    CreatedAt = item.ReceivedDate ?? DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _db.Products.Add(product);
                await _db.SaveChangesAsync();
                createdProducts++;
            }
            else
            {
                if (string.IsNullOrEmpty(product.Barcode) && !string.IsNullOrEmpty(cleanBarcode))
                {
                    product.Barcode = cleanBarcode;
                    product.UpdatedAt = DateTime.UtcNow;
                }
            }

            var importDate = item.ReceivedDate ?? DateTime.UtcNow;
            var batchNumber = $"LOT-{importDate:yyyyMMdd}-{Guid.NewGuid().ToString()[..4].ToUpper()}";

            var batch = new InventoryBatch
            {
                ProductId = product.Id,
                BatchNumber = batchNumber,
                QuantityReceived = item.Quantity,
                QuantityRemaining = item.Quantity,
                UnitCost = unitCost,
                ReceivedDate = importDate,
                Reference = $"Excel Import{(item.LineNumber.HasValue ? $" #{item.LineNumber}" : "")}",
                Status = BatchStatus.Active
            };
            _db.InventoryBatches.Add(batch);
            await _db.SaveChangesAsync();

            var lineCost = item.Quantity * unitCost;
            var transaction = new StockTransaction
            {
                ProductId = product.Id,
                Type = TransactionType.StockIn,
                Quantity = item.Quantity,
                TotalCost = lineCost,
                ReferenceNote = $"นำเข้าจาก Excel แถว {item.LineNumber ?? 0} (ก่อน VAT: ฿{item.PriceBeforeVat:N2}, หลัง VAT: ฿{(item.PriceAfterVat ?? item.PriceBeforeVat * 1.07m):N2})",
                CreatedAt = importDate
            };
            _db.StockTransactions.Add(transaction);
            await _db.SaveChangesAsync();

            var detail = new TransactionBatchDetail
            {
                StockTransactionId = transaction.Id,
                InventoryBatchId = batch.Id,
                QuantityDrawn = item.Quantity,
                UnitCost = unitCost,
                SubtotalCost = lineCost
            };
            _db.TransactionBatchDetails.Add(detail);
            await _db.SaveChangesAsync();

            stockInBatches++;
            totalUnits += item.Quantity;
            totalValue += lineCost;
        }

        messages.Add($"นำเข้าข้อมูลเรียบร้อย: เพิ่มสินค้าใหม่ {createdProducts} รายการ, บันทึกรับเข้าสต็อก {stockInBatches} ล็อต (รวม {totalUnits} ชิ้น, มูลค่า ฿{totalValue:N2})");

        return new ExcelImportResult(
            req.Items.Count,
            createdProducts,
            stockInBatches,
            totalUnits,
            totalValue,
            messages
        );
    }
}
