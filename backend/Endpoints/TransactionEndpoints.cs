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

        group.MapGet("/{id:int}", async (int id, IInventoryService service) =>
        {
            var tx = await service.GetTransactionByIdAsync(id);
            return tx is not null ? Results.Ok(tx) : Results.NotFound(new { message = $"ไม่พบรายการรหัส {id}" });
        })
        .WithName("GetTransactionById");

        group.MapPut("/{id:int}", async (int id, UpdateTransactionRequest request, IInventoryService service) =>
        {
            try
            {
                var updated = await service.UpdateTransactionAsync(id, request);
                return Results.Ok(updated);
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(new { error = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Results.Conflict(new { error = ex.Message });
            }
        })
        .WithName("UpdateTransaction")
        .WithSummary("Update stock transaction (quantity, cost, or reference note)");

        group.MapDelete("/{id:int}", async (int id, IInventoryService service) =>
        {
            try
            {
                var deleted = await service.DeleteTransactionAsync(id);
                return deleted ? Results.NoContent() : Results.NotFound(new { message = $"ไม่พบรายการรหัส {id}" });
            }
            catch (InvalidOperationException ex)
            {
                return Results.Conflict(new { error = ex.Message });
            }
        })
        .WithName("DeleteTransaction")
        .WithSummary("Delete stock transaction and revert batch quantities safely");

        return group;
    }
}
