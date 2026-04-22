import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/theme/app_theme.dart';

final requestDetailProvider = FutureProvider.family<dynamic, String>((ref, id) async {
  final response = await Supabase.instance.client
      .from('service_requests')
      .select('*, proposals(*, profiles(full_name, rating_avg))')
      .eq('id', id)
      .single();
  return response;
});

class RequestDetailPage extends ConsumerWidget {
  final String requestId;
  const RequestDetailPage({super.key, required this.requestId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final requestAsync = ref.watch(requestDetailProvider(requestId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Detalhes do Pedido'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.refresh(requestDetailProvider(requestId)),
          ),
        ],
      ),
      body: requestAsync.when(
        data: (req) => _buildContent(context, ref, req),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Erro: $err')),
      ),
    );
  }

  Widget _buildContent(BuildContext context, WidgetRef ref, dynamic req) {
    final status = req['status'] as String;
    final proposals = req['proposals'] as List;
    final media = req['media_urls'] as List;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _StatusBadge(status: status),
              const Spacer(),
              Text(
                'Criado em ${DateTime.parse(req['created_at']).day}/${DateTime.parse(req['created_at']).month}',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(req['title'], style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 8),
          Text(req['category'].toString().toUpperCase(), style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold, fontSize: 12)),
          
          const SizedBox(height: 24),
          Text('Descrição', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Text(req['description'], style: Theme.of(context).textTheme.bodyLarge),
          
          if (media.isNotEmpty) ...[
            const SizedBox(height: 24),
            Text('Fotos do Local', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            SizedBox(
              height: 120,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: media.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, index) => ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.network(media[index], width: 120, height: 120, fit: BoxFit.cover),
                ),
              ),
            ),
          ],
          
          const Divider(height: 64),
          
          if (status == 'open') ...[
            Text(
              '${proposals.length} Propostas Recebidas',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            if (proposals.isEmpty)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(24),
                  child: Text('Aguardando orçamentos de profissionais próximos...', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey)),
                ),
              )
            else
              ElevatedButton(
                onPressed: () => context.push('/client/request/${req['id']}/proposals'),
                child: const Text('Ver Orçamentos Detalhados'),
              ),
          ] else if (status == 'in_progress') ...[
             _ActiveServiceSection(request: req),
          ],
          
          const SizedBox(height: 48),
          if (status == 'open')
            OutlinedButton(
              onPressed: () => _cancelRequest(context, ref, req['id']),
              style: OutlinedButton.styleFrom(foregroundColor: Colors.red, side: const BorderSide(color: Colors.red)),
              child: const Text('Cancelar Pedido'),
            ),
        ],
      ),
    );
  }

  Future<void> _cancelRequest(BuildContext context, WidgetRef ref, String id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancelar?'),
        content: const Text('Deseja realmente cancelar este pedido?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Não')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Sim')),
        ],
      ),
    );
    
    if (confirm == true) {
      await Supabase.instance.client.from('service_requests').update({'status': 'cancelled'}).eq('id', id);
      ref.refresh(requestDetailProvider(id));
    }
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;
  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    Color color;
    String label;
    switch (status) {
      case 'open': color = Colors.blue; label = 'AGUARDANDO PROPOSTAS'; break;
      case 'in_progress': color = Colors.orange; label = 'EM EXECUÇÃO'; break;
      case 'completed': color = Colors.green; label = 'CONCLUÍDO'; break;
      case 'cancelled': color = Colors.red; label = 'CANCELADO'; break;
      default: color = Colors.grey; label = status.toUpperCase();
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(20)),
      child: Text(label, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 0.5)),
    );
  }
}

class _ActiveServiceSection extends StatelessWidget {
  final dynamic request;
  const _ActiveServiceSection({required this.request});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.primary.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.primary.withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.verified_user, color: Colors.green, size: 20),
              const SizedBox(width: 8),
              Text('Serviço Contratado', style: Theme.of(context).textTheme.titleMedium?.copyWith(color: AppTheme.primary)),
            ],
          ),
          const SizedBox(height: 16),
          const Text('O pagamento está em custódia segura pela plataforma. Confirme a conclusão apenas após a realização do serviço.'),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () {
              // TODO: Chamar Edge Function release-payment
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
            child: const Text('Confirmar Conclusão'),
          ),
          const SizedBox(height: 12),
          OutlinedButton(
            onPressed: () {
              // context.push('/chat/${request['chat_id']}');
            },
            child: const Text('Abrir Chat com Prestador'),
          ),
        ],
      ),
    );
  }
}
