using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AjustesFinaisModeloV10 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Chamados_GruposEmpresas_GrupoEmpresaId",
                table: "Chamados");

            migrationBuilder.DropForeignKey(
                name: "FK_Interacoes_Usuarios_AutorId",
                table: "Interacoes");

            migrationBuilder.DropPrimaryKey(
                name: "PK_SlaCategorias",
                table: "SlaCategorias");

            migrationBuilder.DropColumn(
                name: "SlaPrazo",
                table: "Chamados");

            migrationBuilder.RenameTable(
                name: "SlaCategorias",
                newName: "SLACategorias");

            migrationBuilder.RenameColumn(
                name: "Senha",
                table: "Usuarios",
                newName: "SenhaHash");

            migrationBuilder.RenameColumn(
                name: "TempoRespostaMinutos",
                table: "SLACategorias",
                newName: "TempoResposta");

            migrationBuilder.RenameColumn(
                name: "TempoResolucaoMinutos",
                table: "SLACategorias",
                newName: "TempoResolucao");

            migrationBuilder.AddColumn<string>(
                name: "IdExterno",
                table: "Usuarios",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AlterColumn<string>(
                name: "ValorNovo",
                table: "LogsAuditoria",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ValorAnterior",
                table: "LogsAuditoria",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "CampoAlterado",
                table: "LogsAuditoria",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IdExterno",
                table: "GruposEmpresas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "MatrizId",
                table: "GruposEmpresas",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Tipo",
                table: "GruposEmpresas",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "AguardandoDesde",
                table: "Chamados",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PrazoResolucao",
                table: "Chamados",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PrazoResposta",
                table: "Chamados",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ResolvidoEm",
                table: "Chamados",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SlaCategoriaId",
                table: "Chamados",
                type: "integer",
                nullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_SLACategorias",
                table: "SLACategorias",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_LogsAuditoria_ChamadoId",
                table: "LogsAuditoria",
                column: "ChamadoId");

            migrationBuilder.CreateIndex(
                name: "IX_LogsAuditoria_UsuarioId",
                table: "LogsAuditoria",
                column: "UsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_GruposEmpresas_MatrizId",
                table: "GruposEmpresas",
                column: "MatrizId");

            migrationBuilder.CreateIndex(
                name: "IX_Chamados_SlaCategoriaId",
                table: "Chamados",
                column: "SlaCategoriaId");

            migrationBuilder.AddForeignKey(
                name: "FK_Chamados_GruposEmpresas_GrupoEmpresaId",
                table: "Chamados",
                column: "GrupoEmpresaId",
                principalTable: "GruposEmpresas",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Chamados_SLACategorias_SlaCategoriaId",
                table: "Chamados",
                column: "SlaCategoriaId",
                principalTable: "SLACategorias",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_GruposEmpresas_GruposEmpresas_MatrizId",
                table: "GruposEmpresas",
                column: "MatrizId",
                principalTable: "GruposEmpresas",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Interacoes_Usuarios_AutorId",
                table: "Interacoes",
                column: "AutorId",
                principalTable: "Usuarios",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_LogsAuditoria_Chamados_ChamadoId",
                table: "LogsAuditoria",
                column: "ChamadoId",
                principalTable: "Chamados",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_LogsAuditoria_Usuarios_UsuarioId",
                table: "LogsAuditoria",
                column: "UsuarioId",
                principalTable: "Usuarios",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Chamados_GruposEmpresas_GrupoEmpresaId",
                table: "Chamados");

            migrationBuilder.DropForeignKey(
                name: "FK_Chamados_SLACategorias_SlaCategoriaId",
                table: "Chamados");

            migrationBuilder.DropForeignKey(
                name: "FK_GruposEmpresas_GruposEmpresas_MatrizId",
                table: "GruposEmpresas");

            migrationBuilder.DropForeignKey(
                name: "FK_Interacoes_Usuarios_AutorId",
                table: "Interacoes");

            migrationBuilder.DropForeignKey(
                name: "FK_LogsAuditoria_Chamados_ChamadoId",
                table: "LogsAuditoria");

            migrationBuilder.DropForeignKey(
                name: "FK_LogsAuditoria_Usuarios_UsuarioId",
                table: "LogsAuditoria");

            migrationBuilder.DropPrimaryKey(
                name: "PK_SLACategorias",
                table: "SLACategorias");

            migrationBuilder.DropIndex(
                name: "IX_LogsAuditoria_ChamadoId",
                table: "LogsAuditoria");

            migrationBuilder.DropIndex(
                name: "IX_LogsAuditoria_UsuarioId",
                table: "LogsAuditoria");

            migrationBuilder.DropIndex(
                name: "IX_GruposEmpresas_MatrizId",
                table: "GruposEmpresas");

            migrationBuilder.DropIndex(
                name: "IX_Chamados_SlaCategoriaId",
                table: "Chamados");

            migrationBuilder.DropColumn(
                name: "IdExterno",
                table: "Usuarios");

            migrationBuilder.DropColumn(
                name: "IdExterno",
                table: "GruposEmpresas");

            migrationBuilder.DropColumn(
                name: "MatrizId",
                table: "GruposEmpresas");

            migrationBuilder.DropColumn(
                name: "Tipo",
                table: "GruposEmpresas");

            migrationBuilder.DropColumn(
                name: "AguardandoDesde",
                table: "Chamados");

            migrationBuilder.DropColumn(
                name: "PrazoResolucao",
                table: "Chamados");

            migrationBuilder.DropColumn(
                name: "PrazoResposta",
                table: "Chamados");

            migrationBuilder.DropColumn(
                name: "ResolvidoEm",
                table: "Chamados");

            migrationBuilder.DropColumn(
                name: "SlaCategoriaId",
                table: "Chamados");

            migrationBuilder.RenameTable(
                name: "SLACategorias",
                newName: "SlaCategorias");

            migrationBuilder.RenameColumn(
                name: "SenhaHash",
                table: "Usuarios",
                newName: "Senha");

            migrationBuilder.RenameColumn(
                name: "TempoResposta",
                table: "SlaCategorias",
                newName: "TempoRespostaMinutos");

            migrationBuilder.RenameColumn(
                name: "TempoResolucao",
                table: "SlaCategorias",
                newName: "TempoResolucaoMinutos");

            migrationBuilder.AlterColumn<string>(
                name: "ValorNovo",
                table: "LogsAuditoria",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "ValorAnterior",
                table: "LogsAuditoria",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "CampoAlterado",
                table: "LogsAuditoria",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<DateTime>(
                name: "SlaPrazo",
                table: "Chamados",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddPrimaryKey(
                name: "PK_SlaCategorias",
                table: "SlaCategorias",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Chamados_GruposEmpresas_GrupoEmpresaId",
                table: "Chamados",
                column: "GrupoEmpresaId",
                principalTable: "GruposEmpresas",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Interacoes_Usuarios_AutorId",
                table: "Interacoes",
                column: "AutorId",
                principalTable: "Usuarios",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
