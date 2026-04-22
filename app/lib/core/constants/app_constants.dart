// ignore_for_file: constant_identifier_names
class AppConstants {
  AppConstants._();

  // ─── Supabase ──────────────────────────────────────────────
  // TODO: Substituir pelos valores reais do seu projeto Supabase
  static const String supabaseUrl    = 'https://SEU_PROJECT_ID.supabase.co';
  static const String supabaseAnonKey = 'SUA_ANON_KEY';

  // ─── Stripe ────────────────────────────────────────────────
  // TODO: Substituir pela sua chave publicável Stripe
  static const String stripePublishableKey = 'pk_test_SEU_STRIPE_KEY';

  // ─── Google Maps ───────────────────────────────────────────
  // TODO: Substituir pela sua API Key do Google
  static const String googleMapsApiKey = 'SUA_GOOGLE_MAPS_API_KEY';

  // ─── Negócio ───────────────────────────────────────────────
  static const double defaultSearchRadiusKm = 20.0;
  static const double minSearchRadiusKm     = 5.0;
  static const double maxSearchRadiusKm     = 100.0;
  static const double platformFeePercent    = 0.10; // 10%
  static const int    trialDays             = 7;

  // ─── Categorias de Serviço ─────────────────────────────────
  static const List<ServiceCategory> categories = [
    ServiceCategory(id: 'eletricista',    label: 'Eletricista',    icon: '⚡'),
    ServiceCategory(id: 'encanamento',    label: 'Encanamento',    icon: '🔧'),
    ServiceCategory(id: 'pintura',        label: 'Pintura',        icon: '🎨'),
    ServiceCategory(id: 'marcenaria',     label: 'Marcenaria',     icon: '🪚'),
    ServiceCategory(id: 'limpeza',        label: 'Limpeza',        icon: '🧹'),
    ServiceCategory(id: 'jardinagem',     label: 'Jardinagem',     icon: '🌿'),
    ServiceCategory(id: 'ar_condicionado',label: 'Ar Condicionado',icon: '❄️'),
    ServiceCategory(id: 'mudanca',        label: 'Mudança',        icon: '📦'),
    ServiceCategory(id: 'reformas',       label: 'Reformas',       icon: '🏗️'),
    ServiceCategory(id: 'informatica',    label: 'Informática',    icon: '💻'),
    ServiceCategory(id: 'seguranca',      label: 'Segurança',      icon: '🔒'),
    ServiceCategory(id: 'outros',         label: 'Outros',         icon: '🔨'),
  ];
}

class ServiceCategory {
  final String id;
  final String label;
  final String icon;
  const ServiceCategory({
    required this.id,
    required this.label,
    required this.icon,
  });
}
