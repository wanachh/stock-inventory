using StockInventory.Api.Models;
using StockInventory.Api.Services;

namespace StockInventory.Api.Endpoints;

public static class ProductEndpoints
{
    public static RouteGroupBuilder MapProductEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/", async (IInventoryService service, string? search, string? category, string? status) =>
        {
            var products = await service.GetProductsAsync(search, category, status);
            return Results.Ok(products);
        })
        .WithName("GetProducts")
        .WithSummary("Get list of products with optional filters");

        group.MapGet("/{id:int}", async (int id, IInventoryService service) =>
        {
            var product = await service.GetProductByIdAsync(id);
            return product is not null ? Results.Ok(product) : Results.NotFound(new { message = $"Product {id} not found" });
        })
        .WithName("GetProductById");

        group.MapGet("/lookup/{code}", async (string code, IInventoryService service) =>
        {
            var product = await service.LookupProductAsync(code);
            return product is not null ? Results.Ok(product) : Results.NotFound(new { message = $"No product found for code: {code}" });
        })
        .WithName("LookupProductByCode")
        .WithSummary("Machine & scanner fast lookup by SKU or Barcode");

        group.MapGet("/{id:int}/batches", async (int id, IInventoryService service) =>
        {
            var batches = await service.GetProductBatchesAsync(id);
            return Results.Ok(batches);
        })
        .WithName("GetProductBatches");

        group.MapPost("/", async (CreateProductRequest request, IInventoryService service) =>
        {
            try
            {
                var created = await service.CreateProductAsync(request);
                return Results.Created($"/api/products/{created.Id}", created);
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
        .WithName("CreateProduct");

        group.MapPut("/{id:int}", async (int id, UpdateProductRequest request, IInventoryService service) =>
        {
            try
            {
                var updated = await service.UpdateProductAsync(id, request);
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
        .WithName("UpdateProduct");

        group.MapDelete("/{id:int}", async (int id, IInventoryService service) =>
        {
            var deleted = await service.DeleteProductAsync(id);
            return deleted ? Results.NoContent() : Results.NotFound(new { message = $"Product {id} not found" });
        })
        .WithName("DeleteProduct");

        return group;
    }
}
