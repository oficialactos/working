import 'package:flutter/material.dart';

class AppTheme {
  AppTheme._();

  // ─── Palette ──────────────────────────────────────────────
  static const Color _primary       = Color(0xFF6C63FF); // roxo vibrante
  static const Color _primaryDark   = Color(0xFF4B44CC);
  static const Color _secondary     = Color(0xFF00D4AA); // verde-água
  static const Color _error         = Color(0xFFFF5252);
  static const Color _warning       = Color(0xFFFFB300);
  static const Color _success       = Color(0xFF00C853);

  static const Color _bgLight       = Color(0xFFF8F7FF);
  static const Color _surfaceLight  = Color(0xFFFFFFFF);
  static const Color _bgDark        = Color(0xFF0F0E1A);
  static const Color _surfaceDark   = Color(0xFF1C1B2E);
  static const Color _cardDark      = Color(0xFF252438);

  // ─── Light Theme ──────────────────────────────────────────
  static ThemeData get lightTheme => ThemeData(
    useMaterial3: true,
    fontFamily: 'Inter',
    brightness: Brightness.light,
    colorScheme: ColorScheme.fromSeed(
      seedColor: _primary,
      brightness: Brightness.light,
      primary: _primary,
      secondary: _secondary,
      error: _error,
      surface: _surfaceLight,
    ),
    scaffoldBackgroundColor: _bgLight,
    appBarTheme: const AppBarTheme(
      backgroundColor: _surfaceLight,
      foregroundColor: Color(0xFF1A1835),
      elevation: 0,
      centerTitle: true,
      titleTextStyle: TextStyle(
        fontFamily: 'Inter',
        fontSize: 17,
        fontWeight: FontWeight.w600,
        color: Color(0xFF1A1835),
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: _primary,
        foregroundColor: Colors.white,
        minimumSize: const Size(double.infinity, 52),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
        ),
        elevation: 0,
        textStyle: const TextStyle(
          fontFamily: 'Inter',
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: _primary,
        minimumSize: const Size(double.infinity, 52),
        side: const BorderSide(color: _primary, width: 1.5),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
        ),
        textStyle: const TextStyle(
          fontFamily: 'Inter',
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: const Color(0xFFF0EFFE),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: _primary, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: _error, width: 1.5),
      ),
      labelStyle: const TextStyle(color: Color(0xFF8A85A0), fontFamily: 'Inter'),
      hintStyle: const TextStyle(color: Color(0xFFB0ABD0), fontFamily: 'Inter'),
    ),
    cardTheme: CardTheme(
      color: _surfaceLight,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFFEBEAFF), width: 1),
      ),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: const Color(0xFFF0EFFE),
      selectedColor: _primary.withOpacity(0.15),
      labelStyle: const TextStyle(fontFamily: 'Inter', fontSize: 13),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: _surfaceLight,
      selectedItemColor: _primary,
      unselectedItemColor: Color(0xFFB0ABD0),
      type: BottomNavigationBarType.fixed,
      elevation: 0,
    ),
    textTheme: _textTheme(dark: false),
  );

  // ─── Dark Theme ───────────────────────────────────────────
  static ThemeData get darkTheme => ThemeData(
    useMaterial3: true,
    fontFamily: 'Inter',
    brightness: Brightness.dark,
    colorScheme: ColorScheme.fromSeed(
      seedColor: _primary,
      brightness: Brightness.dark,
      primary: _primary,
      secondary: _secondary,
      error: _error,
      surface: _surfaceDark,
    ),
    scaffoldBackgroundColor: _bgDark,
    appBarTheme: const AppBarTheme(
      backgroundColor: _bgDark,
      foregroundColor: Colors.white,
      elevation: 0,
      centerTitle: true,
      titleTextStyle: TextStyle(
        fontFamily: 'Inter',
        fontSize: 17,
        fontWeight: FontWeight.w600,
        color: Colors.white,
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: _primary,
        foregroundColor: Colors.white,
        minimumSize: const Size(double.infinity, 52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        elevation: 0,
        textStyle: const TextStyle(
          fontFamily: 'Inter',
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: _primary,
        minimumSize: const Size(double.infinity, 52),
        side: const BorderSide(color: _primary, width: 1.5),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: _cardDark,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF3A3860), width: 1),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: _primary, width: 2),
      ),
      labelStyle: TextStyle(color: Colors.white.withOpacity(0.5), fontFamily: 'Inter'),
      hintStyle: TextStyle(color: Colors.white.withOpacity(0.3), fontFamily: 'Inter'),
    ),
    cardTheme: CardTheme(
      color: _cardDark,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFF3A3860), width: 1),
      ),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: _cardDark,
      selectedColor: _primary.withOpacity(0.25),
      labelStyle: const TextStyle(fontFamily: 'Inter', fontSize: 13, color: Colors.white),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: _surfaceDark,
      selectedItemColor: _primary,
      unselectedItemColor: Color(0xFF6B6890),
      type: BottomNavigationBarType.fixed,
      elevation: 0,
    ),
    textTheme: _textTheme(dark: true),
  );

  static TextTheme _textTheme({required bool dark}) {
    final color = dark ? Colors.white : const Color(0xFF1A1835);
    final subtleColor = dark ? const Color(0xFF9490C0) : const Color(0xFF6B6890);
    return TextTheme(
      displayLarge:  TextStyle(fontFamily: 'Inter', fontSize: 32, fontWeight: FontWeight.w700, color: color),
      displayMedium: TextStyle(fontFamily: 'Inter', fontSize: 28, fontWeight: FontWeight.w700, color: color),
      headlineLarge: TextStyle(fontFamily: 'Inter', fontSize: 24, fontWeight: FontWeight.w700, color: color),
      headlineMedium:TextStyle(fontFamily: 'Inter', fontSize: 20, fontWeight: FontWeight.w600, color: color),
      titleLarge:    TextStyle(fontFamily: 'Inter', fontSize: 17, fontWeight: FontWeight.w600, color: color),
      titleMedium:   TextStyle(fontFamily: 'Inter', fontSize: 15, fontWeight: FontWeight.w500, color: color),
      bodyLarge:     TextStyle(fontFamily: 'Inter', fontSize: 16, fontWeight: FontWeight.w400, color: color),
      bodyMedium:    TextStyle(fontFamily: 'Inter', fontSize: 14, fontWeight: FontWeight.w400, color: color),
      bodySmall:     TextStyle(fontFamily: 'Inter', fontSize: 12, fontWeight: FontWeight.w400, color: subtleColor),
      labelLarge:    TextStyle(fontFamily: 'Inter', fontSize: 14, fontWeight: FontWeight.w600, color: color),
      labelMedium:   TextStyle(fontFamily: 'Inter', fontSize: 12, fontWeight: FontWeight.w500, color: subtleColor),
    );
  }

  // ─── Helpers públicos ─────────────────────────────────────
  static Color get primary       => _primary;
  static Color get primaryDark   => _primaryDark;
  static Color get secondary     => _secondary;
  static Color get error         => _error;
  static Color get warning       => _warning;
  static Color get success       => _success;
}
