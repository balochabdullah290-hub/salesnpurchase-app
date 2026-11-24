namespace SalesnPurchase.API.Models
{
    public class ChatRequest
    {
        public string UserMessage { get; set; } = string.Empty;
    }

    public class ChatResponse
    {
        public string Response { get; set; } = string.Empty;
    }
}