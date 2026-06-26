'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Avatar,
    Badge,
    Button,
    Dropdown,
    Empty,
    Image,
    Input,
    Spin,
    Tooltip,
    Typography,
    Upload,
} from 'antd';
import type { MenuProps, UploadProps } from 'antd';
import {
    File as FileIcon,
    MoreVertical,
    Paperclip,
    Pencil,
    Search,
    Send,
    Smile,
    Trash2,
    User as UserIcon,
    X,
} from 'lucide-react';
import { createClient, type RealtimeChannel } from '@supabase/supabase-js';

const { Title, Text } = Typography;

// ---------- Simple date formatter (fallback) ----------
function formatDate(iso: string): string {
    try {
        const d = new Date(iso);
        return d.toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    } catch {
        return iso;
    }
}

// ---------- Types ----------
type ConversationType = 'private' | 'group' | 'system';
type MessageType = 'text' | 'image' | 'file' | 'system';

interface ConversationListItem {
    id: string;
    title: string;
    avatarUrl: string | null;
    type: ConversationType;
    otherUserId?: string | null;
    lastMessage: string | null;
    lastMessageAt: string | null;
    unreadCount: number;
    memberCount: number;
}

interface ConversationMember {
    id: string;
    userId: string;
    fullName: string;
    avatarUrl: string | null;
    role: string;
}

interface ConversationDetail {
    id: string;
    type: ConversationType;
    title: string | null;
    avatarUrl: string | null;
    members: ConversationMember[];
    memberCount: number;
}

interface ReplyPreview {
    id: string;
    senderName: string;
    content: string;
}

interface MessageRecord {
    id: string;
    conversationId: string;
    senderId: string | null;
    senderName: string;
    type: MessageType;
    content: string;
    attachmentUrl: string | null;
    attachmentName: string | null;
    attachmentSize: number | null;
    replyToId: string | null;
    replyPreview: ReplyPreview | null;
    isEdited: boolean;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
}

interface MessagesPage_ {
    messages: MessageRecord[];
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
}

interface CurrentUser {
    id: string;
    fullName: string;
}

// ---------- Supabase client (safe init) ----------
function createSafeSupabaseClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
        console.warn('Supabase credentials missing, using dummy client');
        return null;
    }
    return createClient(url, key);
}

const supabase = createSafeSupabaseClient();

// ---------- API helper ----------
async function unwrapApi<T>(res: Response): Promise<T> {
    let body: unknown = null;
    try {
        body = await res.json();
    } catch (err) {
        console.error('[unwrapApi] JSON parse error:', err);
        if (res.ok) return {} as T;
        throw new Error(`HTTP ${res.status}: ${res.statusText || 'Request failed'}`);
    }
    const asRecord = body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
    if (!res.ok) {
        const message =
            (asRecord?.message as string) ||
            (asRecord?.error as string) ||
            `Request failed (HTTP ${res.status})`;
        console.error('[API ERROR]', res.url, res.status, body);
        throw new Error(message);
    }
    if (asRecord && 'data' in asRecord) {
        return asRecord.data as T;
    }
    return body as T;
}

// ---------- Error Boundary ----------
class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean; error: Error | null }
> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }
    componentDidCatch(error: Error) {
        console.error('[ErrorBoundary] Caught:', error);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: 40, textAlign: 'center' }}>
                    <Title level={3}>Something went wrong</Title>
                    <Text type="secondary">{this.state.error?.message || 'Unknown error'}</Text>
                    <br />
                    <Button type="primary" onClick={() => window.location.reload()} style={{ marginTop: 16 }}>
                        Reload page
                    </Button>
                </div>
            );
        }
        return this.props.children;
    }
}

