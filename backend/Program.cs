using System.Text;
using backend.Data;
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

    // Garante a existência do grupo
    var grupo = context.GruposEmpresas.FirstOrDefault(g => g.Nome == "Atos Capital");
    if (grupo == null)
    {
        grupo = new GrupoEmpresa 
        { 
            Nome = "Atos Capital",
            IdExterno = "GRP-ATOS-001",
            Tipo = TipoGrupoEnum.MATRIZ
        };
        context.GruposEmpresas.Add(grupo);
        context.SaveChanges();
    }

    // Garante a criação dos usuários de teste caso não existam
    if (!context.Usuarios.Any())
    {
        context.Usuarios.AddRange(
            new Usuario
            {
                Nome = "Admin Atos",
                Email = "admin@atos.com",
                SenhaHash = "123456",
                IdExterno = "USR-ADM-001",
                Papel = PapelEnum.ADMIN,
                GrupoEmpresaId = grupo.Id
            },
            new Usuario
            {
                Nome = "Cliente Teste",
                Email = "cliente@atos.com",
                SenhaHash = "123456",
                IdExterno = "USR-CLI-001",
                Papel = PapelEnum.CLIENTE,
                GrupoEmpresaId = grupo.Id
            }
        );
        context.SaveChanges();
    }

    // RF07 — Regras de SLA padrão (idempotente): Plataforma x Acesso/Erro/Dúvida x 4 prioridades
    DataSeeder.SeedSlaCategorias(context);
}

app.Run();