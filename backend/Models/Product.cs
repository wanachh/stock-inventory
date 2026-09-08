namespace StockInventory.Api.Models;

public class Product
{
    public int Id { get; set; }
    public required string Sku { get; set; }
    public string? Barcode { get; set; }
    public required string Name { get; set; }
    public string? Brand { get; set; }
    public string Category { get; set; } = "General";
    public int MinThreshold { get; set; } = 5;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public List<InventoryBatch> Batches { get; set; } = [];
    public List<StockTransaction> Transactions { get; set; } = [];
}
