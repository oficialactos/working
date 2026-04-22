import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/theme/app_theme.dart';

final clientRequestsProvider = FutureProvider((ref) async {
  final user = Supabase.instance.client.auth.currentUser;
  if (user == null) return [];
  
  final response = await Supabase.instance.client
      .from('service_requests')
      .select('*, proposals(count)')
      .eq('client_id', user.id)
      .order('created_at', ascending: false);
  
  return response as List<dynamic>;
});

class ClientHomePage extends ConsumerWidget {
  const ClientHomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final requestsAsync = ref.watch(clientRequestsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Meus Pedidos'),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_outline),
            onPressed: () => context.push('/profile'),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(clientRequestsProvider.future),
        child: requestsAsync.when(
          data: (requests) {
            if (requests.isEmpty) {
              return _EmptyState(
                onAction: () => context.push('/client/create-request'),
              );
            }
            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: requests.length,
              itemBuilder: (context, index) {
                final req = requests[index];
                return _RequestCard(request: req);
              },
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (err, stack) => Center(child: Text('Erro ao carregar: $err')),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/client/create-request'),
        label: const Text('Novo Pedido'),
        icon: const Icon(Icons.add),
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
      ),
    );
  }
}

class _RequestCard extends StatelessWidget {
  final dynamic request;
  const _RequestCard({required this.request});

  @override
  Widget build(BuildContext context) {
    final status = request['status'] as String;
    final proposalCount = (request['proposals'] as List).isNotEmpty 
        ? request['proposals'][0]['count'] as int 
        : 0;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () => context.push('/client/request/${request['id']}'),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _StatusChip(status: status),
                  Text(
                    '${request['category'].toString().toUpperCase()}',
                    style: Theme.of(context).textTheme.labelMedium,
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                request['title'] ?? 'Sem título',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 4),
              Text(
                request['description'] ?? '',
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  const Icon(Icons.description_outlined, size: 16, color: Colors.grey),
                  const SizedBox(width: 4),
                  Text(
                    '$proposalCount orçamentos recebidos',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const Spacer(),
                  const Icon(Icons.arrow_forward_ios, size: 14, color: Colors.grey),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final String status;
  const _StatusChip({required this.status});

  @override
  Widget build(BuildContext context) {
    Color color;
    String label;

    switch (status) {
      case 'open':
        color = Colors.blue;
        label = 'Aberto';
        break;
      case 'in_progress':
        color = Colors.orange;
        label = 'Em Andamento';
        break;
      case 'completed':
        color = Colors.green;
        label = 'Concluído';
        break;
      case 'cancelled':
        color = Colors.red;
        label = 'Cancelado';
        break;
      default:
        color = Colors.grey;
        label = status;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.5)),
      ),
      child: Text(
        label,
        style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.bold),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final VoidCallback onAction;
  const _EmptyState({required this.onAction});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.search_off_outlined, size: 80, color: Colors.grey),
            const SizedBox(height: 24),
            Text(
              'Nenhum pedido ainda',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 12),
            const Text(
              'Crie um novo pedido para encontrar os melhores profissionais da sua região.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: onAction,
              child: const Text('Começar Agora'),
            ),
          ],
        ),
      ),
    );
  }
}
