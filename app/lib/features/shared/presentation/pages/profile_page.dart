import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/theme/app_theme.dart';

final profileProvider = FutureProvider((ref) async {
  final user = Supabase.instance.client.auth.currentUser;
  final profile = await Supabase.instance.client
      .from('profiles')
      .select('*')
      .eq('id', user!.id)
      .single();
  return profile;
});

class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(profileProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Meu Perfil')),
      body: profileAsync.when(
        data: (profile) => _buildContent(context, profile),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Erro: $err')),
      ),
    );
  }

  Widget _buildContent(BuildContext context, dynamic profile) {
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        Center(
          child: Stack(
            children: [
              CircleAvatar(
                radius: 50,
                backgroundColor: AppTheme.primary.withOpacity(0.1),
                child: Text(profile['full_name'][0], style: TextStyle(fontSize: 40, color: AppTheme.primary)),
              ),
              Positioned(
                bottom: 0,
                right: 0,
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                  child: Icon(Icons.edit, size: 20, color: AppTheme.primary),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Center(
          child: Column(
            children: [
              Text(profile['full_name'], style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 4),
              Text(profile['role'] == 'provider' ? 'Prestador Profissional' : 'Cliente'),
            ],
          ),
        ),
        
        const SizedBox(height: 40),
        ListTile(
          leading: const Icon(Icons.person_outline),
          title: const Text('Dados Pessoais'),
          trailing: const Icon(Icons.arrow_forward_ios, size: 14),
          onTap: () {},
        ),
        ListTile(
          leading: const Icon(Icons.notifications_outlined),
          title: const Text('Notificações'),
          trailing: const Icon(Icons.arrow_forward_ios, size: 14),
          onTap: () {},
        ),
        ListTile(
          leading: const Icon(Icons.security_outlined),
          title: const Text('Privacidade e Segurança'),
          trailing: const Icon(Icons.arrow_forward_ios, size: 14),
          onTap: () {},
        ),
        ListTile(
          leading: const Icon(Icons.help_outline),
          title: const Text('Ajuda e Suporte'),
          trailing: const Icon(Icons.arrow_forward_ios, size: 14),
          onTap: () {},
        ),
        const Divider(height: 48),
        ListTile(
          leading: const Icon(Icons.logout, color: Colors.red),
          title: const Text('Sair da Conta', style: TextStyle(color: Colors.red)),
          onTap: () async {
            await Supabase.instance.client.auth.signOut();
            context.go('/auth/login');
          },
        ),
      ],
    );
  }
}
