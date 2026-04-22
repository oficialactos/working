import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/theme/app_theme.dart';

class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key});

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  final _formKey  = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _emailCtrl= TextEditingController();
  final _passCtrl = TextEditingController();

  String _selectedRole = 'client';
  bool _loading  = false;
  bool _obscure  = true;
  String? _error;

  final _supabase = Supabase.instance.client;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _loading = true; _error = null; });
    try {
      await _supabase.auth.signUp(
        email: _emailCtrl.text.trim(),
        password: _passCtrl.text,
        data: {
          'full_name': _nameCtrl.text.trim(),
          'role': _selectedRole,
        },
      );
      if (!mounted) return;
      // Redireciona para onboarding para completar perfil
      context.go('/auth/onboarding?role=$_selectedRole');
    } on AuthException catch (e) {
      setState(() => _error = e.message.contains('already registered')
          ? 'Este e-mail já está cadastrado.'
          : 'Erro ao criar conta. Tente novamente.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Criar conta')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Quem é você?', style: Theme.of(context).textTheme.headlineMedium),
                const SizedBox(height: 20),

                // Seleção de perfil
                Row(
                  children: [
                    Expanded(child: _RoleCard(
                      icon: '👤',
                      label: 'Sou Cliente',
                      sublabel: 'Preciso de serviços',
                      selected: _selectedRole == 'client',
                      onTap: () => setState(() => _selectedRole = 'client'),
                    )),
                    const SizedBox(width: 12),
                    Expanded(child: _RoleCard(
                      icon: '🔧',
                      label: 'Sou Prestador',
                      sublabel: 'Ofereço serviços',
                      selected: _selectedRole == 'provider',
                      onTap: () => setState(() => _selectedRole = 'provider'),
                    )),
                  ],
                ),
                const SizedBox(height: 28),

                Text('Dados da conta', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 16),

                // Nome
                TextFormField(
                  controller: _nameCtrl,
                  textCapitalization: TextCapitalization.words,
                  decoration: const InputDecoration(
                    labelText: 'Nome completo',
                    prefixIcon: Icon(Icons.person_outline),
                  ),
                  validator: (v) => (v?.trim().length ?? 0) >= 3 ? null : 'Informe seu nome completo',
                ),
                const SizedBox(height: 14),

                // Email
                TextFormField(
                  controller: _emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    labelText: 'E-mail',
                    prefixIcon: Icon(Icons.email_outlined),
                  ),
                  validator: (v) => v?.contains('@') == true ? null : 'E-mail inválido',
                ),
                const SizedBox(height: 14),

                // Senha
                TextFormField(
                  controller: _passCtrl,
                  obscureText: _obscure,
                  decoration: InputDecoration(
                    labelText: 'Senha',
                    prefixIcon: const Icon(Icons.lock_outline),
                    suffixIcon: IconButton(
                      icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                      onPressed: () => setState(() => _obscure = !_obscure),
                    ),
                  ),
                  validator: (v) => (v?.length ?? 0) >= 6 ? null : 'Mínimo 6 caracteres',
                ),

                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.error.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(_error!, style: TextStyle(color: AppTheme.error, fontSize: 13)),
                  ),
                ],

                const SizedBox(height: 28),

                ElevatedButton(
                  onPressed: _loading ? null : _register,
                  child: _loading
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text('Criar conta'),
                ),
                const SizedBox(height: 14),

                Center(
                  child: TextButton(
                    onPressed: () => context.pop(),
                    child: const Text('Já tenho conta'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _RoleCard extends StatelessWidget {
  final String icon;
  final String label;
  final String sublabel;
  final bool selected;
  final VoidCallback onTap;

  const _RoleCard({
    required this.icon,
    required this.label,
    required this.sublabel,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: selected ? AppTheme.primary.withOpacity(0.08) : Colors.transparent,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected ? AppTheme.primary : Colors.grey.withOpacity(0.3),
            width: selected ? 2 : 1,
          ),
        ),
        child: Column(
          children: [
            Text(icon, style: const TextStyle(fontSize: 32)),
            const SizedBox(height: 8),
            Text(label, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 2),
            Text(sublabel, style: Theme.of(context).textTheme.bodySmall, textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}
