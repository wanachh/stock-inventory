using System.Text.Json.Serialization;

namespace StockInventory.Api.Models;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum TransactionType
{
    StockIn,
    StockOut
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum BatchStatus
{
    Active,
    Depleted
}
