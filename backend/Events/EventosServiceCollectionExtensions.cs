using System.Threading.Channels;

namespace backend.Events;

public static class EventosServiceCollectionExtensions
{
    /// <summary>
    /// Registra o canal de eventos (singleton), o IEventoService real, o HttpClient nomeado e o WebhookDispatcher.
    /// </summary>
    public static IServiceCollection AddEventosWebhooks(this IServiceCollection services, IConfiguration config)
    {
        var secao = config.GetSection(WebhooksOptions.Secao);
        services.Configure<WebhooksOptions>(secao);

        var capacidade = secao.GetValue<int?>(nameof(WebhooksOptions.CapacidadeFila)) ?? 10_000;
        var timeout = secao.GetValue<int?>(nameof(WebhooksOptions.TimeoutSegundos)) ?? 10;

        services.AddSingleton(Channel.CreateBounded<EventoEnvelope>(new BoundedChannelOptions(Math.Max(1, capacidade))
        {
            SingleReader = true,
            SingleWriter = false,
            FullMode = BoundedChannelFullMode.Wait
        }));

        services.AddSingleton<IEventoService, EventoService>();

        services.AddHttpClient(WebhookDispatcher.HttpClientNome, c =>
        {
            c.Timeout = TimeSpan.FromSeconds(Math.Max(1, timeout));
        });

        services.AddHostedService<WebhookDispatcher>();
        return services;
    }
}
