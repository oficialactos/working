import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/theme/app_theme.dart';

class SendProposalPage extends ConsumerStatefulWidget {
  final String requestId;
  const SendProposalPage({super.key, required this.requestId});

  @override
  ConsumerState<SendProposalPage> createState() => _SendProposalPageState();
}

class _SendProposalPageState extends ConsumerState<SendProposalPage> {
  final _formKey = GlobalKey<FormState>();
  final _priceCtrl = TextEditingController();
  final _daysCtrl  = TextEditingController();
  final _descCtrl  = TextEditingController();
  bool _loading = false;
  dynamic _requestData;

  @override
  void initState() {
    super.initState();
    _fetchRequest();
  }

  Future<void> _fetchRequest() async {
    final data = await Supabase.instance.client
        .from('service_requests')
        .select('*, profiles(full_name)')
        .eq('id', widget.requestId)
        .single();
    setState(() => _requestData = data);
  }

  @override
  void dispose() {
    _priceCtrl.dispose();
    _daysCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);

    try {
      final user = Supabase.instance.client.auth.currentUser;
      await Supabase.instance.client.from('proposals').insert({
        'request_id': widget.requestId,
        'provider_id': user!.id,
        'price': double.parse(_priceCtrl.text),
        'deadline_days': int.parse(_daysCtrl.text),
        'description': _descCtrl.text.trim(),
        'status': 'pending',
      });

      if (!mounted) return;
      context.go('/provider');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Proposta enviada com sucesso!')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erro ao enviar proposta: $e')),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_requestData == null) return const Scaffold(body: Center(child: CircularProgressIndicator()));

    return Scaffold(
      appBar: AppBar(title: const Text('Enviar Proposta')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _RequestSummary(request: _requestData),
              const Divider(height: 48),
              
              Text('Seu Orçamento', style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 24),
              
              Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: TextFormField(
                      controller: _priceCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Valor (R$)',
                        prefixIcon: Icon(Icons.attach_money),
                      ),
                      validator: (v) => (v?.isEmpty ?? true) ? 'Obrigatório' : null,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    flex: 1,
                    child: TextFormField(
                      controller: _daysCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Prazo (Dias)',
                      ),
                      validator: (v) => (v?.isEmpty ?? true) ? 'Obrigatório' : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              TextFormField(
                controller: _descCtrl,
                maxLines: 4,
                decoration: const InputDecoration(
                  labelText: 'Explique como você pretende ajudar...',
                  alignLabelWithHint: true,
                ),
                validator: (v) => (v?.isEmpty ?? true) ? 'Descreva sua proposta' : null,
              ),
              
              const SizedBox(height: 40),
              ElevatedButton(
                onPressed: _loading ? null : _submit,
                child: _loading 
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('Enviar Orçamento'),
              ),
              const SizedBox(height: 12),
              const Center(
                child: Text('Você só paga se o cliente aceitar.', style: TextStyle(color: Colors.grey, fontSize: 12)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RequestSummary extends StatelessWidget {
  final dynamic request;
  const _RequestSummary({required this.request});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(request['title'], style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 8),
        Text('Cliente: ${request['profiles']['full_name']}', style: Theme.of(context).textTheme.bodySmall),
        const SizedBox(height: 16),
        Text(request['description'], style: Theme.of(context).textTheme.bodyMedium),
      ],
    );
  }
}
