import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:geolocator/geolocator.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/constants/app_constants.dart';
import '../../../../core/theme/app_theme.dart';

class OnboardingPage extends StatefulWidget {
  final String role;
  const OnboardingPage({super.key, required this.role});

  @override
  State<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends State<OnboardingPage> {
  final _pageCtrl = PageController();
  int _currentPage = 0;
  bool _loading = false;

  // Dados do perfil
  String? _avatarUrl;
  final _bioCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  double? _lat;
  double? _lng;
  String? _city;
  final List<String> _selectedCategories = [];
  int _radiusKm = 20;

  final _supabase = Supabase.instance.client;

  bool get _isProvider => widget.role == 'provider';
  int get _totalPages => _isProvider ? 3 : 2;

  Future<void> _requestLocation() async {
    setState(() => _loading = true);
    try {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.deniedForever) return;

      final position = await Geolocator.getCurrentPosition();
      setState(() {
        _lat = position.latitude;
        _lng = position.longitude;
      });
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _finish() async {
    setState(() => _loading = true);
    try {
      final userId = _supabase.auth.currentUser!.id;

      // Atualizar perfil base
      await _supabase.from('profiles').update({
        'bio': _bioCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
        'city': _city,
        if (_lat != null && _lng != null)
          'location': 'POINT($_lng $_lat)',
      }).eq('id', userId);

      // Se for prestador, atualizar provider_profile
      if (_isProvider) {
        await _supabase.from('provider_profiles').upsert({
          'id': userId,
          'categories': _selectedCategories,
          'service_radius_km': _radiusKm,
        });
      }

      if (!mounted) return;
      context.go(_isProvider ? '/provider' : '/client');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // Progress bar
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
              child: Row(
                children: List.generate(_totalPages, (i) => Expanded(
                  child: Container(
                    height: 4,
                    margin: EdgeInsets.only(right: i < _totalPages - 1 ? 6 : 0),
                    decoration: BoxDecoration(
                      color: i <= _currentPage ? AppTheme.primary : Colors.grey.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                )),
              ),
            ),
            Expanded(
              child: PageView(
                controller: _pageCtrl,
                physics: const NeverScrollableScrollPhysics(),
                onPageChanged: (i) => setState(() => _currentPage = i),
                children: [
                  _buildPage1(),
                  _buildPage2(),
                  if (_isProvider) _buildPage3(),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(24),
              child: Row(
                children: [
                  if (_currentPage > 0)
                    Expanded(
                      flex: 1,
                      child: OutlinedButton(
                        onPressed: () => _pageCtrl.previousPage(
                          duration: const Duration(milliseconds: 300),
                          curve: Curves.easeInOut,
                        ),
                        child: const Text('Voltar'),
                      ),
                    ),
                  if (_currentPage > 0) const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: ElevatedButton(
                      onPressed: _loading ? null : () {
                        if (_currentPage < _totalPages - 1) {
                          _pageCtrl.nextPage(
                            duration: const Duration(milliseconds: 300),
                            curve: Curves.easeInOut,
                          );
                        } else {
                          _finish();
                        }
                      },
                      child: _loading
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : Text(_currentPage < _totalPages - 1 ? 'Continuar' : 'Concluir'),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPage1() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 24),
          Text('Seu perfil', style: Theme.of(context).textTheme.headlineLarge),
          const SizedBox(height: 6),
          Text('Conte um pouco sobre você', style: Theme.of(context).textTheme.bodyMedium),
          const SizedBox(height: 32),
          TextFormField(
            controller: _phoneCtrl,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(
              labelText: 'Telefone / WhatsApp',
              prefixIcon: Icon(Icons.phone_outlined),
            ),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _bioCtrl,
            maxLines: 4,
            decoration: InputDecoration(
              labelText: _isProvider ? 'Apresentação profissional' : 'Bio (opcional)',
              alignLabelWithHint: true,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPage2() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 24),
          Text('Sua localização', style: Theme.of(context).textTheme.headlineLarge),
          const SizedBox(height: 6),
          Text('Para encontrar profissionais ou serviços próximos', style: Theme.of(context).textTheme.bodyMedium),
          const SizedBox(height: 32),
          if (_lat == null)
            ElevatedButton.icon(
              onPressed: _loading ? null : _requestLocation,
              icon: const Icon(Icons.my_location),
              label: const Text('Usar minha localização atual'),
            )
          else
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.success.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.success.withOpacity(0.3)),
              ),
              child: Row(
                children: [
                  Icon(Icons.check_circle, color: AppTheme.success),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Localização capturada!', style: TextStyle(color: AppTheme.success, fontWeight: FontWeight.w600)),
                        Text('${_lat!.toStringAsFixed(4)}, ${_lng!.toStringAsFixed(4)}', style: Theme.of(context).textTheme.bodySmall),
                      ],
                    ),
                  ),
                  TextButton(onPressed: _requestLocation, child: const Text('Atualizar')),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildPage3() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 24),
          Text('Suas especialidades', style: Theme.of(context).textTheme.headlineLarge),
          const SizedBox(height: 6),
          Text('Selecione as categorias em que você atua', style: Theme.of(context).textTheme.bodyMedium),
          const SizedBox(height: 24),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: AppConstants.categories.map((cat) {
              final isSelected = _selectedCategories.contains(cat.id);
              return FilterChip(
                label: Text('${cat.icon} ${cat.label}'),
                selected: isSelected,
                onSelected: (v) => setState(() {
                  v ? _selectedCategories.add(cat.id) : _selectedCategories.remove(cat.id);
                }),
              );
            }).toList(),
          ),
          const SizedBox(height: 28),
          Text('Raio de atendimento', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 4),
          Text('Você receberá leads em um raio de $_radiusKm km', style: Theme.of(context).textTheme.bodySmall),
          Slider(
            value: _radiusKm.toDouble(),
            min: 5,
            max: 100,
            divisions: 19,
            label: '$_radiusKm km',
            onChanged: (v) => setState(() => _radiusKm = v.round()),
          ),
        ],
      ),
    );
  }
}
