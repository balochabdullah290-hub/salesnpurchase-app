using Microsoft.AspNetCore.Mvc;
using SalesnPurchase.API.Models;
using SalesnPurchase.API.Services;

namespace SalesnPurchase.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChatController : ControllerBase
    {
        private readonly GeminiChatService _chatService;

        public ChatController(GeminiChatService chatService)
        {
            _chatService = chatService;
        }

        [HttpPost]
        public async Task<IActionResult> Ask([FromBody] ChatRequest request)
        {
            if (string.IsNullOrWhiteSpace(request?.UserMessage))
            {
                return BadRequest("User message cannot be empty.");
            }

            string reply = await _chatService.GetAiResponseAsync(request.UserMessage);
            return Ok(new ChatResponse { Response = reply });
        }
    }
}