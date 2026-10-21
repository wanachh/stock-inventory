using Microsoft.EntityFrameworkCore;

namespace StockInventory.Api.Data;

public static class DbInitializer
{
    public static async Task SeedAsync(AppDbContext db)
    {
        var exampleSkus = new[] { "PRD-A001", "SKU-TECH-01", "SKU-TECH-02", "SKU-CAFE-01" };
        var productIds = await db.Products
            .Where(product => exampleSkus.Contains(product.Sku))
            .Select(product => product.Id)
            .ToListAsync();

        if (productIds.Count == 0)
        {
            return;
        }

        var transactionIds = await db.StockTransactions
            .Where(transaction => productIds.Contains(transaction.ProductId))
            .Select(transaction => transaction.Id)
            .ToListAsync();

        if (transactionIds.Count > 0)
        {
            await db.TransactionBatchDetails
                .Where(detail => transactionIds.Contains(detail.StockTransactionId))
                .ExecuteDeleteAsync();
            await db.StockTransactions
                .Where(transaction => transactionIds.Contains(transaction.Id))
                .ExecuteDeleteAsync();
        }

        await db.InventoryBatches
            .Where(batch => productIds.Contains(batch.ProductId))
            .ExecuteDeleteAsync();
        await db.Products
            .Where(product => productIds.Contains(product.Id))
            .ExecuteDeleteAsync();
    }
}
