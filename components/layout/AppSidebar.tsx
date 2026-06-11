'use client';

import { useMemo, useState } from 'react';
import { Layout, Menu, Button } from 'antd';
import {
    AppstoreOutlined,
    ApartmentOutlined,
    BranchesOutlined,
    NodeIndexOutlined,
    TeamOutlined,
    UserAddOutlined,
    BookOutlined,
    MessageOutlined,
    SettingOutlined,
    QuestionCircleOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
} from '@ant-design/icons';
import { usePathname, useRouter } from 'next/navigation';

        // import { useRole } from '@/hooks/useRole';
        // import { canAccessRoute } from '@/lib/permissions';

const { Sider } = Layout;

const ROUTES = {
    dashboard: '/',
    discipleshipTree: '/discipleship-tree',
    branches: '/branches',
    trainingRelations: '/training-relations',
    users: '/users',
    mentorRequests: '/mentor-requests',
    profile: '/profile',
    subjects: '/subjects',
    messages: '/messages',
    settings: '/admin-settings',
} as const;

const sectionLabel = (text: string) => (
    <span
        style={{
            fontSize: 10,
            fontWeight: 700,
            color: '#9CA3AF',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
        }}
    >
        {text}
    </span>
);

const sideMenuItems = [
    {
        key: 'general',
        label: sectionLabel('General'),
        type: 'group' as const,
        children: [
            {
                key: 'dashboard',
                icon: <AppstoreOutlined />,
                label: 'Dashboard',
            },
            {
                key: 'discipleshipTree',
                icon: <ApartmentOutlined />,
                label: 'Discipleship Tree',
            },
            {
                key: 'branches',
                icon: <BranchesOutlined />,
                label: 'Branches',
            },
        ],
    },
    {
        key: 'discipleship',
        label: sectionLabel('Discipleship'),
        type: 'group' as const,
        children: [
            {
                key: 'trainingRelations',
                icon: <NodeIndexOutlined />,
                label: 'Training Relations',
            },
            {
                key: 'mentorRequests',
                icon: <UserAddOutlined />,
                label: 'Mentor Requests',
            },
        ],
    },
    {
        key: 'resources',
        label: sectionLabel('Resources'),
        type: 'group' as const,
        children: [
            {
                key: 'subjects',
                icon: <BookOutlined />,
                label: 'Subjects',
            },
            {
                key: 'messages',
                icon: <MessageOutlined />,
                label: 'Messages',
            },
            {
                key: 'users',
                icon: <TeamOutlined />,
                label: 'Users',
            },
        ],
    },
];

export default function AppSidebar() {
    const router = useRouter();
    const pathname = usePathname();
    // const role = useRole();

    const [collapsed, setCollapsed] = useState(false);

    const selectedKey = useMemo(() => {
        const matched = Object.entries(ROUTES).find(
            ([, route]) =>
                pathname === route ||
                pathname.startsWith(`${route}/`),
        );

        return matched?.[0] ?? 'dashboard';
    }, [pathname]);

    const filteredSideMenuItems = useMemo(() => {
        return sideMenuItems
            .map((group) => ({
                ...group,
                children: group.children.filter((item) =>
                    // canAccessRoute(role, item.key),
                    true,
                ),
            }))
            .filter((group) => group.children.length > 0);
    }, []);

    const footerItems = useMemo(() => {
        return [
            {
                key: 'profile',
                icon: <TeamOutlined />,
                label: 'Profile',
            },
            {
                key: 'settings',
                icon: <SettingOutlined />,
                label: 'Admin Settings',
            },
            {
                key: 'help',
                icon: <QuestionCircleOutlined />,
                label: 'Help & Support',
            },
        ].filter(
            (item) =>
                item.key === 'help' ||
                // canAccessRoute(role, item.key),
                true,
        );
    }, []);

    const handleMenuClick = ({
        key,
    }: {
        key: string;
    }) => {
        const route =
            ROUTES[key as keyof typeof ROUTES];

        if (route) {
            router.push(route);
        }
    };

    return (
        <Sider
            collapsible
            collapsed={collapsed}
            trigger={null}
            width={260}
            style={{
                background: '#fff',
                borderRight: '1px solid #f0f0f0',
                height: '100vh',
                position: 'sticky',
                top: 0,
                left: 0,
            }}
        >
            {/* Header */}
            <div
                style={{
                    height: 64,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '0 16px',
                    borderBottom: '1px solid #f0f0f0',
                }}
            >
                <div
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background:
                            'linear-gradient(135deg,#1677ff 0%,#4096ff 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                    }}
                >
                    <span
                        style={{
                            color: '#fff',
                            fontWeight: 700,
                        }}
                    >
                        D
                    </span>
                </div>

                {!collapsed && (
                    <span
                        style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: '#111827',
                        }}
                    >
                        DiscipleTree
                    </span>
                )}

                <Button
                    type="text"
                    size="small"
                    icon={
                        collapsed ? (
                            <MenuUnfoldOutlined />
                        ) : (
                            <MenuFoldOutlined />
                        )
                    }
                    onClick={() =>
                        setCollapsed((prev) => !prev)
                    }
                    style={{
                        marginLeft: 'auto',
                    }}
                />
            </div>

            {/* Body */}
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    height: 'calc(100vh - 64px)',
                }}
            >
                <Menu
                    mode="inline"
                    selectedKeys={[selectedKey]}
                    items={filteredSideMenuItems}
                    onClick={handleMenuClick}
                    style={{
                        border: 'none',
                        paddingTop: 8,
                    }}
                />

                {/* Footer */}
                <div
                    style={{
                        borderTop: '1px solid #f0f0f0',
                        padding: '8px 0',
                    }}
                >
                    <Menu
                        mode="inline"
                        selectedKeys={[selectedKey]}
                        items={footerItems}
                        onClick={handleMenuClick}
                        style={{
                            border: 'none',
                        }}
                    />
                </div>
            </div>
        </Sider>
    );
}