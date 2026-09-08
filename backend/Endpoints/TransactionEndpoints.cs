using StockInventory.Api.Models;
using StockInventory.Api.Services;

namespace StockInventory.Api.Endpoints;

public static class TransactionEndpoints
{
    public static RouteGroupBuilder MapTransactionEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/", async (
            IInventoryService service,
            int? productId,
            TransactionType? type,
            DateTime? fromDate,
            DateTime? toDate) =>
        {
            var txs = await service.GetTransactionsAsync(productId, type, fromDate, toDate);
            return Results.Ok(txs);
        })
        .WithName("GetTransactions")
        .WithSummary("Get audit trail of all stock movements with batch cost breakdowns");

        return group;
    }
}
