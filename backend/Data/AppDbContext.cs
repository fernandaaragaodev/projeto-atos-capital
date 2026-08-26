using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<GrupoEmpresa> GruposEmpresas { get; set; }
    public DbSet<Usuario> Usuarios { get; set; }
    public DbSet<SlaCategoria> SlaCategorias { get; set; }
    public DbSet<Chamado> Chamados { get; set; }
    public DbSet<Interacao> Interacoes { get; set; }
    public DbSet<LogAuditoria> LogsAuditoria { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configuração explícita dos relacionamentos de Chamado com Usuario (Cliente e Agente)
        modelBuilder.Entity<Chamado>()
            .HasOne(c => c.Usuario)
            .WithMany()
            .HasForeignKey(c => c.UsuarioId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Chamado>()
            .HasOne(c => c.Agente)
            .WithMany()
            .HasForeignKey(c => c.AgenteId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}