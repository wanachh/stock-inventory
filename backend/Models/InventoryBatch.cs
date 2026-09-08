namespace StockInventory.Api.Models;

public class InventoryBatch
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public Product? Product { get; set; }

    public required string BatchNumber { get; set; }
    public int QuantityReceived { get; set; }
    public int QuantityRemaining { get; set; }
    public decimal UnitCost { get; set; }
    public DateTime ReceivedDate { get; set; } = DateTime.UtcNow;
    public string? Reference { get; set; }
    public BatchStatus Status { get; set; } = BatchStatus.Active;

    // Navigation properties
    public List<TransactionBatchDetail> BatchDetails { get; set; } = [];
}
