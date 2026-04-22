import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/theme/app_theme.dart';

final feedProvider = FutureProvider((ref) async {
  final user = Supabase.instance.client.auth.currentUser;
  if (user == null) return [];

  // Buscar localização e preferências do prestador
  final profile = await Supabase.instance.client
      .from('provider_profiles')
      .select('categories, service_radius_km, profiles(location)')
      .eq('id', user.id)
      .single();

  final location = profile['profiles']['location'] as String?;
  if (location == null) return [];

  // Regex para extrair lat/lng de POINT(lng lat)
  final coords = RegExp(r"POINT\(([-\d\.]+) ([-\d\.]+)\)").firstMatch(location);
  final lng = double.parse(coords!.group(1)!);
  final lat = double.parse(coords.group(2)!);
  final radius = profile['service_radius_km'] as int;
  final categories = profile['categories'] as List;

  // Buscar requisições abertas próximas usando PostGIS via RPC ou query bruta
  // Aqui usamos uma query simulada que o Supabase aceitaria com PostGIS habilitado
  final response = await Supabase.instance.client
      .from('service_requests')
      .select('*, profiles(full_name, rating_avg)')
      .eq('status', 'open')
      .in_('category', categories);
      
  // Nota: No mundo real, usaríamos uma Function (RPC) no Postgres para fazer o st_dwithin
  // select * from get_nearby_requests(lat, lng, radius)
  
  return response as List<dynamic>;
});

class RequestFeedPage extends ConsumerWidget {
  const RequestFeedPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final feedAsync = ref.watch(feedProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Oportunidades'),
        actions: [
          IconButton(icon: const Icon(Icons.filter_list), onPressed: () {}),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(feedProvider.future),
        child: feedAsync.when(
          data: (requests) {
            if (requests.isEmpty) {
              return _NoRequestsState();
            }
            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: requests.length,
              itemBuilder: (context, index) {
                final req = requests[index];
                return _FeedCard(request: req);
              },
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (err, stack) => Center(child: Text('Erro ao carregar feed: $err')),
        ),
      ),
    );
  }
}

class _FeedCard extends StatelessWidget {
  final dynamic request;
  const _FeedCard({required this.request});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: InkWell(
        onTap: () => context.push('/provider/request/${request['id']}/proposal'),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _CategoryTag(label: request['category']),
                  const Text('4.2 km de você', style: TextStyle(color: Colors.grey, fontSize: 12)),
                ],
              ),
              const SizedBox(height: 16),
              Text(request['title'], style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 8),
              Text(
                request['description'],
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey[600]),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                   const Icon(Icons.location_on_outlined, size: 16, color: Colors.grey),
                   const SizedBox(width: 4),
                   const Text('São Paulo, SP', style: TextStyle(color: Colors.grey, fontSize: 12)),
                   const Spacer(),
                   ElevatedButton(
                     onPressed: () => context.push('/provider/request/${request['id']}/proposal'),
                     style: ElevatedButton.styleFrom(
                       minimumSize: const Size(120, 40),
                       padding: const EdgeInsets.symmetric(horizontal: 16),
                     ),
                     child: const Text('Ver Detalhes'),
                   ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CategoryTag extends StatelessWidget {
  final String label;
  const _CategoryTag({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: AppTheme.primary.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label.toUpperCase(),
        style: TextStyle(color: AppTheme.primary, fontSize: 10, fontWeight: FontWeight.bold),
      ),
    );
  }
}

class _NoRequestsState extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.notifications_none, size: 64, color: Colors.grey),
            const SizedBox(height: 24),
            Text('Nenhuma demanda agora', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            const Text(
              'Avisaremos você assim que novos serviços na sua região forem publicados.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }
}
