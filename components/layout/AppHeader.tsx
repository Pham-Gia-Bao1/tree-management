'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    Layout,
    Button,
    Input,
    Avatar,
    Badge,
    Dropdown,
    Select,
    Tooltip,
    Typography,
    Divider,
} from 'antd';

import {
    SearchOutlined,
    BellOutlined,
    UserOutlined,
    SettingOutlined,
    BookOutlined,
    LogoutOutlined,
    CalendarOutlined,
} from '@ant-design/icons';

const { Header } = Layout;
const { Text } = Typography;

interface AppHeaderProps {
    sidebarWidth: number;
    onMobileMenuToggle: () => void;
}

const LANGS = [
    { value: 'VI', label: 'VI' },
    { value: 'EN', label: 'EN' },
    { value: 'KO', label: 'KO' },
];

const notifications = [
    {
        key: '1',
        title: 'New mentor request',
        description:
            'Nguyễn Văn A requested mentor access',
        time: '2 min ago',
        unread: true,
    },
    {
        key: '2',
        title: 'New disciple joined',
        description:
            'Trần Văn B joined Basic Discipleship',
        time: '15 min ago',
        unread: true,
    },
    {
        key: '3',
        title: 'Course completed',
        description:
            'Lesson 5 completed successfully',
        time: '1 hour ago',
        unread: false,
    },
];

export default function AppHeader({
    sidebarWidth,
}: AppHeaderProps) {
    const [lang, setLang] = useState('EN');

    const userMenuItems = [
        {
            key: 'profile',
            icon: <UserOutlined />,
            label: 'Profile',
        },
        {
            key: 'settings',
            icon: <SettingOutlined />,
            label: 'Settings',
        },
        {
            type: 'divider' as const,
        },
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            danger: true,
            label: 'Logout',
        },
    ];

    const notificationContent = (
        <div
            style={{
                width: 380,
                background: '#fff',
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow:
                    '0 10px 30px rgba(0,0,0,.08)',
            }}
        >
            <div
                style={{
                    padding: '16px',
                    display: 'flex',
                    justifyContent:
                        'space-between',
                    alignItems: 'center',
                }}
            >
                <Text strong>
                    Notifications
                </Text>

                <Button
                    type="link"
                    size="small"
                    style={{ padding: 0 }}
                >
                    Mark all read
                </Button>
            </div>

            <Divider
                style={{ margin: 0 }}
            />

            <div
                style={{
                    maxHeight: 420,
                    overflowY: 'auto',
                }}
            >
                {notifications.map((item) => (
                    <div
                        key={item.key}
                        style={{
                            padding:
                                '12px 16px',
                            cursor: 'pointer',
                            background:
                                item.unread
                                    ? '#EFF6FF'
                                    : '#fff',
                            borderBottom:
                                '1px solid #F3F4F6',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                gap: 12,
                            }}
                        >
                            <Avatar
                                size={36}
                                icon={
                                    <BookOutlined />
                                }
                            />

                            <div
                                style={{
                                    flex: 1,
                                }}
                            >
                                <div
                                    style={{
                                        display:
                                            'flex',
                                        justifyContent:
                                            'space-between',
                                    }}
                                >
                                    <Text strong>
                                        {
                                            item.title
                                        }
                                    </Text>

                                    {item.unread && (
                                        <Badge
                                            status="processing"
                                        />
                                    )}
                                </div>

                                <div
                                    style={{
                                        fontSize: 13,
                                        color: '#6B7280',
                                        marginTop: 4,
                                    }}
                                >
                                    {
                                        item.description
                                    }
                                </div>

                                <Text
                                    type="secondary"
                                    style={{
                                        fontSize: 12,
                                    }}
                                >
                                    {item.time}
                                </Text>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div
                style={{
                    padding: 12,
                    textAlign: 'center',
                    borderTop:
                        '1px solid #F3F4F6',
                }}
            >
                <Button
                    type="link"
                    size="small"
                >
                    View all notifications
                </Button>
            </div>
        </div>
    );

    return (
        <Header
            style={{
                background: '#fff',
                borderBottom:
                    '1px solid #F3F4F6',
                height: 64,
                padding: '0 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent:
                    'space-between',
                position: 'sticky',
                top: 0,
                zIndex: 100,
            }}
        >
            {/* LEFT */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    flex: 1,
                }}
            >
                <Input
                    prefix={
                        <SearchOutlined />
                    }
                    placeholder="Search mentor, disciple, subject..."
                    style={{
                        width: 340,
                    }}
                />
            </div>

            {/* RIGHT */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                }}
            >
                <Select
                    size="small"
                    value={lang}
                    onChange={setLang}
                    options={LANGS}
                    variant="borderless"
                    popupMatchSelectWidth={
                        false
                    }
                    style={{
                        width: 70,
                    }}
                />

                <Dropdown
                    trigger={['click']}
                    placement="bottomRight"
                    popupRender={() =>
                        notificationContent
                    }
                >
                    <Badge
                        count={
                            notifications.filter(
                                (x) =>
                                    x.unread,
                            ).length
                        }
                    >
                        <Button
                            
                            icon={
                                <BellOutlined />
                            }
                        />
                    </Badge>
                </Dropdown>

                <Tooltip title="Mentor Requests">
                    <Link href="/mentor-requests">
                        <Button
                            
                            icon={
                                <CalendarOutlined />
                            }
                        />
                    </Link>
                </Tooltip>

                <Tooltip title="Settings">
                    <Link href="/admin-settings">
                        <Button
                            
                            icon={
                                <SettingOutlined />
                            }
                        />
                    </Link>
                </Tooltip>

                <Dropdown
                    menu={{
                        items:
                            userMenuItems,
                    }}
                    trigger={['click']}
                    placement="bottomRight"
                >
                    <Avatar
                        size={36}
                        icon={
                            <UserOutlined />
                        }
                        style={{
                            cursor: 'pointer',
                        }}
                    />
                </Dropdown>
            </div>
        </Header>
    );
}