using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SalesnPurchase.API.Data;
using SalesnPurchase.API.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace SalesnPurchase.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _config;

        public AuthController(AppDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        // POST: api/Auth/login
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password))
            {
                return BadRequest(new { message = "Username and password are required." });
            }

            // Database User Check
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == dto.Username.Trim());
            if (user != null)
            {
                bool isValid = false;
                try
                {
                    isValid = BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash);
                }
                catch
                {
                    isValid = VerifySha256(dto.Password, user.PasswordHash);
                }

                if (isValid)
                {
                    var userToken = GenerateJwtToken(user.Username, string.IsNullOrWhiteSpace(user.Role) ? "Admin" : user.Role);
                    return Ok(new { token = userToken, username = user.Username, role = user.Role });
                }
            }

            return Unauthorized(new { message = "Invalid username or password." });
        }

        // POST: api/Auth/register
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password))
            {
                return BadRequest(new { message = "Username and password are required." });
            }

            string cleanUsername = dto.Username.Trim();

            if (await _context.Users.AnyAsync(u => u.Username == cleanUsername))
            {
                return BadRequest(new { message = "Username already exists." });
            }

            var user = new User
            {
                Username = cleanUsername,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password, workFactor: 12),
                Role = string.IsNullOrWhiteSpace(dto.Role) ? "Admin" : dto.Role.Trim(),
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "User registered successfully." });
        }

        private string GenerateJwtToken(string username, string role)
        {
            var jwtSecret = _config["Jwt:Secret"];
            if (string.IsNullOrWhiteSpace(jwtSecret))
            {
                throw new InvalidOperationException("JWT Secret is not configured.");
            }

            var jwtIssuer = _config["Jwt:Issuer"] ?? "SalesnPurchaseAPI";
            var jwtAudience = _config["Jwt:Audience"] ?? "SalesnPurchaseApp";

            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, username),
                new Claim(ClaimTypes.Name, username),
                new Claim(ClaimTypes.Role, role),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var token = new JwtSecurityToken(
                issuer: jwtIssuer,
                audience: jwtAudience,
                claims: claims,
                expires: DateTime.UtcNow.AddHours(24),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private static bool VerifySha256(string password, string storedHash)
        {
            using var sha256 = SHA256.Create();
            var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
            var hashOfInput = Convert.ToBase64String(bytes);
            return string.Equals(hashOfInput, storedHash, StringComparison.Ordinal);
        }
    }

    public class LoginDto
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class RegisterDto
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string Role { get; set; } = "Admin";
    }
}