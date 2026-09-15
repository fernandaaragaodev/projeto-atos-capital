namespace backend.Services;

/// <summary>
/// Configuração do monitor de SLA (seção "Sla" do appsettings).
/// </summary>
public sealed class SlaOptions
{
    public const string Secao = "Sla";

    /// <summary>Intervalo entre verificações, em segundos (default 60).</summary>
    public int IntervaloSegundos { get; set; } = 60;

    /// <summary>Espera antes da primeira verificação após o start do host, em segundos (default 10).</summary>
    public int AtrasoInicialSegundos { get; set; } = 10;

    /// <summary>Janela de "risco": alerta quando faltam até N horas para o prazo de resolução (default 2, igual a Chamado.EstaProximoDeEstourarSLA).</summary>
    public double JanelaRiscoHoras { get; set; } = 2;
}
