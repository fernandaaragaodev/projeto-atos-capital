using System.Text;
using backend.Data;
using backend.Data.Repositories;
using backend.Enums;
using backend.Events;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();


builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
});

// DbContext (PostgreSQL)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));
builder.Services.AddRepositories();

// Serviços da Aplicação
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<RelatorioService>();
builder.Services.AddEventosWebhooks(builder.Configuration); // RF06: Channel + EventoService + WebhookDispatcher (Events/)
builder.Services.AddAnexos(builder.Configuration);          // RF11: AnexosOptions + ArquivoService (uploads NÃO são static files)

// RF07/RF09 — Monitor de SLA (BackgroundService) + options da seção "Sla"
builder.Services.Configure<SlaOptions>(builder.Configuration.GetSection(SlaOptions.Secao));
builder.Services.AddSingleton<SlaMonitorService>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<SlaMonitorService>());

// Configuração da Autenticação via JWT Bearer
var jwtKey = builder.Configuration["Jwt:Key"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

// Configuração do Swagger com suporte a Authorize (Bearer Token)
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Atos Support API", Version = "v1" });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Insira o token JWT neste formato: Bearer {seu_token}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Atos Support API v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseHttpsRedirection();

// Ativa Autenticação e Autorização
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Carga Inicial de Dados (Seed Data)
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    // Aplica as migrations criando o banco de dados e as tabelas caso não existam
    context.Database.Migrate();

    var gruposEmpresas = scope.ServiceProvider.GetRequiredService<IBaseRepository<GrupoEmpresa>>();
    var usuarios = scope.ServiceProvider.GetRequiredService<IBaseRepository<Usuario>>();
    var slaCategorias = scope.ServiceProvider.GetRequiredService<IBaseRepository<SLACategoria>>();

    // Garante a existência do grupo (empresa matriz Atos Capital)
    var grupo = gruposEmpresas.ObterTodos().FirstOrDefault(g => g.Nome == "Atos Capital");
    if (grupo == null)
    {
        grupo = new GrupoEmpresa
        {
            Nome = "Atos Capital",
            IdExterno = "GRP-ATOS-001",
            Tipo = TipoGrupoEnum.MATRIZ
        };
        gruposEmpresas.Add(grupo);
        gruposEmpresas.SalvarAlteracoes();
    }

    // Garante a existência de uma segunda empresa cliente, para testar isolamento de dados entre clientes
    var grupoNortec = gruposEmpresas.ObterTodos().FirstOrDefault(g => g.Nome == "Cliente Nortec");
    if (grupoNortec == null)
    {
        grupoNortec = new GrupoEmpresa
        {
            Nome = "Cliente Nortec",
            IdExterno = "GRP-NORTEC-001",
            Tipo = TipoGrupoEnum.MATRIZ
        };
        gruposEmpresas.Add(grupoNortec);
        gruposEmpresas.SalvarAlteracoes();
    }

    // Garante a criação de cada usuário de teste, checando por e-mail antes de inserir (idempotente)
    void GarantirUsuario(string nome, string email, string idExterno, PapelEnum papel, int grupoEmpresaId)
    {
        if (!usuarios.ObterTodos().Any(u => u.Email == email))
        {
            usuarios.Add(new Usuario
            {
                Nome = nome,
                Email = email,
                SenhaHash = "123456",
                IdExterno = idExterno,
                Papel = papel,
                GrupoEmpresaId = grupoEmpresaId
            });
        }
    }

    GarantirUsuario("Admin Atos", "admin@atos.com", "USR-ADM-001", PapelEnum.ADMIN, grupo.Id);
    GarantirUsuario("Cliente Teste", "cliente@atos.com", "USR-CLI-001", PapelEnum.CLIENTE, grupo.Id);
    GarantirUsuario("Agente Atos", "agente@atos.com", "USR-AGT-001", PapelEnum.AGENTE, grupo.Id);
    GarantirUsuario("Supervisor Atos", "supervisor@atos.com", "USR-SUP-001", PapelEnum.SUPERVISOR, grupo.Id);
    GarantirUsuario("Cliente Nortec", "cliente@nortec.com", "USR-CLI-002", PapelEnum.CLIENTE, grupoNortec.Id);

    usuarios.SalvarAlteracoes();

    // RF07 — Regras de SLA padrão (idempotente): Plataforma x Acesso/Erro/Dúvida x 4 prioridades
    DataSeeder.SeedSlaCategorias(slaCategorias);
}

app.Run();
