using System.Text.Json.Serialization;

namespace StockInventory.Api.Models;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum TransactionType
{
    StockIn,
    StockOut,
    ProductDeleted
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum BatchStatus
{
    Active,
    Depleted
}
