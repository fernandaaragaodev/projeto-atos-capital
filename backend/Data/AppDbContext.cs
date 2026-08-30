using backend.Enums;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Usuario> Usuarios { get; set; }
    public DbSet<GrupoEmpresa> GruposEmpresas { get; set; }
    public DbSet<Chamado> Chamados { get; set; }
    public DbSet<Interacao> Interacoes { get; set; }
    public DbSet<SLACategoria> SLACategorias { get; set; }
    public DbSet<LogAuditoria> LogsAuditoria { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Mapeamento Enums como INT
        modelBuilder.Entity<Usuario>()
            .Property(u => u.Papel)
            .HasConversion<int>();

        modelBuilder.Entity<GrupoEmpresa>()
            .Property(g => g.Tipo)
            .HasConversion<int>();

        modelBuilder.Entity<Chamado>()
            .Property(c => c.Status)
            .HasConversion<int>();

        modelBuilder.Entity<Chamado>()
            .Property(c => c.Prioridade)
            .HasConversion<int>();

        modelBuilder.Entity<SLACategoria>()
            .Property(s => s.Prioridade)
            .HasConversion<int>();

        modelBuilder.Entity<Interacao>()
            .Property(i => i.Tipo)
            .HasConversion<int>();

        // Auto-relacionamento Matriz / Filial (GrupoEmpresa)
        modelBuilder.Entity<GrupoEmpresa>()
            .HasOne(g => g.Matriz)
            .WithMany(g => g.Filiais)
            .HasForeignKey(g => g.MatrizId)
            .OnDelete(DeleteBehavior.Restrict);

        // Relacionamentos do Chamado
        modelBuilder.Entity<Chamado>()
            .HasOne(c => c.Usuario)
            .WithMany(u => u.ChamadosCriados)
            .HasForeignKey(c => c.UsuarioId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Chamado>()
            .HasOne(c => c.Agente)
            .WithMany(u => u.ChamadosAtendidos)
            .HasForeignKey(c => c.AgenteId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Chamado>()
            .HasOne(c => c.GrupoEmpresa)
            .WithMany(g => g.Chamados)
            .HasForeignKey(c => c.GrupoEmpresaId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Chamado>()
            .HasOne(c => c.SlaCategoria)
            .WithMany(s => s.Chamados)
            .HasForeignKey(c => c.SlaCategoriaId)
            .OnDelete(DeleteBehavior.Restrict);

        // Relacionamentos das Interações
        modelBuilder.Entity<Interacao>()
            .HasOne(i => i.Chamado)
            .WithMany(c => c.Interacoes)
            .HasForeignKey(i => i.ChamadoId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Interacao>()
            .HasOne(i => i.Autor)
            .WithMany(u => u.Interacoes)
            .HasForeignKey(i => i.AutorId)
            .OnDelete(DeleteBehavior.Restrict);

        // Relacionamentos de Auditoria
        modelBuilder.Entity<LogAuditoria>()
            .HasOne(l => l.Chamado)
            .WithMany(c => c.LogsAuditoria)
            .HasForeignKey(l => l.ChamadoId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<LogAuditoria>()
            .HasOne(l => l.Usuario)
            .WithMany(u => u.LogsAuditoria)
            .HasForeignKey(l => l.UsuarioId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}