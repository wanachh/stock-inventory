namespace StockInventory.Api.Models;

public class TransactionBatchDetail
{
    public int Id { get; set; }
    public int StockTransactionId { get; set; }
    public StockTransaction? StockTransaction { get; set; }

    public int InventoryBatchId { get; set; }
    public InventoryBatch? InventoryBatch { get; set; }

    public int QuantityDrawn { get; set; }
    public decimal UnitCost { get; set; }
    public decimal SubtotalCost { get; set; }
}
