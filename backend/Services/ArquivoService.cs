using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;

namespace backend.Services;

/// <summary>Configuração da seção "Anexos" do appsettings.</summary>
public sealed class AnexosOptions
{
    public const string Secao = "Anexos";

    /// <summary>Diretório de armazenamento. Relativo ao ContentRoot (pasta backend/) quando não for absoluto.</summary>
    public string Diretorio { get; set; } = "uploads";

    public int TamanhoMaximoMb { get; set; } = 10;

    public int MaxArquivosPorEnvio { get; set; } = 10;

    public long TamanhoMaximoBytes => (long)Math.Max(1, TamanhoMaximoMb) * 1024 * 1024;
}

/// <summary>
/// Metadados de um anexo. A coluna Interacao.Anexos guarda um JSON array desses objetos
/// (sem migration: o campo já era string).
/// </summary>
public sealed record AnexoInfo(
    string NomeOriginal,
    string NomeArmazenado,
    string ContentType,
    long TamanhoBytes,
    string Url
);

public sealed class ArquivoInvalidoException : Exception
{
    public ArquivoInvalidoException(string mensagem) : base(mensagem) { }
}

/// <summary>
/// Salva/abre arquivos no disco com nome aleatório, validação de tamanho, whitelist de extensão/content-type,
/// checagem de assinatura binária e proteção contra path traversal. Nunca executa nada.
/// </summary>
public sealed partial class ArquivoService
{
    // extensão -> (content-type canônico servido no download, content-types aceitos no upload)
    private static readonly Dictionary<string, (string Canonico, string[] Aceitos)> Whitelist = new(StringComparer.OrdinalIgnoreCase)
    {
        [".pdf"]  = ("application/pdf", ["application/pdf"]),
        [".png"]  = ("image/png", ["image/png"]),
        [".jpg"]  = ("image/jpeg", ["image/jpeg", "image/pjpeg"]),
        [".jpeg"] = ("image/jpeg", ["image/jpeg", "image/pjpeg"]),
        [".gif"]  = ("image/gif", ["image/gif"]),
        [".webp"] = ("image/webp", ["image/webp"]),
        [".txt"]  = ("text/plain", ["text/plain"]),
        [".csv"]  = ("text/csv", ["text/csv", "application/csv", "text/plain", "application/vnd.ms-excel"]),
        [".xlsx"] = ("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]),
        [".docx"] = ("application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                     ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"]),
        [".zip"]  = ("application/zip", ["application/zip", "application/x-zip-compressed"]),
    };

    // content-type genérico enviado por curl/alguns navegadores: aceito se extensão e assinatura conferirem
    private const string ContentTypeGenerico = "application/octet-stream";

    private static readonly JsonSerializerOptions JsonOpcoes = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly AnexosOptions _opcoes;
    private readonly ILogger<ArquivoService> _logger;

    public string DiretorioBase { get; }

    public ArquivoService(IOptions<AnexosOptions> opcoes, IWebHostEnvironment env, ILogger<ArquivoService> logger)
    {
        _opcoes = opcoes.Value;
        _logger = logger;

        var dir = string.IsNullOrWhiteSpace(_opcoes.Diretorio) ? "uploads" : _opcoes.Diretorio;
        DiretorioBase = Path.GetFullPath(Path.IsPathRooted(dir) ? dir : Path.Combine(env.ContentRootPath, dir));
        Directory.CreateDirectory(DiretorioBase);
    }

    public long TamanhoMaximoBytes => _opcoes.TamanhoMaximoBytes;
    public int MaxArquivosPorEnvio => Math.Max(1, _opcoes.MaxArquivosPorEnvio);
    public static IEnumerable<string> ExtensoesPermitidas => Whitelist.Keys;

    // ---------- validação ----------

