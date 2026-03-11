import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tourapp/main.dart';

void main() {
  testWidgets('TourSafe app smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const TourSafeApp());
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
