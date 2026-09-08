using StockInventory.Api.Models;
using StockInventory.Api.Services;

namespace StockInventory.Api.Endpoints;

public static class StockEndpoints
{
    public static RouteGroupBuilder MapStockEndpoints(this RouteGroupBuilder group)
    {
        group.MapPost("/in", async (StockInRequest request, IInventoryService service) =>
        {
            try
            {
                var result = await service.StockInAsync(request);
                return Results.Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(new { error = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        })
        .WithName("StockIn")
        .WithSummary("Receive stock into inventory with real batch cost");

        group.MapPost("/out", async (StockOutRequest request, IInventoryService service) =>
        {
            try
            {
                var result = await service.StockOutAsync(request);
                return Results.Ok(result);
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
                return Results.BadRequest(new { error = ex.Message });
            }
        })
        .WithName("StockOut")
        .WithSummary("Issue stock out using FIFO real cost allocation");

        group.MapPost("/preview-out", async (StockOutRequest request, IInventoryService service) =>
        {
            try
            {
                var result = await service.PreviewStockOutAsync(request.ProductId, request.SkuOrBarcode, request.Quantity);
                return Results.Ok(result);
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
                return Results.BadRequest(new { error = ex.Message });
            }
        })
        .WithName("PreviewStockOut")
        .WithSummary("Preview FIFO batch deductions and total cost out before confirming");

        group.MapPost("/import-excel", async (ExcelImportRequest request, IInventoryService service) =>
        {
            try
            {
                var result = await service.ImportExcelAsync(request);
                return Results.Ok(result);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { error = $"เกิดข้อผิดพลาดในการนำเข้า Excel: {ex.Message}" });
            }
        })
        .WithName("ImportExcel")
        .WithSummary("Bulk import products and stock in batches from Excel");

        return group;
    }
}