    /// <summary>Valida tamanho, extensão, content-type e assinatura binária. Lança ArquivoInvalidoException.</summary>
    public async Task ValidarAsync(IFormFile arquivo, CancellationToken ct = default)
    {
        var nome = SanitizarNome(arquivo.FileName);

        if (arquivo.Length <= 0)
            throw new ArquivoInvalidoException($"'{nome}': arquivo vazio.");

        if (arquivo.Length > TamanhoMaximoBytes)
            throw new ArquivoInvalidoException($"'{nome}': excede o tamanho máximo de {_opcoes.TamanhoMaximoMb} MB.");

        var ext = Path.GetExtension(nome);
        if (string.IsNullOrEmpty(ext) || !Whitelist.TryGetValue(ext, out var regra))
            throw new ArquivoInvalidoException($"'{nome}': extensão não permitida. Aceitas: {string.Join(", ", Whitelist.Keys)}.");

        var ctEnviado = (arquivo.ContentType ?? string.Empty).Split(';')[0].Trim();
        var ctAceito = regra.Aceitos.Contains(ctEnviado, StringComparer.OrdinalIgnoreCase)
                       || string.Equals(ctEnviado, ContentTypeGenerico, StringComparison.OrdinalIgnoreCase);
        if (!ctAceito)
            throw new ArquivoInvalidoException($"'{nome}': content-type '{ctEnviado}' não corresponde à extensão {ext}.");

        await using var stream = arquivo.OpenReadStream();
        var cabecalho = new byte[512];
        var lidos = await stream.ReadAtLeastAsync(cabecalho, cabecalho.Length, throwOnEndOfStream: false, ct);
        if (!AssinaturaConfere(ext, cabecalho.AsSpan(0, lidos)))
            throw new ArquivoInvalidoException($"'{nome}': o conteúdo não corresponde a um arquivo {ext}.");
    }

    private static bool AssinaturaConfere(string ext, ReadOnlySpan<byte> h)
    {
        static bool Comeca(ReadOnlySpan<byte> h, params byte[] magic) => h.Length >= magic.Length && h[..magic.Length].SequenceEqual(magic);

        switch (ext.ToLowerInvariant())
        {
            case ".pdf":  return Comeca(h, (byte)'%', (byte)'P', (byte)'D', (byte)'F');
            case ".png":  return Comeca(h, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A);
            case ".jpg":
            case ".jpeg": return Comeca(h, 0xFF, 0xD8, 0xFF);
            case ".gif":  return Comeca(h, (byte)'G', (byte)'I', (byte)'F', (byte)'8');
            case ".webp": return h.Length >= 12 && Comeca(h, (byte)'R', (byte)'I', (byte)'F', (byte)'F')
                                 && h.Slice(8, 4).SequenceEqual("WEBP"u8);
            case ".zip":
            case ".xlsx":
            case ".docx": return Comeca(h, 0x50, 0x4B, 0x03, 0x04) || Comeca(h, 0x50, 0x4B, 0x05, 0x06) || Comeca(h, 0x50, 0x4B, 0x07, 0x08);
            case ".txt":
            case ".csv":  return h.IndexOf((byte)0) < 0; // texto: sem bytes nulos
            default:      return false;
        }
    }

    // ---------- gravação / leitura ----------

    /// <summary>Grava o arquivo com nome aleatório (Guid + extensão) e devolve os metadados.</summary>
    public async Task<AnexoInfo> SalvarAsync(IFormFile arquivo, int chamadoId, CancellationToken ct = default)
    {
        var nomeOriginal = SanitizarNome(arquivo.FileName);
        var ext = Path.GetExtension(nomeOriginal).ToLowerInvariant();
        var regra = Whitelist[ext];

        var nomeArmazenado = $"{Guid.NewGuid():N}{ext}";
        var caminho = CaminhoSeguro(nomeArmazenado)
                      ?? throw new InvalidOperationException("Nome de arquivo gerado inválido.");

        await using (var destino = new FileStream(caminho, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, useAsync: true))
        await using (var origem = arquivo.OpenReadStream())
        {
            await origem.CopyToAsync(destino, ct);
        }

        _logger.LogInformation("Anexo salvo: chamado {ChamadoId}, {NomeOriginal} -> {NomeArmazenado} ({Bytes} bytes)",
            chamadoId, nomeOriginal, nomeArmazenado, arquivo.Length);

        return new AnexoInfo(
            NomeOriginal: nomeOriginal,
            NomeArmazenado: nomeArmazenado,
            ContentType: regra.Canonico,
            TamanhoBytes: arquivo.Length,
            Url: MontarUrl(chamadoId, nomeArmazenado));
    }

