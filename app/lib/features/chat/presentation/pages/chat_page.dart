import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_chat_ui/flutter_chat_ui.dart';
import 'package:flutter_chat_types/flutter_chat_types.dart' as types;
import 'package:uuid/uuid.dart';

class ChatPage extends ConsumerStatefulWidget {
  final String chatId;
  const ChatPage({super.key, required this.chatId});

  @override
  ConsumerState<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends ConsumerState<ChatPage> {
  final List<types.Message> _messages = [];
  late final RealtimeChannel _channel;
  final _supabase = Supabase.instance.client;
  late final String _myId;
  
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _myId = _supabase.auth.currentUser!.id;
    _loadMessages();
    _subscribeToChat();
  }

  Future<void> _loadMessages() async {
    final response = await _supabase
        .from('messages')
        .select('*')
        .eq('chat_id', widget.chatId)
        .order('created_at', ascending: false);
    
    final List<dynamic> data = response;
    setState(() {
      _messages.addAll(data.map((m) => types.TextMessage(
        author: types.User(id: m['sender_id']),
        id: m['id'],
        text: m['content'],
        createdAt: DateTime.parse(m['created_at']).millisecondsSinceEpoch,
      )));
      _loading = false;
    });
  }

  void _subscribeToChat() {
    _channel = _supabase.channel('public:messages:chat_id=eq.${widget.chatId}')
      .onPostgresChanges(
        event: PostgresChangeEvent.insert,
        schema: 'public',
        table: 'messages',
        filter: 'chat_id=eq.${widget.chatId}',
        callback: (payload) {
          final newMessage = payload.newRecord;
          if (newMessage['sender_id'] != _myId) {
            setState(() {
              _messages.insert(0, types.TextMessage(
                author: types.User(id: newMessage['sender_id']),
                id: newMessage['id'],
                text: newMessage['content'],
                createdAt: DateTime.parse(newMessage['created_at']).millisecondsSinceEpoch,
              ));
            });
          }
        },
      )
      .subscribe();
  }

  Future<void> _handleSendPressed(types.PartialText message) async {
    final textMessage = types.TextMessage(
      author: types.User(id: _myId),
      createdAt: DateTime.now().millisecondsSinceEpoch,
      id: const Uuid().v4(),
      text: message.text,
    );

    setState(() {
      _messages.insert(0, textMessage);
    });

    try {
      await _supabase.from('messages').insert({
        'chat_id': widget.chatId,
        'sender_id': _myId,
        'content': message.text,
      });
    } catch (e) {
      // Handle error
    }
  }

  @override
  void dispose() {
    _supabase.removeChannel(_channel);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Chat')),
      body: _loading 
        ? const Center(child: CircularProgressIndicator())
        : Chat(
            messages: _messages,
            onSendPressed: _handleSendPressed,
            user: types.User(id: _myId),
            theme: DefaultChatTheme(
              primaryColor: Theme.of(context).primaryColor,
              inputBackgroundColor: Colors.grey.withOpacity(0.1),
              backgroundColor: Theme.of(context).scaffoldBackgroundColor,
            ),
          ),
    );
  }
}
