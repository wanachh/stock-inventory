namespace StockInventory.Api.Models;

public class StockTransaction
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public Product? Product { get; set; }

    public TransactionType Type { get; set; }
    public int Quantity { get; set; }
    public decimal TotalCost { get; set; }
    public string? ReferenceNote { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public List<TransactionBatchDetail> Details { get; set; } = [];
}
