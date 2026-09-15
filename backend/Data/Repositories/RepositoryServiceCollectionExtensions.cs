namespace backend.Data.Repositories;

public static class RepositoryServiceCollectionExtensions
{
    public static IServiceCollection AddRepositories(this IServiceCollection services)
    {
        services.AddScoped(typeof(IBaseRepository<>), typeof(Repository<>));
        return services;
    }
}
