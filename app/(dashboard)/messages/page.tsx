'use client';
import { useRef, useState } from 'react';
import {
    App,
    Avatar,
    Badge,
    Button,
    Input,
    Tag,
    Typography,
} from 'antd';
import {
    PaperClipOutlined,
    SearchOutlined,
    SendOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { MESSAGES, USERS } from '@/lib/demoData';
const { Title, Text } = Typography;
type MessageType = (typeof MESSAGES)[number];
const CONTACTS = USERS.slice(0, 8).map((u, index) => ({
    id: u.id,
    name: u.name,
    branch: u.branch,
    unread: index % 4,
    lastMessage: 'Click to start conversation',
    time: '09:20',
}));
export default function MessagesPage() {
    const { notification } = App.useApp();
    const [selectedContact, setSelectedContact] = useState(CONTACTS[0]);
    const [messages, setMessages] = useState<MessageType[]>(MESSAGES);
    const [contactSearch, setContactSearch] = useState('');
    const [inputValue, setInputValue] = useState('');
    const endRef = useRef<HTMLDivElement>(null);
    const filteredContacts = CONTACTS.filter((contact) =>
        contact.name.toLowerCase().includes(contactSearch.toLowerCase())
    );
    const handleSend = () => {
        if (!inputValue.trim()) return;
        const newMessage: MessageType = {
            id: String(Date.now()),
            senderId: 'current',
            senderName: 'You',
            content: inputValue.trim(),
            timestamp: new Date().toLocaleString('vi-VN'),
            isOwn: true,
        };
        setMessages((prev) => [...prev, newMessage]);
        setInputValue('');
        setTimeout(() => {
            endRef.current?.scrollIntoView({
                behavior: 'smooth',
            });
            notification.success({
                message: 'Message sent',
                description: 'Email notification has been queued.',
                placement: 'topRight',
            });
        }, 100);
    };
    return (
        <div className="h-[calc(100vh-120px)] flex flex-col">
            {/* PAGE HEADER */}
            {/* <div className="mb-4">
                <Title
                    level={3}
                >
                    Messages
                </Title>
                <Text type="secondary">
                    Communicate with mentors and disciples
                </Text>
            </div> */}
            {/* WORKSPACE */}
            <div
                className="flex flex-1 overflow-hidden"
                style={{
                    border: '1px solid #e5e7eb',
                    background: '#ffffff',
                }}
            >
                {/* CONTACT SIDEBAR */}
                <div
                    className="hidden md:flex flex-col"
                    style={{
                        width: 280,
                        borderRight: '1px solid #e5e7eb',
                        background: '#fafafa',
                    }}
                >
                    {/* SEARCH */}
                    <div
className="p-3"
                        style={{
                            borderBottom: '1px solid #e5e7eb',
                        }}
                    >
                        <Input
                            allowClear
                            value={contactSearch}
                            onChange={(e) =>
                                setContactSearch(e.target.value)
                            }
                            placeholder="Search contacts..."
                            prefix={<SearchOutlined />}
                        />
                    </div>
                    {/* CONTACTS */}
                    <div className="flex-1 overflow-y-auto">
                        {filteredContacts.map((contact) => {
                            const active =
                                selectedContact.id === contact.id;
                            return (
                                <div
                                    key={contact.id}
                                    onClick={() =>
                                        setSelectedContact(contact)
                                    }
                                    className="cursor-pointer transition-colors"
                                    style={{
                                        padding: '10px 12px',
                                        background: active
                                            ? '#f6f8fa'
                                            : undefined,
                                        borderRight: active
                                            ? '2px solid #1677ff'
                                            : undefined,
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        <Badge
                                            count={contact.unread}
                                            size="small"
                                        >
                                            <Avatar
                                                size={32}
                                                icon={<UserOutlined />}
                                            />
                                        </Badge>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium truncate">
                                                    {contact.name}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    {contact.time}
                                                </span>
                                            </div>
<div className="text-xs text-gray-500 truncate">
                                                {contact.lastMessage}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                {/* CHAT AREA */}
                <div className="flex flex-col flex-1 min-w-0">
                    {/* CHAT HEADER */}
                    <div
                        className="flex items-center justify-between px-4"
                        style={{
                            height: 56,
                            borderBottom: '1px solid #e5e7eb',
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <Avatar
                                size={32}
                                icon={<UserOutlined />}
                            />
                            <div>
                                <div className="text-sm font-medium">
                                    {selectedContact.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                    Mentor
                                </div>
                            </div>
                        </div>
                        <Tag color="success">
                            {selectedContact.branch}
                        </Tag>
                    </div>
                    {/* MESSAGE LIST */}
                    <div className="flex-1 overflow-y-auto px-4 py-4">
                        <div className="flex flex-col gap-4">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.isOwn
                                        ? 'justify-end'
                                        : 'justify-start'
                                        }`}
                                >
                                    <div
                                        style={{
                                            maxWidth: '70%',
                                        }}
                                    >
                                        {!msg.isOwn && (
                                            <div className="text-xs text-gray-500 mb-1">
                                                {msg.senderName}
                                            </div>
                                        )}
                                        <div
                                            style={{
                                                background: msg.isOwn
                                                    ? '#2F855A'
: '#FFFFFF',
                                                color: msg.isOwn
                                                    ? '#FFFFFF'
                                                    : '#1F2937',
                                                border: msg.isOwn
                                                    ? 'none'
                                                    : '1px solid #DDE5DD',
                                                borderRadius: 4,
                                                padding: '10px 14px',
                                                maxWidth: '100%',
                                                lineHeight: 1.5,
                                                boxShadow: msg.isOwn
                                                    ? '0 2px 8px rgba(47,133,90,0.12)'
                                                    : '0 1px 3px rgba(0,0,0,0.04)',
                                                wordBreak: 'break-word',
                                            }}
                                        >
                                            {msg.content}
                                        </div>
                                        <div
                                            className={`text-[11px] mt-1 ${msg.isOwn
                                                ? 'text-right'
                                                : ''
                                                }`}
                                            style={{
                                                color: '#8b949e',
                                            }}
                                        >
                                            {msg.timestamp}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={endRef} />
                        </div>
                    </div>
                    {/* COMPOSER */}
                    <div
                        className="p-3"
                        style={{
                            borderTop: '1px solid #e5e7eb',
                        }}
                    >
                        <div className="flex items-end gap-2">
                            <Input.TextArea
                                value={inputValue}
                                placeholder="Type a message..."
                                autoSize={{
                                    minRows: 1,
                                    maxRows: 5,
                                }}
                                onChange={(e) =>
                                    setInputValue(e.target.value)
                                }
                                onKeyDown={(e) => {
                                    if (
                                        e.key === 'Enter' &&
!e.shiftKey
                                    ) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                            />
                            <Button
                                icon={<PaperClipOutlined />}
                            />
                            <Button
                                type="primary"
                                icon={<SendOutlined />}
                                disabled={!inputValue.trim()}
                                onClick={handleSend}
                            >
                                Send
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}