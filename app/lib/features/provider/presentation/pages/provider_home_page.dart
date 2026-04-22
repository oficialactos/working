import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/theme/app_theme.dart';

final providerDashboardProvider = FutureProvider((ref) async {
  final user = Supabase.instance.client.auth.currentUser;
  if (user == null) return null;
  
  final profile = await Supabase.instance.client
      .from('provider_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
      
  final activeJobs = await Supabase.instance.client
      .from('proposals')
      .select('*, service_requests(*)')
      .eq('provider_id', user.id)
      .eq('status', 'accepted');
      
  return {
    'profile': profile,
    'active_jobs': activeJobs as List<dynamic>,
  };
});

class ProviderHomePage extends ConsumerWidget {
  const ProviderHomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardAsync = ref.watch(providerDashboardProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Meu Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_outline),
            onPressed: () => context.push('/profile'),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(providerDashboardProvider.future),
        child: dashboardAsync.when(
          data: (data) => _buildContent(context, ref, data),
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (err, stack) => Center(child: Text('Erro: $err')),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/provider/feed'),
        label: const Text('Buscar Serviços'),
        icon: const Icon(Icons.search),
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
      ),
    );
  }

  Widget _buildContent(BuildContext context, WidgetRef ref, dynamic data) {
    final profile = data['profile'];
    final activeJobs = data['active_jobs'] as List;
    final isSubscribed = profile['is_visible'] == true;

    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        _SubscriptionCard(
          status: profile['subscription_status'],
          isVisible: isSubscribed,
          onTap: () => context.push('/provider/subscription'),
        ),
        const SizedBox(height: 32),
        
        Text('Serviços em Andamento', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 16),
        if (activeJobs.isEmpty)
          _EmptyState(
            onAction: () => context.push('/provider/feed'),
          )
        else
          ...activeJobs.map((job) => _ActiveJobCard(job: job)),
          
        const SizedBox(height: 32),
        _QuickActions(),
      ],
    );
  }
}

class _SubscriptionCard extends StatelessWidget {
  final String status;
  final bool isVisible;
  final VoidCallback onTap;

  const _SubscriptionCard({required this.status, required this.isVisible, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      color: isVisible ? Colors.green.withOpacity(0.05) : Colors.orange.withOpacity(0.05),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              Icon(
                isVisible ? Icons.check_circle : Icons.warning_amber_rounded,
                color: isVisible ? Colors.green : Colors.orange,
                size: 32,
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isVisible ? 'Perfil Visível' : 'Perfil Oculto',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    Text(
                      isVisible 
                        ? 'Sua assinatura está ativa. Aproveite os leads!' 
                        : 'Ative sua assinatura para aparecer para clientes.',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              const Icon(Icons.arrow_forward_ios, size: 14, color: Colors.grey),
            ],
          ),
        ),
      ),
    );
  }
}

class _ActiveJobCard extends StatelessWidget {
  final dynamic job;
  const _ActiveJobCard({required this.job});

  @override
  Widget build(BuildContext context) {
    final request = job['service_requests'];
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        onTap: () {
          // Navegar para detalhes do serviço no ponto de vista do prestador
        },
        title: Text(request['title']),
        subtitle: Text('Status: Em Execução • Pagamento em Custódia'),
        trailing: const Icon(Icons.arrow_forward_ios, size: 14),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final VoidCallback onAction;
  const _EmptyState({required this.onAction});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: Colors.grey.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.withOpacity(0.1)),
      ),
      child: Column(
        children: [
          const Icon(Icons.work_history_outlined, size: 48, color: Colors.grey),
          const SizedBox(height: 16),
          const Text('Você não tem serviços ativos no momento.', textAlign: TextAlign.center),
          const SizedBox(height: 24),
          OutlinedButton(onPressed: onAction, child: const Text('Encontrar Demandas')),
        ],
      ),
    );
  }
}

class _QuickActions extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Acesso Rápido', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 16),
        Row(
          children: [
            _ActionItem(icon: Icons.photo_library_outlined, label: 'Portfólio', onTap: () => context.push('/provider/portfolio')),
            const SizedBox(width: 12),
            _ActionItem(icon: Icons.chat_bubble_outline, label: 'Conversas', onTap: () => context.push('/chats')),
            const SizedBox(width: 12),
            _ActionItem(icon: Icons.credit_card_outlined, label: 'Finanças', onTap: () {}),
          ],
        ),
      ],
    );
  }
}

class _ActionItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _ActionItem({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey.withOpacity(0.2)),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            children: [
              Icon(icon, color: AppTheme.primary),
              const SizedBox(height: 8),
              Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      ),
    );
  }
}
