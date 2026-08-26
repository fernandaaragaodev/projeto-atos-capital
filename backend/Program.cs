using System.Text;
using backend.Data;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

// DbContext (PostgreSQL)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// Serviço de Autenticação JWT
builder.Services.AddScoped<AuthService>();

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
    
    // Garante a existência do grupo
    var grupo = context.GruposEmpresas.FirstOrDefault(g => g.Nome == "Atos Capital");
    if (grupo == null)
    {
        grupo = new GrupoEmpresa { Nome = "Atos Capital" };
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
                Senha = "123456",
                Papel = PapelUsuario.Admin,
                GrupoEmpresaId = grupo.Id
            },
            new Usuario
            {
                Nome = "Cliente Teste",
                Email = "cliente@atos.com",
                Senha = "123456",
                Papel = PapelUsuario.Cliente,
                GrupoEmpresaId = grupo.Id
            }
        );
        context.SaveChanges();
    }
}

app.Run();