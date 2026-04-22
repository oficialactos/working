import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/theme/app_theme.dart';

final subscriptionProvider = FutureProvider((ref) async {
  final user = Supabase.instance.client.auth.currentUser;
  final profile = await Supabase.instance.client
      .from('provider_profiles')
      .select('*')
      .eq('id', user!.id)
      .single();
  return profile;
});

class SubscriptionPage extends ConsumerStatefulWidget {
  const SubscriptionPage({super.key});

  @override
  ConsumerState<SubscriptionPage> createState() => _SubscriptionPageState();
}

class _SubscriptionPageState extends ConsumerState<SubscriptionPage> {
  bool _loading = false;

  Future<void> _handleAction(String action) async {
    setState(() => _loading = true);
    try {
      final response = await Supabase.instance.client.functions.invoke(
        'handle-subscription',
        body: {'action': action},
      );
      
      final data = response.data;
      final url = action == 'create_checkout' ? data['checkout_url'] : data['portal_url'];
      
      if (url != null) {
        await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erro: $e')),
      );
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final subAsync = ref.watch(subscriptionProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Assinatura Pro')),
      body: subAsync.when(
        data: (profile) => _buildContent(context, profile),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Erro: $err')),
      ),
    );
  }

  Widget _buildContent(BuildContext context, dynamic profile) {
    final status = profile['subscription_status'];
    final isActive = status == 'active' || status == 'trialing';

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFF6C63FF), Color(0xFF4B44CC)]),
              borderRadius: BorderRadius.circular(24),
            ),
            child: Column(
              children: [
                const Text('🔧', style: TextStyle(fontSize: 48)),
                const SizedBox(height: 16),
                const Text(
                  'Plano Profissional',
                  style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Text(
                  isActive ? 'Sua assinatura está ATIVA' : 'Leve seu trabalho para outro nível',
                  style: TextStyle(color: Colors.white.withOpacity(0.8)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),
          _FeatureItem(icon: Icons.visibility, text: 'Apareça no topo das buscas'),
          _FeatureItem(icon: Icons.notifications_active, text: 'Receba leads em tempo real'),
          _FeatureItem(icon: Icons.chat, text: 'Chat ilimitado com clientes'),
          _FeatureItem(icon: Icons.star, text: 'Selo de Prestador Verificado'),
          
          const SizedBox(height: 48),
          if (!isActive)
            ElevatedButton(
              onPressed: _loading ? null : () => _handleAction('create_checkout'),
              child: _loading 
                ? const CircularProgressIndicator(color: Colors.white)
                : const Text('Assinar Agora - 7 Dias Grátis'),
            )
          else
            OutlinedButton(
              onPressed: _loading ? null : () => _handleAction('create_portal'),
              child: _loading 
                ? const CircularProgressIndicator()
                : const Text('Gerenciar Assinatura'),
            ),
          const SizedBox(height: 16),
          const Text('Cancele a qualquer momento.', style: TextStyle(color: Colors.grey, fontSize: 12)),
        ],
      ),
    );
  }
}

class _FeatureItem extends StatelessWidget {
  final IconData icon;
  final String text;
  const _FeatureItem({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Icon(icon, color: AppTheme.primary, size: 20),
          const SizedBox(width: 12),
          Text(text, style: const TextStyle(fontSize: 15)),
        ],
      ),
    );
  }
}
