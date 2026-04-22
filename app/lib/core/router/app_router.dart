import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../features/auth/presentation/pages/splash_page.dart';
import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/auth/presentation/pages/register_page.dart';
import '../../features/auth/presentation/pages/onboarding_page.dart';
import '../../features/client/presentation/pages/client_home_page.dart';
import '../../features/client/presentation/pages/create_request_page.dart';
import '../../features/client/presentation/pages/request_detail_page.dart';
import '../../features/client/presentation/pages/proposals_list_page.dart';
import '../../features/provider/presentation/pages/provider_home_page.dart';
import '../../features/provider/presentation/pages/request_feed_page.dart';
import '../../features/provider/presentation/pages/send_proposal_page.dart';
import '../../features/provider/presentation/pages/portfolio_page.dart';
import '../../features/provider/presentation/pages/subscription_page.dart';
import '../../features/chat/presentation/pages/chat_page.dart';
import '../../features/chat/presentation/pages/chats_list_page.dart';
import '../../features/shared/presentation/pages/profile_page.dart';

// Provider que expõe o GoRouter
final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/splash',
    redirect: (context, state) async {
      final session = Supabase.instance.client.auth.currentSession;
      final isOnAuth = state.matchedLocation.startsWith('/auth');
      final isSplash = state.matchedLocation == '/splash';

      if (isSplash) return null;

      if (session == null && !isOnAuth) {
        return '/auth/login';
      }
      return null;
    },
    routes: [
      // ─── Splash ─────────────────────────────────────────
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashPage(),
      ),

      // ─── Auth ────────────────────────────────────────────
      GoRoute(
        path: '/auth/login',
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: '/auth/register',
        builder: (context, state) => const RegisterPage(),
      ),
      GoRoute(
        path: '/auth/onboarding',
        builder: (context, state) {
          final role = state.uri.queryParameters['role'] ?? 'client';
          return OnboardingPage(role: role);
        },
      ),

      // ─── Cliente ─────────────────────────────────────────
      GoRoute(
        path: '/client',
        builder: (context, state) => const ClientHomePage(),
        routes: [
          GoRoute(
            path: 'create-request',
            builder: (context, state) => const CreateRequestPage(),
          ),
          GoRoute(
            path: 'request/:id',
            builder: (context, state) => RequestDetailPage(
              requestId: state.pathParameters['id']!,
            ),
          ),
          GoRoute(
            path: 'request/:id/proposals',
            builder: (context, state) => ProposalsListPage(
              requestId: state.pathParameters['id']!,
            ),
          ),
        ],
      ),

      // ─── Prestador ───────────────────────────────────────
      GoRoute(
        path: '/provider',
        builder: (context, state) => const ProviderHomePage(),
        routes: [
          GoRoute(
            path: 'feed',
            builder: (context, state) => const RequestFeedPage(),
          ),
          GoRoute(
            path: 'request/:id/proposal',
            builder: (context, state) => SendProposalPage(
              requestId: state.pathParameters['id']!,
            ),
          ),
          GoRoute(
            path: 'portfolio',
            builder: (context, state) => const PortfolioPage(),
          ),
          GoRoute(
            path: 'subscription',
            builder: (context, state) => const SubscriptionPage(),
          ),
        ],
      ),

      // ─── Chat ─────────────────────────────────────────────
      GoRoute(
        path: '/chats',
        builder: (context, state) => const ChatsListPage(),
      ),
      GoRoute(
        path: '/chat/:chatId',
        builder: (context, state) => ChatPage(
          chatId: state.pathParameters['chatId']!,
        ),
      ),

      // ─── Perfil ──────────────────────────────────────────
      GoRoute(
        path: '/profile',
        builder: (context, state) => const ProfilePage(),
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text('Página não encontrada: ${state.matchedLocation}'),
            TextButton(
              onPressed: () => context.go('/splash'),
              child: const Text('Voltar ao início'),
            ),
          ],
        ),
      ),
    ),
  );
});