    /// <summary>Abre o arquivo para leitura, ou null se não existir. Recusa nomes fora do padrão.</summary>
    public FileStream? Abrir(string nomeArmazenado)
    {
        var caminho = CaminhoSeguro(nomeArmazenado);
        if (caminho is null || !File.Exists(caminho)) return null;
        return new FileStream(caminho, FileMode.Open, FileAccess.Read, FileShare.Read, 81920, useAsync: true);
    }

    /// <summary>Remove um arquivo (usado para desfazer upload quando a transação falha).</summary>
    public void TentarRemover(string nomeArmazenado)
    {
        try
        {
            var caminho = CaminhoSeguro(nomeArmazenado);
            if (caminho is not null && File.Exists(caminho)) File.Delete(caminho);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Não foi possível remover o arquivo {Nome}", nomeArmazenado);
        }
    }

    public static string MontarUrl(int chamadoId, string nomeArmazenado) => $"/api/Chamados/{chamadoId}/anexos/{nomeArmazenado}";

    /// <summary>Nome gerado pelo servidor: 32 hex + extensão da whitelist. Bloqueia qualquer outra coisa (path traversal).</summary>
    public static bool NomeArmazenadoValido(string? nome) =>
        !string.IsNullOrEmpty(nome)
        && RegexNomeArmazenado().IsMatch(nome)
        && Whitelist.ContainsKey(Path.GetExtension(nome));

    private string? CaminhoSeguro(string nomeArmazenado)
    {
        if (!NomeArmazenadoValido(nomeArmazenado)) return null;
        var completo = Path.GetFullPath(Path.Combine(DiretorioBase, nomeArmazenado));
        var raiz = DiretorioBase.EndsWith(Path.DirectorySeparatorChar) ? DiretorioBase : DiretorioBase + Path.DirectorySeparatorChar;
        return completo.StartsWith(raiz, StringComparison.Ordinal) ? completo : null;
    }

    [GeneratedRegex(@"^[0-9a-f]{32}\.[a-z0-9]{2,5}$")]
    private static partial Regex RegexNomeArmazenado();

    // ---------- nome original (apenas exibição) ----------

    public static string SanitizarNome(string? nomeOriginal)
    {
        var nome = Path.GetFileName((nomeOriginal ?? string.Empty).Replace('\\', '/'));
        var limpo = new string(nome.Where(c => !char.IsControl(c) && c is not ('"' or '<' or '>' or '|' or ':' or '*' or '?')).ToArray()).Trim();
        if (limpo.Length > 150)
        {
            var ext = Path.GetExtension(limpo);
            limpo = string.Concat(limpo.AsSpan(0, 150 - ext.Length), ext);
        }
        return string.IsNullOrWhiteSpace(limpo) || limpo is "." or ".." ? "arquivo" : limpo;
    }

    // ---------- (de)serialização da coluna Interacao.Anexos ----------

    public static string Serializar(IEnumerable<AnexoInfo> anexos) => JsonSerializer.Serialize(anexos, JsonOpcoes);

    /// <summary>Lê o JSON array da coluna. Conteúdo legado/não-JSON resulta em lista vazia.</summary>
    public static List<AnexoInfo> Desserializar(string? anexos)
    {
        if (string.IsNullOrWhiteSpace(anexos)) return [];
        try
        {
            return JsonSerializer.Deserialize<List<AnexoInfo>>(anexos, JsonOpcoes)
                       ?.Where(a => a is not null && !string.IsNullOrEmpty(a.NomeArmazenado)).ToList() ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }
}

public static class AnexosServiceCollectionExtensions
{
    public static IServiceCollection AddAnexos(this IServiceCollection services, IConfiguration config)
    {
        services.Configure<AnexosOptions>(config.GetSection(AnexosOptions.Secao));
        services.AddSingleton<ArquivoService>();
        return services;
    }
}
