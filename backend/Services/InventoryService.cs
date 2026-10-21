using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using StockInventory.Api.Data;
using StockInventory.Api.Models;

namespace StockInventory.Api.Services;

public partial class InventoryService : IInventoryService
{
    private readonly AppDbContext _db;

    [GeneratedRegex(@"^[A-Za-z0-9_\-\.]{2,50}$", RegexOptions.None, matchTimeoutMilliseconds: 1000)]
    private static partial Regex SkuRegex();

    public InventoryService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<ProductDetailDto>> GetProductsAsync(string? search = null, string? category = null, string? status = null)
    {
        var query = _db.Products
            .Where(p => !p.IsDeleted)
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
            .Where(p => !p.IsDeleted)
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
            .Where(p => !p.IsDeleted)
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

            var cleanLocation = !string.IsNullOrWhiteSpace(req.Location) ? req.Location.Trim().ToUpper() : "BT";
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
                Status = BatchStatus.Active,
                Location = cleanLocation
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
                CreatedAt = effectiveDate,
                Location = cleanLocation
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
        var product = await _db.Products
            .Include(p => p.Batches.Where(b => b.Status == BatchStatus.Active && b.QuantityRemaining > 0))
            .FirstOrDefaultAsync(p => p.Id == id);

        if (product == null || product.IsDeleted) return false;

        var now = DateTime.UtcNow;
        var remainingQty = product.Batches.Sum(b => b.QuantityRemaining);
        var remainingValuation = product.Batches.Sum(b => b.QuantityRemaining * b.UnitCost);

        // 1. Soft delete the product
        product.IsDeleted = true;
        product.DeletedAt = now;
        product.UpdatedAt = now;

        // 2. Mark active batches as Depleted so inventory queries won't calculate them
        foreach (var batch in product.Batches)
        {
            batch.Status = BatchStatus.Depleted;
        }

        // 3. Create an audit StockTransaction of type ProductDeleted
        var deleteTx = new StockTransaction
        {
            ProductId = product.Id,
            Type = TransactionType.ProductDeleted,
            Quantity = remainingQty,
            TotalCost = remainingValuation,
            ReferenceNote = remainingQty > 0
                ? $"ลบสินค้าออกจากระบบ (ตัดจำหน่ายสต็อกคงเหลือ {remainingQty} ชิ้น)"
                : "ลบสินค้าออกจากระบบ",
            CreatedAt = now
        };
        _db.StockTransactions.Add(deleteTx);
        await _db.SaveChangesAsync();

        // If there was remaining quantity, create transaction batch details for accurate cost tracking
        if (remainingQty > 0)
        {
            foreach (var batch in product.Batches)
            {
                if (batch.QuantityRemaining > 0)
                {
                    var detail = new TransactionBatchDetail
                    {
                        StockTransactionId = deleteTx.Id,
                        InventoryBatchId = batch.Id,
                        QuantityDrawn = batch.QuantityRemaining,
                        UnitCost = batch.UnitCost,
                        SubtotalCost = batch.QuantityRemaining * batch.UnitCost
                    };
                    _db.TransactionBatchDetails.Add(detail);
                    batch.QuantityRemaining = 0;
                }
            }
            await _db.SaveChangesAsync();
        }

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
            b.Status.ToString(),
            b.Location ?? "BT"
        )).ToList();
    }

    public async Task<StockOutPreviewResponse> PreviewStockOutAsync(int? productId, string? skuOrBarcode, int quantity, string? location = null)
    {
        var effectiveQty = Math.Abs(quantity);
        if (effectiveQty <= 0)
        {
            throw new ArgumentException("จำนวนสินค้าที่ต้องการตัดออกต้องมากกว่า 0 ชิ้น");
        }

        var product = await FindProductAsync(productId, skuOrBarcode);
        if (product == null)
        {
            throw new KeyNotFoundException("ไม่พบสินค้าที่ต้องการตัดออก");
        }

        // Active batches ordered 
        var query = _db.InventoryBatches
            .Where(b => b.ProductId == product.Id && b.Status == BatchStatus.Active && b.QuantityRemaining > 0);

        if (!string.IsNullOrWhiteSpace(location) && !location.Equals("ALL", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(b => b.Location.ToUpper() == location.Trim().ToUpper());
        }

        var activeBatches = await query
            .OrderBy(b => b.ReceivedDate)
            .ThenBy(b => b.Id)
            .AsNoTracking()
            .ToListAsync();

        var totalAvailable = activeBatches.Sum(b => b.QuantityRemaining);
        if (totalAvailable < effectiveQty)
        {
            var locMsg = !string.IsNullOrWhiteSpace(location) ? $"ในคลัง {location} " : "";
            throw new InvalidOperationException($"สินค้าคงเหลือ{locMsg}ไม่เพียงพอ (มีอยู่ {totalAvailable} ชิ้น, ต้องการตัดออก {effectiveQty} ชิ้น)");
        }

        var allocated = new List<StockOutPreviewItem>();
        int needed = effectiveQty;
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
                subtotal,
                batch.Location ?? "BT"
            ));

            needed -= draw;
        }

        return new StockOutPreviewResponse(
            product.Id,
            product.Sku,
            product.Name,
            effectiveQty,
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

        var cleanLocation = !string.IsNullOrWhiteSpace(req.Location) ? req.Location.Trim().ToUpper() : "BT";

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
            Status = BatchStatus.Active,
            Location = cleanLocation
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
            CreatedAt = effectiveDate,
            Location = cleanLocation
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
            product.Brand,
            product.IsDeleted,
            cleanLocation
        );
    }

    public async Task<StockTransactionDto> StockOutAsync(StockOutRequest req)
    {
        var effectiveQty = Math.Abs(req.Quantity);
        if (effectiveQty <= 0)
        {
            throw new ArgumentException("จำนวนสินค้าที่ต้องการตัดออกต้องมากกว่า 0 ชิ้น");
        }

        var product = await FindProductAsync(req.ProductId, req.SkuOrBarcode);
        if (product == null)
        {
            throw new KeyNotFoundException("ไม่พบสินค้าที่ต้องการตัดออก");
        }

        var cleanLocation = !string.IsNullOrWhiteSpace(req.Location) && !req.Location.Equals("ALL", StringComparison.OrdinalIgnoreCase)
            ? req.Location.Trim().ToUpper()
            : null;

        // Active batches ordered 
        var query = _db.InventoryBatches
            .Where(b => b.ProductId == product.Id && b.Status == BatchStatus.Active && b.QuantityRemaining > 0);

        if (cleanLocation != null)
        {
            query = query.Where(b => b.Location.ToUpper() == cleanLocation);
        }

        var batches = await query
            .OrderBy(b => b.ReceivedDate)
            .ThenBy(b => b.Id)
            .ToListAsync();

        int available = batches.Sum(b => b.QuantityRemaining);
        if (available < effectiveQty)
        {
            var locMsg = cleanLocation != null ? $"ในคลัง {cleanLocation} " : "";
            throw new InvalidOperationException($"สินค้าคงเหลือ{locMsg}ไม่เพียงพอสำหรับการตัดออก (มีอยู่ {available} ชิ้น, ต้องการตัด {effectiveQty} ชิ้น)");
        }

        int remainingToDraw = effectiveQty;
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
            Quantity = effectiveQty,
            TotalCost = 0m,
            ReferenceNote = req.ReferenceNote,
            CreatedAt = effectiveDate,
            Location = cleanLocation ?? batches.FirstOrDefault()?.Location ?? "BT"
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
            product.Brand,
            product.IsDeleted,
            transaction.Location
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

        var list = await query
            .OrderByDescending(t => t.CreatedAt)
            .ThenByDescending(t => t.Id)
            .Take(200)
            .ToListAsync();

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
            t.Product?.Brand,
            t.Product?.IsDeleted ?? true,
            t.Location ?? "BT"
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
            t.Product?.Brand,
            t.Product?.IsDeleted ?? true,
            t.Location ?? "BT"
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

        if (tx.Type == TransactionType.ProductDeleted)
        {
            throw new InvalidOperationException("ไม่สามารถแก้ไขรายการบันทึกการลบสินค้าได้ เนื่องจากเป็นประวัติการยกเลิก");
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

        if (tx.Type == TransactionType.ProductDeleted)
        {
            throw new InvalidOperationException("ไม่สามารถลบรายการบันทึกการลบสินค้าได้ เนื่องจากเป็นประวัติการยกเลิก");
        }

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
        // Active batches across non-deleted products
        var activeBatches = await _db.InventoryBatches
            .Include(b => b.Product)
            .Where(b => b.Product != null && !b.Product.IsDeleted && b.Status == BatchStatus.Active && b.QuantityRemaining > 0)
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

        // Active Products for valuation breakdown & low stock
        var allProducts = await _db.Products
            .Where(p => !p.IsDeleted)
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
            .ThenByDescending(t => t.Id)
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
                t.Product?.Brand,
                t.Product?.IsDeleted ?? true,
                t.Location ?? "BT"
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
                day.ToString("MMM dd", System.Globalization.CultureInfo.InvariantCulture),
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
            return await _db.Products.FirstOrDefaultAsync(p => p.Id == productId.Value && !p.IsDeleted);
        }

        if (!string.IsNullOrWhiteSpace(skuOrBarcode))
        {
            var clean = skuOrBarcode.Trim().ToLower();
            return await _db.Products.FirstOrDefaultAsync(p =>
                !p.IsDeleted &&
                (p.Sku.ToLower() == clean ||
                (p.Barcode != null && p.Barcode.ToLower() == clean)));
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
            b.Status.ToString(),
            b.Location ?? "BT"
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
            batchDtos,
            product.IsDeleted,
            product.DeletedAt
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
        int stockOutBatches = 0;
        int zeroQuantityCount = 0;
        int totalUnitsIn = 0;
        int totalUnitsOut = 0;
        decimal totalValueIn = 0m;
        decimal totalValueOut = 0m;

        // 1. Bulk pre-fetch all existing products matching SKUs or Barcodes
        var nonNullSkus = req.Items
            .Where(i => !string.IsNullOrWhiteSpace(i.Sku))
            .Select(i => i.Sku!.Trim().ToLower())
            .Distinct()
            .ToList();

        var nonNullBarcodes = req.Items
            .Where(i => !string.IsNullOrWhiteSpace(i.Barcode))
            .Select(i => i.Barcode!.Trim().ToLower())
            .Distinct()
            .ToList();

        var existingProducts = await _db.Products
            .Where(p => !p.IsDeleted && (nonNullSkus.Contains(p.Sku.ToLower()) || (p.Barcode != null && nonNullBarcodes.Contains(p.Barcode.ToLower()))))
            .Include(p => p.Batches.Where(b => b.Status == BatchStatus.Active && b.QuantityRemaining > 0))
            .ToListAsync();

        var productBySku = new Dictionary<string, Product>(StringComparer.OrdinalIgnoreCase);
        var productByBarcode = new Dictionary<string, Product>(StringComparer.OrdinalIgnoreCase);

        foreach (var p in existingProducts)
        {
            productBySku[p.Sku] = p;
            if (!string.IsNullOrWhiteSpace(p.Barcode))
            {
                productByBarcode[p.Barcode] = p;
            }
        }

        var usedSkus = new HashSet<string>(productBySku.Keys, StringComparer.OrdinalIgnoreCase);
        var newProducts = new List<Product>();

        var defaultLoc = !string.IsNullOrWhiteSpace(req.DefaultLocation) ? req.DefaultLocation.Trim().ToUpper() : "BT";

        // 2. Process each imported row
        foreach (var item in req.Items)
        {
            // Auto-generate SKU if missing or empty (matching web behavior PRD-YYYY-XXXX)
            string cleanSku;
            if (string.IsNullOrWhiteSpace(item.Sku))
            {
                do
                {
                    cleanSku = $"PRD-{DateTime.UtcNow.Year}-{Guid.NewGuid().ToString()[..6].ToUpper()}";
                } while (usedSkus.Contains(cleanSku));
            }
            else
            {
                cleanSku = item.Sku.Trim();
            }
            usedSkus.Add(cleanSku);

            var cleanBarcode = string.IsNullOrWhiteSpace(item.Barcode) ? null : item.Barcode.Trim();
            var cleanBrand = string.IsNullOrWhiteSpace(item.Brand) ? null : item.Brand.Trim();
            var cleanName = !string.IsNullOrWhiteSpace(item.Name)
                ? item.Name.Trim()
                : (!string.IsNullOrWhiteSpace(cleanBrand) ? cleanBrand : cleanSku);

            var cleanLocation = !string.IsNullOrWhiteSpace(item.Location)
                ? item.Location.Trim().ToUpper()
                : defaultLoc;

            var importDate = item.ReceivedDate ?? DateTime.UtcNow;

            // Locate product from memory dictionaries or create a new one
            Product? product = null;
            if (productBySku.TryGetValue(cleanSku, out var pSku))
            {
                product = pSku;
            }
            else if (cleanBarcode != null && productByBarcode.TryGetValue(cleanBarcode, out var pBar))
            {
                product = pBar;
            }

            if (product == null)
            {
                product = new Product
                {
                    Sku = cleanSku,
                    Barcode = cleanBarcode,
                    Name = cleanName,
                    Brand = cleanBrand,
                    Category = cleanBrand ?? "General",
                    MinThreshold = 5,
                    CreatedAt = importDate,
                    UpdatedAt = DateTime.UtcNow
                };

                _db.Products.Add(product);
                newProducts.Add(product);
                productBySku[cleanSku] = product;
                if (!string.IsNullOrWhiteSpace(cleanBarcode))
                {
                    productByBarcode[cleanBarcode] = product;
                }
                createdProducts++;
            }
            else
            {
                bool updated = false;
                if (string.IsNullOrEmpty(product.Barcode) && !string.IsNullOrEmpty(cleanBarcode))
                {
                    product.Barcode = cleanBarcode;
                    productByBarcode[cleanBarcode] = product;
                    updated = true;
                }
                if (string.IsNullOrEmpty(product.Brand) && !string.IsNullOrEmpty(cleanBrand))
                {
                    product.Brand = cleanBrand;
                    updated = true;
                }
                if (updated)
                {
                    product.UpdatedAt = DateTime.UtcNow;
                }
            }

            // Case A: Quantity == 0 (Catalog / Master product registration without stock movement)
            if (item.Quantity == 0)
            {
                zeroQuantityCount++;
                continue;
            }

            // Case B: Quantity > 0 (Stock In - receive into batches)
            if (item.Quantity > 0)
            {
                decimal unitCost = item.PriceBeforeVat;
                if (req.UsePriceAfterVatAsCost && item.PriceAfterVat.HasValue && item.PriceAfterVat.Value > 0)
                {
                    unitCost = item.PriceAfterVat.Value;
                }
                if (unitCost < 0)
                {
                    unitCost = 0;
                }

                var batchNumber = $"LOT-{importDate:yyyyMMdd}-{Guid.NewGuid().ToString()[..4].ToUpper()}";
                var batch = new InventoryBatch
                {
                    Product = product,
                    BatchNumber = batchNumber,
                    QuantityReceived = item.Quantity,
                    QuantityRemaining = item.Quantity,
                    UnitCost = unitCost,
                    ReceivedDate = importDate,
                    Reference = $"Excel Import{(item.LineNumber.HasValue ? $" #{item.LineNumber}" : "")}",
                    Status = BatchStatus.Active,
                    Location = cleanLocation
                };
                _db.InventoryBatches.Add(batch);
                product.Batches.Add(batch); // Keep in-memory cache synchronized

                var lineCost = item.Quantity * unitCost;
                var transaction = new StockTransaction
                {
                    Product = product,
                    Type = TransactionType.StockIn,
                    Quantity = item.Quantity,
                    TotalCost = lineCost,
                    ReferenceNote = $"นำเข้าจาก Excel แถว {item.LineNumber ?? 0} (คลัง: {cleanLocation}, ก่อน VAT: ฿{item.PriceBeforeVat:N2}, หลัง VAT: ฿{(item.PriceAfterVat ?? item.PriceBeforeVat * 1.07m):N2})",
                    CreatedAt = importDate,
                    Location = cleanLocation
                };
                _db.StockTransactions.Add(transaction);

                var detail = new TransactionBatchDetail
                {
                    StockTransaction = transaction,
                    InventoryBatch = batch,
                    QuantityDrawn = item.Quantity,
                    UnitCost = unitCost,
                    SubtotalCost = lineCost
                };
                _db.TransactionBatchDetails.Add(detail);

                stockInBatches++;
                totalUnitsIn += item.Quantity;
                totalValueIn += lineCost;
            }
            // Case C: Quantity < 0 (Stock Out - FIFO batch deduction)
            else
            {
                int qtyToDraw = Math.Abs(item.Quantity);

                // Find active batches for this product
                var availableBatches = product.Batches
                    .Where(b => b.Status == BatchStatus.Active && b.QuantityRemaining > 0 && b.Location.Equals(cleanLocation, StringComparison.OrdinalIgnoreCase))
                    .OrderBy(b => b.ReceivedDate)
                    .ThenBy(b => b.Id)
                    .ToList();

                // If specific location doesn't have enough, check all active batches for the product
                if (availableBatches.Sum(b => b.QuantityRemaining) < qtyToDraw)
                {
                    availableBatches = product.Batches
                        .Where(b => b.Status == BatchStatus.Active && b.QuantityRemaining > 0)
                        .OrderBy(b => b.ReceivedDate)
                        .ThenBy(b => b.Id)
                        .ToList();
                }

                int remainingToDraw = qtyToDraw;
                decimal totalCostOut = 0m;
                var details = new List<TransactionBatchDetail>();

                var txOut = new StockTransaction
                {
                    Product = product,
                    Type = TransactionType.StockOut,
                    Quantity = qtyToDraw,
                    TotalCost = 0m,
                    ReferenceNote = $"ตัดสต็อก Excel แถว {item.LineNumber ?? 0} (คลัง: {cleanLocation})",
                    CreatedAt = importDate,
                    Location = cleanLocation
                };
                _db.StockTransactions.Add(txOut);

                foreach (var b in availableBatches)
                {
                    if (remainingToDraw <= 0) break;

                    int draw = Math.Min(b.QuantityRemaining, remainingToDraw);
                    b.QuantityRemaining -= draw;
                    if (b.QuantityRemaining == 0)
                    {
                        b.Status = BatchStatus.Depleted;
                    }

                    decimal sub = draw * b.UnitCost;
                    totalCostOut += sub;

                    var detail = new TransactionBatchDetail
                    {
                        StockTransaction = txOut,
                        InventoryBatch = b,
                        QuantityDrawn = draw,
                        UnitCost = b.UnitCost,
                        SubtotalCost = sub
                    };
                    _db.TransactionBatchDetails.Add(detail);
                    remainingToDraw -= draw;
                }

                txOut.TotalCost = totalCostOut;
                stockOutBatches++;
                totalUnitsOut += qtyToDraw;
                totalValueOut += totalCostOut;
            }
        }

        // 3. Batch Save inside single Database Transaction (massive performance boost)
        await using var dbTx = await _db.Database.BeginTransactionAsync();

        if (newProducts.Count > 0)
        {
            await _db.SaveChangesAsync(); // Generates IDs for new products
        }

        await _db.SaveChangesAsync(); // Saves all batches, transactions, and details in one single roundtrip
        await dbTx.CommitAsync();

        messages.Add($"นำเข้าข้อมูลเรียบร้อย: เพิ่มสินค้าใหม่ {createdProducts} รายการ, รับเข้า {stockInBatches} ล็อต ({totalUnitsIn} ชิ้น, ฿{totalValueIn:N2}), ตัดสต็อกออก {stockOutBatches} รายการ ({totalUnitsOut} ชิ้น, ฿{totalValueOut:N2}), สินค้าสต็อกศูนย์ {zeroQuantityCount} รายการ");

        return new ExcelImportResult(
            req.Items.Count,
            createdProducts,
            stockInBatches,
            stockOutBatches,
            zeroQuantityCount,
            totalUnitsIn,
            totalUnitsOut,
            totalValueIn,
            totalValueOut,
            messages
        );
    }

    public async Task ClearAllDataAsync(string confirmation)
    {
        if (!string.Equals(confirmation?.Trim(), "DELETE ALL", StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("คำยืนยันไม่ถูกต้อง กรุณาพิมพ์ DELETE ALL เพื่อยืนยันการล้างข้อมูล");
        }

        await using var transaction = await _db.Database.BeginTransactionAsync();

        await _db.TransactionBatchDetails.ExecuteDeleteAsync();
        await _db.StockTransactions.ExecuteDeleteAsync();
        await _db.InventoryBatches.ExecuteDeleteAsync();
        await _db.Products.ExecuteDeleteAsync();

        if (_db.Database.IsNpgsql())
        {
            await _db.Database.ExecuteSqlRawAsync("""
                ALTER SEQUENCE IF EXISTS "TransactionBatchDetails_Id_seq" RESTART WITH 1;
                ALTER SEQUENCE IF EXISTS "StockTransactions_Id_seq" RESTART WITH 1;
                ALTER SEQUENCE IF EXISTS "InventoryBatches_Id_seq" RESTART WITH 1;
                ALTER SEQUENCE IF EXISTS "Products_Id_seq" RESTART WITH 1;
            """);
        }
        else if (_db.Database.IsSqlite())
        {
            try
            {
                await _db.Database.ExecuteSqlRawAsync("DELETE FROM sqlite_sequence WHERE name IN ('Products', 'InventoryBatches', 'StockTransactions', 'TransactionBatchDetails');");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"--> [Database] SQLite sequence reset note: {ex.Message}");
            }
        }

        await transaction.CommitAsync();
    }
}
