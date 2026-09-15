using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AdicionarAlertasSla : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "AlertaEstouroSlaEm",
                table: "Chamados",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "AlertaRespostaAtrasadaEm",
                table: "Chamados",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "AlertaRiscoSlaEm",
                table: "Chamados",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AlertasSla",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ChamadoId = table.Column<int>(type: "integer", nullable: false),
                    Tipo = table.Column<int>(type: "integer", nullable: false),
                    CriadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ReconhecidoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReconhecidoPorId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AlertasSla", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AlertasSla_Chamados_ChamadoId",
                        column: x => x.ChamadoId,
                        principalTable: "Chamados",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AlertasSla_Usuarios_ReconhecidoPorId",
                        column: x => x.ReconhecidoPorId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Chamados_Status_PrazoResolucao",
                table: "Chamados",
                columns: new[] { "Status", "PrazoResolucao" });

            migrationBuilder.CreateIndex(
                name: "IX_AlertasSla_ChamadoId_Tipo",
                table: "AlertasSla",
                columns: new[] { "ChamadoId", "Tipo" });

            migrationBuilder.CreateIndex(
                name: "IX_AlertasSla_ReconhecidoEm",
                table: "AlertasSla",
                column: "ReconhecidoEm");

            migrationBuilder.CreateIndex(
                name: "IX_AlertasSla_ReconhecidoPorId",
                table: "AlertasSla",
                column: "ReconhecidoPorId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AlertasSla");

            migrationBuilder.DropIndex(
                name: "IX_Chamados_Status_PrazoResolucao",
                table: "Chamados");

            migrationBuilder.DropColumn(
                name: "AlertaEstouroSlaEm",
                table: "Chamados");

            migrationBuilder.DropColumn(
                name: "AlertaRespostaAtrasadaEm",
                table: "Chamados");

            migrationBuilder.DropColumn(
                name: "AlertaRiscoSlaEm",
                table: "Chamados");
        }
    }
}
