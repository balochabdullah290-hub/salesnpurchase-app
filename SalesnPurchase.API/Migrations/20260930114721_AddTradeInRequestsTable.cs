using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SalesnPurchase.API.Migrations
{
    /// <inheritdoc />
    public partial class AddTradeInRequestsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TradeInRequests",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Model = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Storage = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PtaStatus = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    BatteryHealth = table.Column<int>(type: "int", nullable: false),
                    Condition = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    HasBox = table.Column<bool>(type: "bit", nullable: false),
                    EstimatedMinPKR = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    EstimatedMaxPKR = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    CustomerName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CustomerPhone = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CustomerEmail = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PhotoUrlsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FinalQuotationPKR = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TradeInRequests", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TradeInRequests");
        }
    }
}
