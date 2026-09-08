using StockInventory.Api.Models;

namespace StockInventory.Api.Data;

public static class DbInitializer
{
    public static async Task SeedAsync(AppDbContext db)
    {
        if (db.Products.Any())
        {
            return; // Already seeded
        }

        // 1. Product A (User's specific FIFO chat scenario)
        var prodA = new Product
        {
            Sku = "PRD-A001",
            Barcode = "885000000001",
            Name = "Product A (ตัวอย่างคำนวณต้นทุน FIFO)",
            Category = "Sample",
            MinThreshold = 5,
            CreatedAt = DateTime.UtcNow.AddDays(-10),
            UpdatedAt = DateTime.UtcNow.AddDays(-1)
        };
        db.Products.Add(prodA);
        await db.SaveChangesAsync();

        // Batch 1 for Prod A: 10 units @ ฿5.00
        var batchA1 = new InventoryBatch
        {
            ProductId = prodA.Id,
            BatchNumber = "LOT-20260901-01",
            QuantityReceived = 10,
            QuantityRemaining = 8, // 2 units previously sold
            UnitCost = 5.00m,
            ReceivedDate = DateTime.UtcNow.AddDays(-8),
            Reference = "PO-SEP-001 (รอบแรก ฿5)",
            Status = BatchStatus.Active
        };

        // Batch 2 for Prod A: 5 units @ ฿10.00
        var batchA2 = new InventoryBatch
        {
            ProductId = prodA.Id,
            BatchNumber = "LOT-20260905-02",
            QuantityReceived = 5,
            QuantityRemaining = 5,
            UnitCost = 10.00m,
            ReceivedDate = DateTime.UtcNow.AddDays(-3),
            Reference = "PO-SEP-002 (รอบสอง ฿10)",
            Status = BatchStatus.Active
        };
        db.InventoryBatches.AddRange(batchA1, batchA2);
        await db.SaveChangesAsync();

        // Initial Stock In Txs for Prod A
        var txA1 = new StockTransaction
        {
            ProductId = prodA.Id,
            Type = TransactionType.StockIn,
            Quantity = 10,
            TotalCost = 50.00m,
            ReferenceNote = "รับสินค้ารอบแรก (10 ชิ้น @ ฿5)",
            CreatedAt = DateTime.UtcNow.AddDays(-8)
        };
        var txA2 = new StockTransaction
        {
            ProductId = prodA.Id,
            Type = TransactionType.StockIn,
            Quantity = 5,
            TotalCost = 50.00m,
            ReferenceNote = "รับสินค้ารอบสอง (5 ชิ้น @ ฿10)",
            CreatedAt = DateTime.UtcNow.AddDays(-3)
        };
        // Sample Stock Out: 2 units from Batch 1
        var txAOut = new StockTransaction
        {
            ProductId = prodA.Id,
            Type = TransactionType.StockOut,
            Quantity = 2,
            TotalCost = 10.00m,
            ReferenceNote = "เบิกตัวอย่าง 2 ชิ้น (ตัดจากล็อต ฿5)",
            CreatedAt = DateTime.UtcNow.AddDays(-1)
        };
        db.StockTransactions.AddRange(txA1, txA2, txAOut);
        await db.SaveChangesAsync();

        db.TransactionBatchDetails.AddRange(
            new TransactionBatchDetail
            {
                StockTransactionId = txA1.Id,
                InventoryBatchId = batchA1.Id,
                QuantityDrawn = 10,
                UnitCost = 5.00m,
                SubtotalCost = 50.00m
            },
            new TransactionBatchDetail
            {
                StockTransactionId = txA2.Id,
                InventoryBatchId = batchA2.Id,
                QuantityDrawn = 5,
                UnitCost = 10.00m,
                SubtotalCost = 50.00m
            },
            new TransactionBatchDetail
            {
                StockTransactionId = txAOut.Id,
                InventoryBatchId = batchA1.Id,
                QuantityDrawn = 2,
                UnitCost = 5.00m,
                SubtotalCost = 10.00m
            }
        );

        // 2. Wireless Ergonomic Mouse
        var mouse = new Product
        {
            Sku = "SKU-TECH-01",
            Barcode = "885901234501",
            Name = "Wireless Ergonomic Mouse",
            Category = "Electronics",
            MinThreshold = 10,
            CreatedAt = DateTime.UtcNow.AddDays(-14),
            UpdatedAt = DateTime.UtcNow.AddDays(-2)
        };
        db.Products.Add(mouse);
        await db.SaveChangesAsync();

        var mouseBatch = new InventoryBatch
        {
            ProductId = mouse.Id,
            BatchNumber = "LOT-20260825-01",
            QuantityReceived = 25,
            QuantityRemaining = 20,
            UnitCost = 350.00m,
            ReceivedDate = DateTime.UtcNow.AddDays(-14),
            Reference = "INV-TECH-889",
            Status = BatchStatus.Active
        };
        db.InventoryBatches.Add(mouseBatch);
        await db.SaveChangesAsync();

        var mouseTxIn = new StockTransaction
        {
            ProductId = mouse.Id,
            Type = TransactionType.StockIn,
            Quantity = 25,
            TotalCost = 8750.00m,
            ReferenceNote = "นำเข้าล็อตแรก 25 ตัว",
            CreatedAt = DateTime.UtcNow.AddDays(-14)
        };
        var mouseTxOut = new StockTransaction
        {
            ProductId = mouse.Id,
            Type = TransactionType.StockOut,
            Quantity = 5,
            TotalCost = 1750.00m,
            ReferenceNote = "ขายส่งร้านสาขา 5 ตัว",
            CreatedAt = DateTime.UtcNow.AddDays(-2)
        };
        db.StockTransactions.AddRange(mouseTxIn, mouseTxOut);
        await db.SaveChangesAsync();

        db.TransactionBatchDetails.AddRange(
            new TransactionBatchDetail
            {
                StockTransactionId = mouseTxIn.Id,
                InventoryBatchId = mouseBatch.Id,
                QuantityDrawn = 25,
                UnitCost = 350.00m,
                SubtotalCost = 8750.00m
            },
            new TransactionBatchDetail
            {
                StockTransactionId = mouseTxOut.Id,
                InventoryBatchId = mouseBatch.Id,
                QuantityDrawn = 5,
                UnitCost = 350.00m,
                SubtotalCost = 1750.00m
            }
        );

        // 3. Mechanical Keyboard 75%
        var keyboard = new Product
        {
            Sku = "SKU-TECH-02",
            Barcode = "885901234502",
            Name = "Mechanical Keyboard 75% Wireless",
            Category = "Electronics",
            MinThreshold = 6,
            CreatedAt = DateTime.UtcNow.AddDays(-12),
            UpdatedAt = DateTime.UtcNow.AddDays(-5)
        };
        db.Products.Add(keyboard);
        await db.SaveChangesAsync();

        var kbBatch1 = new InventoryBatch
        {
            ProductId = keyboard.Id,
            BatchNumber = "LOT-20260828-01",
            QuantityReceived = 10,
            QuantityRemaining = 4,
            UnitCost = 1200.00m,
            ReceivedDate = DateTime.UtcNow.AddDays(-12),
            Reference = "PO-KEY-01",
            Status = BatchStatus.Active
        };
        var kbBatch2 = new InventoryBatch
        {
            ProductId = keyboard.Id,
            BatchNumber = "LOT-20260904-02",
            QuantityReceived = 10,
            QuantityRemaining = 10,
            UnitCost = 1280.00m,
            ReceivedDate = DateTime.UtcNow.AddDays(-4),
            Reference = "PO-KEY-02 (ต้นทุนปรับขึ้น)",
            Status = BatchStatus.Active
        };
        db.InventoryBatches.AddRange(kbBatch1, kbBatch2);
        await db.SaveChangesAsync();

        var kbTxIn1 = new StockTransaction
        {
            ProductId = keyboard.Id,
            Type = TransactionType.StockIn,
            Quantity = 10,
            TotalCost = 12000.00m,
            ReferenceNote = "รับคีย์บอร์ด 10 ตัว @ ฿1,200",
            CreatedAt = DateTime.UtcNow.AddDays(-12)
        };
        var kbTxIn2 = new StockTransaction
        {
            ProductId = keyboard.Id,
            Type = TransactionType.StockIn,
            Quantity = 10,
            TotalCost = 12800.00m,
            ReferenceNote = "รับคีย์บอร์ด 10 ตัว @ ฿1,280",
            CreatedAt = DateTime.UtcNow.AddDays(-4)
        };
        var kbTxOut = new StockTransaction
        {
            ProductId = keyboard.Id,
            Type = TransactionType.StockOut,
            Quantity = 6,
            TotalCost = 7200.00m,
            ReferenceNote = "จำหน่ายหน้าร้าน 6 ตัว (ตัดจากล็อต ฿1,200)",
            CreatedAt = DateTime.UtcNow.AddDays(-2)
        };
        db.StockTransactions.AddRange(kbTxIn1, kbTxIn2, kbTxOut);
        await db.SaveChangesAsync();

        db.TransactionBatchDetails.AddRange(
            new TransactionBatchDetail
            {
                StockTransactionId = kbTxIn1.Id,
                InventoryBatchId = kbBatch1.Id,
                QuantityDrawn = 10,
                UnitCost = 1200.00m,
                SubtotalCost = 12000.00m
            },
            new TransactionBatchDetail
            {
                StockTransactionId = kbTxIn2.Id,
                InventoryBatchId = kbBatch2.Id,
                QuantityDrawn = 10,
                UnitCost = 1280.00m,
                SubtotalCost = 12800.00m
            },
            new TransactionBatchDetail
            {
                StockTransactionId = kbTxOut.Id,
                InventoryBatchId = kbBatch1.Id,
                QuantityDrawn = 6,
                UnitCost = 1200.00m,
                SubtotalCost = 7200.00m
            }
        );

        // 4. Premium Arabica Coffee Beans (Low stock demo)
        var coffee = new Product
        {
            Sku = "SKU-CAFE-01",
            Barcode = "885901234503",
            Name = "Premium Arabica Roast 500g",
            Category = "Food & Beverage",
            MinThreshold = 10,
            CreatedAt = DateTime.UtcNow.AddDays(-7),
            UpdatedAt = DateTime.UtcNow.AddDays(-1)
        };
        db.Products.Add(coffee);
        await db.SaveChangesAsync();

        var coffeeBatch = new InventoryBatch
        {
            ProductId = coffee.Id,
            BatchNumber = "LOT-20260902-01",
            QuantityReceived = 15,
            QuantityRemaining = 4, // Below MinThreshold 10 -> Low stock!
            UnitCost = 220.00m,
            ReceivedDate = DateTime.UtcNow.AddDays(-7),
            Reference = "INV-ROAST-44",
            Status = BatchStatus.Active
        };
        db.InventoryBatches.Add(coffeeBatch);
        await db.SaveChangesAsync();

        var coffeeIn = new StockTransaction
        {
            ProductId = coffee.Id,
            Type = TransactionType.StockIn,
            Quantity = 15,
            TotalCost = 3300.00m,
            ReferenceNote = "รับเมล็ดกาแฟ 15 ถุง @ ฿220",
            CreatedAt = DateTime.UtcNow.AddDays(-7)
        };
        var coffeeOut = new StockTransaction
        {
            ProductId = coffee.Id,
            Type = TransactionType.StockOut,
            Quantity = 11,
            TotalCost = 2420.00m,
            ReferenceNote = "ชงเสิร์ฟหน้าร้าน 11 ถุง",
            CreatedAt = DateTime.UtcNow.AddDays(-1)
        };
        db.StockTransactions.AddRange(coffeeIn, coffeeOut);
        await db.SaveChangesAsync();

        db.TransactionBatchDetails.AddRange(
            new TransactionBatchDetail
            {
                StockTransactionId = coffeeIn.Id,
                InventoryBatchId = coffeeBatch.Id,
                QuantityDrawn = 15,
                UnitCost = 220.00m,
                SubtotalCost = 3300.00m
            },
            new TransactionBatchDetail
            {
                StockTransactionId = coffeeOut.Id,
                InventoryBatchId = coffeeBatch.Id,
                QuantityDrawn = 11,
                UnitCost = 220.00m,
                SubtotalCost = 2420.00m
            }
        );

        await db.SaveChangesAsync();
    }
}