// ---------- Main Component ----------
function MessagesPageContent() {
    // State
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const [conversations, setConversations] = useState<ConversationListItem[]>([]);
    const [conversationSearch, setConversationSearch] = useState('');
    const [loadingConversations, setLoadingConversations] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [conversationDetail, setConversationDetail] = useState<ConversationDetail | null>(null);

    const [messages, setMessages] = useState<MessageRecord[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);

    const [inputValue, setInputValue] = useState('');
    const [replyTarget, setReplyTarget] = useState<MessageRecord | null>(null);
    const [editingMessage, setEditingMessage] = useState<MessageRecord | null>(null);

    const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
    const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
    const [brokenAvatarUrls, setBrokenAvatarUrls] = useState<Set<string>>(new Set());

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const channelRef = useRef<RealtimeChannel | null>(null);
    const presenceChannelRef = useRef<RealtimeChannel | null>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastTypingSentAtRef = useRef<number>(0);

    // ---------- Bootstrap ----------
    useEffect(() => {
        let mounted = true;
        const init = async () => {
            try {
                setIsInitializing(true);
                setError(null);
                if (!supabase) {
                    console.warn('Supabase unavailable, using mock user');
                    if (mounted) {
                        setCurrentUser({ id: 'mock-user', fullName: 'Mock User' });
                        setConversations([
                            {
                                id: 'mock-1',
                                title: 'Mock Conversation',
                                avatarUrl: null,
                                type: 'private',
                                lastMessage: 'Welcome to mock mode!',
                                lastMessageAt: new Date().toISOString(),
                                unreadCount: 0,
                                memberCount: 2,
                            },
                        ]);
                    }
                    setIsInitializing(false);
                    return;
                }
                const res = await fetch('/api/auth/me');
                if (!res.ok) {
                    if (res.status === 401) {
                        console.log('Not authenticated');
                        if (mounted) setCurrentUser(null);
                    } else {
                        throw new Error(`Auth failed: ${res.status}`);
                    }
                } else {
                    const me = await unwrapApi<{ id: string; fullName: string }>(res);
                    if (mounted) setCurrentUser({ id: me.id, fullName: me.fullName });
                }
            } catch (err) {
                console.error('[init]', err);
                if (mounted) {
                    setError(err instanceof Error ? err.message : 'Failed to initialize');
                    setCurrentUser({ id: 'fallback-user', fullName: 'User (Fallback)' });
                }
            } finally {
                if (mounted) setIsInitializing(false);
            }
        };
        init();
        return () => { mounted = false; };
    }, []);

    // ---------- Load conversations ----------
    const loadConversations = useCallback(async () => {
        if (!currentUser) return;
        setLoadingConversations(true);
        try {
            const res = await fetch(`/api/conversations?userId=${currentUser.id}`);
            const data = await unwrapApi<ConversationListItem[]>(res);
            setConversations(data || []);
        } catch (err) {
            console.error('[loadConversations]', err);
            if (process.env.NODE_ENV === 'development') {
                setConversations([
                    {
                        id: 'dev-1',
                        title: 'Dev Chat',
                        avatarUrl: null,
                        type: 'private',
                        lastMessage: 'Dev mode',
                        lastMessageAt: new Date().toISOString(),
                        unreadCount: 0,
                        memberCount: 2,
                    },
                ]);
            }
        } finally {
            setLoadingConversations(false);
        }
    }, [currentUser]);

    useEffect(() => {
        if (currentUser && !isInitializing) loadConversations();
    }, [currentUser, isInitializing, loadConversations]);

    // ---------- Load detail ----------
    const loadConversationDetail = useCallback(async (conversationId: string) => {
        try {
            const res = await fetch(`/api/conversations/${conversationId}`);
            const data = await unwrapApi<ConversationDetail>(res);
            setConversationDetail(data);
        } catch (err) {
            console.error('[loadConversationDetail]', err);
            if (process.env.NODE_ENV === 'development') {
                setConversationDetail({
                    id: conversationId,
                    type: 'private',
                    title: 'Mock Detail',
                    avatarUrl: null,
                    members: [
                        { id: '1', userId: 'mock-user', fullName: 'Mock User', avatarUrl: null, role: 'member' },
                        { id: '2', userId: 'other', fullName: 'Other', avatarUrl: null, role: 'member' },
                    ],
                    memberCount: 2,
                });
            }
        }
    }, []);

    // ---------- Load messages ----------
    const loadMessages = useCallback(async (conversationId: string) => {
        if (!currentUser) return;
        setLoadingMessages(true);
        try {
            const res = await fetch(
                `/api/conversations/${conversationId}/messages?userId=${currentUser.id}&page=1&limit=50`
            );
            const data = await unwrapApi<MessagesPage_>(res);
            setMessages(data?.messages || []);
        } catch (err) {
            console.error('[loadMessages]', err);
            setMessages([]);
        } finally {
            setLoadingMessages(false);
        }
    }, [currentUser]);

    // ---------- Mark read ----------
    const markConversationRead = useCallback(async (conversationId: string) => {
        if (!currentUser) return;
        try {
            const res = await fetch(`/api/conversations/${conversationId}/read`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.id }),
            });
            if (res.ok || res.status === 404) {
                setConversations((prev) =>
                    prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
                );
            }
        } catch (err) {
            console.warn('[markConversationRead]', err);
        }
    }, [currentUser]);

    // ---------- Select conversation ----------
    const selectConversation = useCallback((conversationId: string) => {
        setSelectedConversationId(conversationId);
        setReplyTarget(null);
        setEditingMessage(null);
        setInputValue('');
        setMessages([]);
        loadConversationDetail(conversationId);
        loadMessages(conversationId);
        markConversationRead(conversationId);
    }, [loadConversationDetail, loadMessages, markConversationRead]);

    // ---------- Resolve sender name ----------
    const memberNameById = useMemo(() => {
        const map = new Map<string, string>();
        for (const m of conversationDetail?.members || []) {
            map.set(m.userId, m.fullName);
        }
        return map;
    }, [conversationDetail]);

    const resolveSenderName = useCallback((senderId: string | null): string => {
        if (!senderId) return 'Unknown user';
        if (senderId === currentUser?.id) return currentUser.fullName;
        return memberNameById.get(senderId) || 'Unknown user';
    }, [memberNameById, currentUser]);

    // ---------- Realtime ----------
    useEffect(() => {
        if (!selectedConversationId || !supabase) return;
        const channel = supabase
            .channel(`conversation-${selectedConversationId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedConversationId}` },
                (payload) => {
                    const row = payload.new as Record<string, unknown>;
                    const senderId = (row.sender_id as string | null) ?? null;
                    setMessages((prev) => {
                        if (prev.some((m) => m.id === row.id)) return prev;
                        return [
                            ...prev,
                            {
                                id: row.id as string,
                                conversationId: row.conversation_id as string,
                                senderId,
                                senderName: resolveSenderName(senderId),
                                type: row.type as MessageType,
                                content: row.content as string,
                                attachmentUrl: (row.attachment_url as string | null) ?? null,
                                attachmentName: (row.attachment_name as string | null) ?? null,
                                attachmentSize: (row.attachment_size as number | null) ?? null,
                                replyToId: (row.reply_to_id as string | null) ?? null,
                                replyPreview: null,
                                isEdited: Boolean(row.is_edited),
                                isDeleted: Boolean(row.is_deleted),
                                createdAt: row.created_at as string,
                                updatedAt: row.updated_at as string,
                            },
                        ];
                    });
                    if (senderId !== currentUser?.id) {
                        markConversationRead(selectedConversationId);
                    } else {
                        loadConversations();
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedConversationId}` },
                (payload) => {
                    const row = payload.new as Record<string, unknown>;
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === row.id
                                ? {
                                    ...m,
                                    content: row.is_deleted ? 'Message deleted' : (row.content as string),
                                    isEdited: Boolean(row.is_edited),
                                    isDeleted: Boolean(row.is_deleted),
                                    attachmentUrl: row.is_deleted ? null : ((row.attachment_url as string | null) ?? m.attachmentUrl),
                                    updatedAt: row.updated_at as string,
                                }
                                : m
                        )
                    );
                }
            )
            .on('broadcast', { event: 'typing' }, (payload) => {
                const { userId, fullName, isTyping } = payload.payload as { userId: string; fullName: string; isTyping: boolean };
                if (userId === currentUser?.id) return;
                setTypingUsers((prev) => {
                    const next = { ...prev };
                    if (isTyping) next[userId] = fullName;
                    else delete next[userId];
                    return next;
                });
            })
            .subscribe((status, err) => {
                if (status === 'CHANNEL_ERROR' || err) {
                    console.error('[realtime error]', selectedConversationId, err);
                }
            });
        channelRef.current = channel;
        return () => {
            supabase.removeChannel(channel).catch(console.error);
            channelRef.current = null;
            setTypingUsers({});
        };
    }, [selectedConversationId, currentUser?.id, resolveSenderName, markConversationRead, loadConversations]);

    // ---------- Presence ----------
    useEffect(() => {
        if (!currentUser || !supabase) return;
        const channel = supabase.channel('online-users', { config: { presence: { key: currentUser.id } } });
        channel
            .on('presence', { event: 'sync', () => {
                const state = channel.presenceState();
                setOnlineUserIds(new Set(Object.keys(state)));
            } })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    channel.track({ userId: currentUser.id, fullName: currentUser.fullName }).catch(console.error);
                }
            });
        presenceChannelRef.current = channel;
        return () => {
            supabase.removeChannel(channel).catch(console.error);
            presenceChannelRef.current = null;
        };
    }, [currentUser]);

    // ---------- Typing ----------
    const broadcastTyping = useCallback((isTyping: boolean) => {
        if (!channelRef.current || !currentUser) return;
        channelRef.current.send({
            type: 'broadcast',
            event: 'typing',
            payload: { userId: currentUser.id, fullName: currentUser.fullName, isTyping },
        }).catch(console.error);
    }, [currentUser]);

    const handleInputChange = (value: string) => {
        setInputValue(value);
        if (!currentUser) return;
        const now = Date.now();
        if (now - lastTypingSentAtRef.current > 1500) {
            lastTypingSentAtRef.current = now;
            broadcastTyping(true);
        }
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => broadcastTyping(false), 2000);
    };

    // ---------- Send / Edit / Delete ----------
    const resetComposer = () => {
        setInputValue('');
        setReplyTarget(null);
        setEditingMessage(null);
    };

    const sendMessage = useCallback(async (payload: {
        type: MessageType;
        content?: string;
        attachmentUrl?: string;
        attachmentName?: string;
        attachmentSize?: number;
    }) => {
        if (!selectedConversationId || !currentUser) return;
        setSending(true);
        try {
            const res = await fetch(`/api/conversations/${selectedConversationId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    senderId: currentUser.id,
                    replyToId: replyTarget?.id,
                    ...payload,
                }),
            });
            const created = await unwrapApi<MessageRecord>(res);
            setMessages((prev) => (prev.some((m) => m.id === created.id) ? prev : [...prev, created]));
            loadConversations();
            resetComposer();
            broadcastTyping(false);
        } catch (err) {
            console.error('[sendMessage]', err);
        } finally {
            setSending(false);
        }
    }, [selectedConversationId, currentUser, replyTarget, broadcastTyping, loadConversations]);

    const updateMessage = useCallback(async (messageId: string, content: string) => {
        if (!currentUser) return;
        try {
            const res = await fetch(`/api/messages/${messageId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.id, content }),
            });
            if (res.ok) {
                const updated = await unwrapApi<{ content: string }>(res);
                setMessages((prev) =>
                    prev.map((m) => (m.id === messageId ? { ...m, content: updated.content, isEdited: true } : m))
                );
                resetComposer();
            } else if (res.status === 404) {
                setMessages((prev) =>
                    prev.map((m) => (m.id === messageId ? { ...m, content, isEdited: true } : m))
                );
                resetComposer();
            }
        } catch (err) {
            console.error('[updateMessage]', err);
        }
    }, [currentUser]);

    const deleteMessage = useCallback(async (messageId: string) => {
        if (!currentUser) return;
        try {
            const res = await fetch(`/api/messages/${messageId}?userId=${currentUser.id}`, { method: 'DELETE' });
            if (res.ok || res.status === 404) {
                setMessages((prev) =>
                    prev.map((m) => (m.id === messageId ? { ...m, content: 'Message deleted', isDeleted: true } : m))
                );
            }
        } catch (err) {
            console.error('[deleteMessage]', err);
        }
    }, [currentUser]);

    const handleSend = () => {
        if (editingMessage) {
            if (!inputValue.trim()) return;
            updateMessage(editingMessage.id, inputValue.trim());
        } else {
            if (!inputValue.trim()) return;
            sendMessage({ type: 'text', content: inputValue.trim() });
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // ---------- Upload ----------
    const buildUploadProps = (kind: 'image' | 'file'): UploadProps => ({
        showUploadList: false,
        accept: kind === 'image' ? 'image/*' : undefined,
        beforeUpload: async (file) => {
            try {
                const formData = new FormData();
                formData.append('file', file);
                const res = await fetch('/api/uploads', { method: 'POST', body: formData });
                if (res.ok) {
                    const result = await unwrapApi<{ url: string }>(res);
                    await sendMessage({
                        type: kind,
                        attachmentUrl: result.url,
                        attachmentName: file.name,
                        attachmentSize: file.size,
                        content: kind === 'image' ? 'Image' : file.name,
                    });
                } else if (res.status === 404) {
                    const reader = new FileReader();
                    reader.onload = async (e) => {
                        const dataUrl = e.target?.result as string;
                        await sendMessage({
                            type: kind,
                            attachmentUrl: dataUrl,
                            attachmentName: file.name,
                            attachmentSize: file.size,
                            content: kind === 'image' ? 'Image' : file.name,
                        });
                    };
                    reader.readAsDataURL(file);
                } else {
                    throw new Error(`Upload failed: ${res.status}`);
                }
            } catch (err) {
                console.error('[upload]', err);
            }
            return false;
        },
    });

    // ---------- Derived ----------
    const filteredConversations = useMemo(
        () => conversations.filter((c) => c.title.toLowerCase().includes(conversationSearch.toLowerCase())),
        [conversations, conversationSearch]
    );
    const selectedConversation = useMemo(
        () => conversations.find((c) => c.id === selectedConversationId) ?? null,
        [conversations, selectedConversationId]
    );
    const otherMember = useMemo(() => {
        if (!conversationDetail || conversationDetail.type !== 'private' || !currentUser) return null;
        return conversationDetail.members.find((m) => m.userId !== currentUser.id) ?? null;
    }, [conversationDetail, currentUser]);
    const isOtherOnline = otherMember ? onlineUserIds.has(otherMember.userId) : false;
    const typingNames = Object.values(typingUsers);

    const avatarPropsFor = (url: string | null): { src?: string; onError?: () => boolean } =>
        url && !brokenAvatarUrls.has(url)
            ? {
                src: url,
                onError: () => {
                    setBrokenAvatarUrls((prev) => new Set(prev).add(url));
                    return false;
                },
            }
            : {};

    const messageMenu = (msg: MessageRecord): MenuProps['items'] => [
        {
            key: 'reply',
            label: 'Reply',
            onClick: () => {
                setReplyTarget(msg);
                setEditingMessage(null);
            },
        },
        ...(msg.senderId === currentUser?.id && !msg.isDeleted
            ? [
                {
                    key: 'edit',
                    label: 'Edit',
                    icon: <Pencil size={14} />,
                    onClick: () => {
                        setEditingMessage(msg);
                        setReplyTarget(null);
                        setInputValue(msg.content);
                    },
                },
                {
                    key: 'delete',
                    label: 'Delete',
                    icon: <Trash2 size={14} />,
                    danger: true,
                    onClick: () => deleteMessage(msg.id),
                },
            ]
            : []),
    ];

    // ---------- Render states ----------
    if (isInitializing) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
                <Spin size="large" />
                <Text>Loading messages...</Text>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: 40, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <div style={{ color: '#ff4d4f', fontSize: 48 }}>⚠️</div>
                <Title level={3}>{error}</Title>
                <Text type="secondary">Please try refreshing the page</Text>
                <Button type="primary" onClick={() => window.location.reload()}>Refresh Page</Button>
            </div>
        );
    }

    // ---------- Main render ----------
    return (
        <div className="space-y-4">
            <div>
                <Title level={2} style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>
                    Messages
                </Title>
                <Text type="secondary">Realtime conversations with your mentors and disciples</Text>
            </div>

            <div
                style={{
                    display: 'flex',
                    height: 'calc(100vh - 220px)',
                    minHeight: 480,
                    border: '1px solid #d0d7de',
                    borderRadius: 8,
                    overflow: 'hidden',
                    background: '#fff',
                }}
            >
                {/* Left panel */}
                <div style={{ width: 300, borderRight: '1px solid #d0d7de', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '12px 12px 8px' }}>
                        <Input
                            prefix={<Search size={14} />}
                            placeholder="Search conversations..."
                            value={conversationSearch}
                            onChange={(e) => setConversationSearch(e.target.value)}
                            size="small"
                            allowClear
                        />
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {loadingConversations ? (
                            <div style={{ padding: 20, textAlign: 'center' }}><Spin size="small" /></div>
                        ) : filteredConversations.length === 0 ? (
                            <div style={{ padding: 24 }}>
                                <Empty description={conversationSearch ? 'No conversations found' : 'No conversations yet'} />
                            </div>
                        ) : (
                            filteredConversations.map((conversation) => {
                                const isOnline = conversation.type === 'private' && !!conversation.otherUserId && onlineUserIds.has(conversation.otherUserId);
                                return (
                                    <div
                                        key={conversation.id}
                                        onClick={() => selectConversation(conversation.id)}
                                        style={{
                                            padding: '10px 14px',
                                            cursor: 'pointer',
                                            background: selectedConversationId === conversation.id ? '#f0f6ff' : 'transparent',
                                            borderLeft: selectedConversationId === conversation.id ? '3px solid #1677ff' : '3px solid transparent',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 10,
                                            transition: 'background 0.2s',
                                        }}
                                        onMouseEnter={(e) => {
                                            if (selectedConversationId !== conversation.id) e.currentTarget.style.background = '#f6f8fa';
                                        }}
                                        onMouseLeave={(e) => {
                                            if (selectedConversationId !== conversation.id) e.currentTarget.style.background = 'transparent';
                                        }}
                                    >
                                        <Badge dot={isOnline} status="success" offset={[-4, 28]}>
                                            <Avatar
                                                size={40}
                                                {...avatarPropsFor(conversation.avatarUrl)}
                                                icon={<UserIcon size={18} />}
                                                style={{ background: '#7F77DD', flexShrink: 0 }}
                                            >
                                                {conversation.title.charAt(0).toUpperCase()}
                                            </Avatar>
                                        </Badge>
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                                <span style={{ fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {conversation.title}
                                                </span>
                                                {conversation.lastMessageAt && (
                                                    <span style={{ fontSize: 10, color: '#8c959f', flexShrink: 0, marginLeft: 6 }}>
                                                        {formatDate(conversation.lastMessageAt)}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: 12, color: '#656d76', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {conversation.lastMessage ?? 'No messages yet'}
                                                </span>
                                                {conversation.unreadCount > 0 && (
                                                    <Badge count={conversation.unreadCount} size="small" style={{ marginLeft: 6 }} />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right panel */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {!selectedConversation ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#656d76' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 40, marginBottom: 8 }}>💬</div>
                                <div>Select a conversation to start chatting</div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid #d0d7de', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                                <Badge dot={isOtherOnline} status="success" offset={[-4, 24]}>
                                    <Avatar
                                        size={36}
                                        {...avatarPropsFor(selectedConversation.avatarUrl)}
                                        icon={<UserIcon size={16} />}
                                        style={{ background: '#7F77DD' }}
                                    >
                                        {selectedConversation.title.charAt(0).toUpperCase()}
                                    </Avatar>
                                </Badge>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{selectedConversation.title}</div>
                                    <div style={{ fontSize: 12, color: '#656d76' }}>
                                        {selectedConversation.type === 'private'
                                            ? (isOtherOnline ? 'Online' : 'Offline')
                                            : `${selectedConversation.memberCount} members`}
                                    </div>
                                </div>
                            </div>

                            {/* Messages */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: '#fafbfc' }}>
                                {loadingMessages ? (
                                    <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                                ) : messages.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: '#656d76', paddingTop: 40 }}>
                                        <div style={{ fontSize: 32, marginBottom: 8 }}>👋</div>
                                        <div>No messages yet. Say hello!</div>
                                    </div>
                                ) : (
                                    messages.map((msg) => {
                                        const isOwn = msg.senderId === currentUser?.id;
                                        const isSystem = msg.type === 'system';
                                        if (isSystem) {
                                            return (
                                                <div key={msg.id} style={{ textAlign: 'center', margin: '8px 0', fontSize: 12, color: '#8c959f' }}>
                                                    {msg.content}
                                                </div>
                                            );
                                        }
                                        return (
                                            <div
                                                key={msg.id}
                                                style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', marginBottom: 12 }}
                                            >
                                                <div style={{ maxWidth: '70%', display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                                                    {!isOwn && (
                                                        <div style={{ fontSize: 11, color: '#656d76', marginBottom: 2, paddingLeft: 4 }}>
                                                            {msg.senderName}
                                                        </div>
                                                    )}
                                                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, maxWidth: '100%' }}>
                                                        {isOwn && !msg.isDeleted && (
                                                            <Dropdown menu={{ items: messageMenu(msg) }} trigger={['click']}>
                                                                <Button type="text" size="small" icon={<MoreVertical size={14} />} style={{ opacity: 0.5 }} />
                                                            </Dropdown>
                                                        )}
                                                        <div style={{ maxWidth: '100%' }}>
                                                            {msg.replyPreview && (
                                                                <div
                                                                    style={{
                                                                        fontSize: 11,
                                                                        color: '#656d76',
                                                                        background: '#f6f8fa',
                                                                        borderLeft: '2px solid #1677ff',
                                                                        padding: '2px 8px',
                                                                        marginBottom: 2,
                                                                        borderRadius: 4,
                                                                        maxWidth: '100%',
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        whiteSpace: 'nowrap',
                                                                    }}
                                                                >
                                                                    <strong>{msg.replyPreview.senderName}</strong>: {msg.replyPreview.content}
                                                                </div>
                                                            )}
                                                            <div
                                                                style={{
                                                                    padding: msg.type === 'image' && !msg.isDeleted ? 4 : '8px 12px',
                                                                    borderRadius: isOwn ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                                                                    background: msg.isDeleted
                                                                        ? '#f1f3f5'
                                                                        : isOwn
                                                                            ? '#1677ff'
                                                                            : '#f1f3f5',
                                                                    color: msg.isDeleted
                                                                        ? '#8c959f'
                                                                        : isOwn
                                                                            ? '#fff'
                                                                            : '#24292f',
                                                                    fontSize: 14,
                                                                    fontStyle: msg.isDeleted ? 'italic' : 'normal',
                                                                    overflow: 'hidden',
                                                                    wordWrap: 'break-word',
                                                                    maxWidth: '100%',
                                                                }}
                                                            >
                                                                {msg.type === 'image' && msg.attachmentUrl && !msg.isDeleted ? (
                                                                    <Image
                                                                        src={msg.attachmentUrl}
                                                                        alt={msg.attachmentName ?? 'image'}
                                                                        width={220}
                                                                        style={{ borderRadius: 8, display: 'block' }}
                                                                    />
                                                                ) : msg.type === 'file' && msg.attachmentUrl && !msg.isDeleted ? (
                                                                    <a
                                                                        href={msg.attachmentUrl}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        style={{ color: isOwn ? '#fff' : '#1677ff', display: 'flex', alignItems: 'center', gap: 6 }}
                                                                    >
                                                                        <FileIcon size={14} /> {msg.attachmentName ?? 'Download file'}
                                                                    </a>
                                                                ) : (
                                                                    <span>{msg.content}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {!isOwn && !msg.isDeleted && (
                                                            <Dropdown menu={{ items: messageMenu(msg) }} trigger={['click']}>
                                                                <Button type="text" size="small" icon={<MoreVertical size={14} />} style={{ opacity: 0.5 }} />
                                                            </Dropdown>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: 10, color: '#8c959f', marginTop: 2, padding: '0 4px' }}>
                                                        {formatDate(msg.createdAt)}
                                                        {msg.isEdited && !msg.isDeleted ? ' · edited' : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Typing indicator */}
                            {typingNames.length > 0 && (
                                <div style={{ padding: '4px 16px', fontSize: 12, color: '#656d76', fontStyle: 'italic', flexShrink: 0 }}>
                                    {typingNames.join(', ')} {typingNames.length === 1 ? 'is' : 'are'} typing...
                                </div>
                            )}

                            {/* Reply / edit preview */}
                            {(replyTarget || editingMessage) && (
                                <div
                                    style={{
                                        margin: '8px 16px 0',
                                        padding: '6px 10px',
                                        background: '#f6f8fa',
                                        borderRadius: 6,
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        fontSize: 12,
                                        flexShrink: 0,
                                    }}
                                >
                                    <span>
                                        {editingMessage ? (
                                            <>
                                                <Pencil size={12} style={{ marginRight: 4, verticalAlign: -1 }} />
                                                Editing message
                                            </>
                                        ) : (
                                            <>
                                                Replying to <strong>{replyTarget?.senderName}</strong>: {replyTarget?.content}
                                            </>
                                        )}
                                    </span>
                                    <Button type="text" size="small" icon={<X size={14} />} onClick={resetComposer} />
                                </div>
                            )}

                            {/* Composer */}
                            <div style={{ padding: '12px 16px', borderTop: '1px solid #d0d7de', display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0, background: '#fff' }}>
                                <Upload {...buildUploadProps('image')}>
                                    <Tooltip title="Upload image">
                                        <Button icon={<FileIcon size={16} />} />
                                    </Tooltip>
                                </Upload>
                                <Upload {...buildUploadProps('file')}>
                                    <Tooltip title="Upload file">
                                        <Button icon={<Paperclip size={16} />} />
                                    </Tooltip>
                                </Upload>
                                <Tooltip title="Emoji (coming soon)">
                                    <Button icon={<Smile size={16} />} disabled />
                                </Tooltip>
                                <Input.TextArea
                                    value={inputValue}
                                    onChange={(e) => handleInputChange(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Type a message... (Shift+Enter for newline)"
                                    autoSize={{ minRows: 1, maxRows: 4 }}
                                    style={{ flex: 1 }}
                                    disabled={sending}
                                />
                                <Button
                                    type="primary"
                                    icon={<Send size={16} />}
                                    onClick={handleSend}
                                    loading={sending}
                                    disabled={!inputValue.trim() || sending}
                                >
                                    {editingMessage ? 'Save' : 'Send'}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ---------- Export với ErrorBoundary ----------
export default function MessagesPage() {
    return (
        <ErrorBoundary>
            <MessagesPageContent />
        </ErrorBoundary>
    );
}
