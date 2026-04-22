import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/theme/app_theme.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _emailCtrl = TextEditingController();
  final _passCtrl  = TextEditingController();
  bool _loading = false;
  bool _obscurePass = true;
  String? _error;
  final _formKey = GlobalKey<FormState>();

  final _supabase = Supabase.instance.client;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  Future<void> _loginWithEmail() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _loading = true; _error = null; });
    try {
      await _supabase.auth.signInWithPassword(
        email: _emailCtrl.text.trim(),
        password: _passCtrl.text,
      );
      if (!mounted) return;
      final profile = await _supabase
          .from('profiles')
          .select('role')
          .eq('id', _supabase.auth.currentUser!.id)
          .maybeSingle();
      if (!mounted) return;
      final role = profile?['role'] as String? ?? 'client';
      context.go(role == 'provider' ? '/provider' : '/client');
    } on AuthException catch (e) {
      setState(() => _error = _mapError(e.message));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loginWithGoogle() async {
    setState(() { _loading = true; _error = null; });
    try {
      await _supabase.auth.signInWithOAuth(OAuthProvider.google);
    } on AuthException catch (e) {
      setState(() => _error = _mapError(e.message));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _mapError(String msg) {
    if (msg.contains('Invalid login')) return 'E-mail ou senha incorretos.';
    if (msg.contains('Email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
    return 'Erro ao entrar. Tente novamente.';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 32),

                // Logo
                Center(
                  child: Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF6C63FF), Color(0xFF4B44CC)],
                      ),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Center(
                      child: Text('🔧', style: TextStyle(fontSize: 34)),
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                Text(
                  'Bem-vindo de volta!',
                  style: Theme.of(context).textTheme.headlineLarge,
                ),
                const SizedBox(height: 6),
                Text(
                  'Entre para continuar',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 36),

                // E-mail
                TextFormField(
                  controller: _emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    labelText: 'E-mail',
                    prefixIcon: Icon(Icons.email_outlined),
                  ),
                  validator: (v) => v?.contains('@') == true ? null : 'E-mail inválido',
                ),
                const SizedBox(height: 16),

                // Senha
                TextFormField(
                  controller: _passCtrl,
                  obscureText: _obscurePass,
                  decoration: InputDecoration(
                    labelText: 'Senha',
                    prefixIcon: const Icon(Icons.lock_outline),
                    suffixIcon: IconButton(
                      icon: Icon(_obscurePass ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                      onPressed: () => setState(() => _obscurePass = !_obscurePass),
                    ),
                  ),
                  validator: (v) => (v?.length ?? 0) >= 6 ? null : 'Mínimo de 6 caracteres',
                ),

                // Erro
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.error.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.error_outline, color: AppTheme.error, size: 18),
                        const SizedBox(width: 8),
                        Expanded(child: Text(_error!, style: TextStyle(color: AppTheme.error, fontSize: 13))),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 24),

                // Botão entrar
                ElevatedButton(
                  onPressed: _loading ? null : _loginWithEmail,
                  child: _loading
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text('Entrar'),
                ),
                const SizedBox(height: 12),

                // Divisor
                Row(
                  children: [
                    const Expanded(child: Divider()),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      child: Text('ou', style: Theme.of(context).textTheme.bodySmall),
                    ),
                    const Expanded(child: Divider()),
                  ],
                ),
                const SizedBox(height: 12),

                // Google
                OutlinedButton.icon(
                  onPressed: _loading ? null : _loginWithGoogle,
                  icon: const Text('G', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: Color(0xFFDB4437))),
                  label: const Text('Continuar com Google'),
                ),

                const SizedBox(height: 24),

                // Cadastrar
                Center(
                  child: TextButton(
                    onPressed: () => context.push('/auth/register'),
                    child: RichText(
                      text: const TextSpan(
                        text: 'Não tem conta? ',
                        style: TextStyle(color: Colors.grey, fontFamily: 'Inter'),
                        children: [
                          TextSpan(
                            text: 'Cadastre-se',
                            style: TextStyle(
                              color: Color(0xFF6C63FF),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
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
