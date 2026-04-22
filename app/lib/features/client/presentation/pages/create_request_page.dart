import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';
import '../../../../core/constants/app_constants.dart';
import '../../../../core/theme/app_theme.dart';
import 'client_home_page.dart';

class CreateRequestPage extends ConsumerStatefulWidget {
  const CreateRequestPage({super.key});

  @override
  ConsumerState<CreateRequestPage> createState() => _CreateRequestPageState();
}

class _CreateRequestPageState extends ConsumerState<CreateRequestPage> {
  final _formKey = GlobalKey<FormState>();
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  
  String? _selectedCategoryId;
  List<XFile> _mediaFiles = [];
  bool _loading = false;
  
  final _picker = ImagePicker();
  final _supabase = Supabase.instance.client;

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickMedia() async {
    final picked = await _picker.pickMultiImage();
    if (picked.isNotEmpty) {
      setState(() {
        _mediaFiles.addAll(picked);
      });
    }
  }

  Future<void> _submit() async {
    if (_selectedCategoryId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Por favor, selecione uma categoria')),
      );
      return;
    }
    
    if (!_formKey.currentState!.validate()) return;

    setState(() => _loading = true);

    try {
      final user = _supabase.auth.currentUser;
      if (user == null) return;

      // 1. Upload das mídias
      List<String> mediaUrls = [];
      for (var file in _mediaFiles) {
        final fileExt = file.path.split('.').last;
        final fileName = '${const Uuid().v4()}.$fileExt';
        final filePath = 'requests/${user.id}/$fileName';
        
        await _supabase.storage.from('media').upload(
          filePath,
          File(file.path),
        );
        
        final url = _supabase.storage.from('media').getPublicUrl(filePath);
        mediaUrls.add(url);
      }

      // 2. Criar a requisição no banco
      // Nota: Em um app real, buscaríamos a localização real aqui.
      // Para este exemplo, usamos um ponto fixo se não houver GPS.
      await _supabase.from('service_requests').insert({
        'client_id': user.id,
        'category': _selectedCategoryId,
        'title': _titleCtrl.text.trim(),
        'description': _descCtrl.text.trim(),
        'media_urls': mediaUrls,
        'status': 'open',
      });

      if (!mounted) return;
      ref.refresh(clientRequestsProvider);
      context.pop();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pedido criado com sucesso!')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erro ao criar pedido: $e')),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Novo Pedido')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('O que você precisa?', style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 12),
              Text(
                'Selecione a categoria e descreva o serviço para receber orçamentos.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey),
              ),
              const SizedBox(height: 32),
              
              Text('Categoria', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 12),
              SizedBox(
                height: 100,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: AppConstants.categories.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 12),
                  itemBuilder: (context, index) {
                    final cat = AppConstants.categories[index];
                    final isSelected = _selectedCategoryId == cat.id;
                    return GestureDetector(
                      onTap: () => setState(() => _selectedCategoryId = cat.id),
                      child: Container(
                        width: 90,
                        decoration: BoxDecoration(
                          color: isSelected ? AppTheme.primary.withOpacity(0.1) : Colors.transparent,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: isSelected ? AppTheme.primary : Colors.grey.withOpacity(0.2),
                            width: isSelected ? 2 : 1,
                          ),
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(cat.icon, style: const TextStyle(fontSize: 28)),
                            const SizedBox(height: 4),
                            Text(
                              cat.label,
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                color: isSelected ? AppTheme.primary : null,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
              
              const SizedBox(height: 32),
              Text('Detalhes do Serviço', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 16),
              TextFormField(
                controller: _titleCtrl,
                decoration: const InputDecoration(
                  labelText: 'Título curto (Ex: Conserto de torneira)',
                ),
                validator: (v) => (v?.isEmpty ?? true) ? 'Campo obrigatório' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _descCtrl,
                maxLines: 5,
                decoration: const InputDecoration(
                  labelText: 'Descrição detalhada do problema ou serviço',
                  alignLabelWithHint: true,
                ),
                validator: (v) => (v?.isEmpty ?? true) ? 'Campo obrigatório' : null,
              ),
              
              const SizedBox(height: 32),
              Text('Fotos / Vídeos', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  ..._mediaFiles.map((file) => Stack(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.file(
                          File(file.path),
                          width: 80,
                          height: 80,
                          fit: BoxFit.cover,
                        ),
                      ),
                      Positioned(
                        top: -4,
                        right: -4,
                        child: IconButton(
                          icon: const Icon(Icons.cancel, color: Colors.red, size: 20),
                          onPressed: () => setState(() => _mediaFiles.remove(file)),
                        ),
                      ),
                    ],
                  )),
                  GestureDetector(
                    onTap: _pickMedia,
                    child: Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        color: Colors.grey.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.grey.withOpacity(0.3), style: BorderStyle.solid),
                      ),
                      child: const Icon(Icons.add_a_photo_outlined, color: Colors.grey),
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 48),
              ElevatedButton(
                onPressed: _loading ? null : _submit,
                child: _loading 
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('Publicar Pedido'),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}
