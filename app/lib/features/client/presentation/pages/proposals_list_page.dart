import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/theme/app_theme.dart';
import 'request_detail_page.dart';

final proposalsProvider = FutureProvider.family<List<dynamic>, String>((ref, requestId) async {
  final response = await Supabase.instance.client
      .from('proposals')
      .select('*, profiles(*)')
      .eq('request_id', requestId)
      .eq('status', 'pending')
      .order('price', ascending: true);
  return response as List<dynamic>;
});

class ProposalsListPage extends ConsumerWidget {
  final String requestId;
  const ProposalsListPage({super.key, required this.requestId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final proposalsAsync = ref.watch(proposalsProvider(requestId));

    return Scaffold(
      appBar: AppBar(title: const Text('Orçamentos Recebidos')),
      body: proposalsAsync.when(
        data: (proposals) {
          if (proposals.isEmpty) {
            return const Center(child: Text('Nenhum orçamento disponível ainda.'));
          }
          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: proposals.length,
            itemBuilder: (context, index) {
              final prop = proposals[index];
              return _ProposalCard(proposal: prop);
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Erro: $err')),
      ),
    );
  }
}

class _ProposalCard extends StatelessWidget {
  final dynamic proposal;
  const _ProposalCard({required this.proposal});

  @override
  Widget build(BuildContext context) {
    final provider = proposal['profiles'];
    final price = proposal['price'] as num;

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: AppTheme.primary.withOpacity(0.1),
                  child: Text(provider['full_name'][0], style: TextStyle(color: AppTheme.primary)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(provider['full_name'], style: Theme.of(context).textTheme.titleMedium),
                      Row(
                        children: [
                          const Icon(Icons.star, color: Colors.amber, size: 14),
                          const SizedBox(width: 4),
                          Text('${provider['rating_avg'] ?? "N/A"} (${provider['rating_count'] ?? 0} avaliações)', style: Theme.of(context).textTheme.bodySmall),
                        ],
                      ),
                    ],
                  ),
                ),
                Text(
                  'R\$ ${price.toStringAsFixed(2)}',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(color: AppTheme.primary, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const Divider(height: 32),
            Text('Mensagem do Profissional:', style: Theme.of(context).textTheme.labelMedium),
            const SizedBox(height: 4),
            Text(proposal['description'] ?? 'Sem detalhes adicionais.'),
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(Icons.timer_outlined, size: 14, color: Colors.grey),
                const SizedBox(width: 4),
                Text('Prazo: ${proposal['deadline_days']} dias', style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {
                      // context.push('/profile/provider/${provider['id']}');
                    },
                    child: const Text('Ver Perfil'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => _acceptProposal(context),
                    child: const Text('Aceitar e Pagar'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _acceptProposal(BuildContext context) {
     showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => _PaymentBottomSheet(proposal: proposal),
    );
  }
}

class _PaymentBottomSheet extends StatefulWidget {
  final dynamic proposal;
  const _PaymentBottomSheet({required this.proposal});

  @override
  State<_PaymentBottomSheet> createState() => _PaymentBottomSheetState();
}

class _PaymentBottomSheetState extends State<_PaymentBottomSheet> {
  bool _processing = false;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Confirmar Contratação', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 16),
          const Text('Ao aceitar, o valor será debitado e mantido em custódia segura. O prestador será notificado para iniciar o serviço.'),
          const SizedBox(height: 24),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.payment, color: Colors.blue),
            title: const Text('Método de Pagamento'),
            subtitle: const Text('Cartão final **** 4242'),
            trailing: const Icon(Icons.arrow_forward_ios, size: 14),
            onTap: () {},
          ),
          const Divider(height: 32),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Total a pagar:', style: TextStyle(fontSize: 16)),
              Text(
                'R\$ ${widget.proposal['price'].toStringAsFixed(2)}',
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 32),
          ElevatedButton(
            onPressed: _processing ? null : () async {
              setState(() => _processing = true);
              try {
                // TODO: Chamar Edge Function process-payment via Supabase
                // await Supabase.instance.client.functions.invoke('process-payment', body: {...});
                
                if (!mounted) return;
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Contratação realizada com sucesso!')));
                context.go('/client');
              } finally {
                if (mounted) setState(() => _processing = false);
              }
            },
            child: _processing 
                ? const CircularProgressIndicator(color: Colors.white)
                : const Text('Confirmar e Pagar'),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}
