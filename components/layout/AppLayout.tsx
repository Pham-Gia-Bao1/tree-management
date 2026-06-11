'use client';

import { useState } from 'react';import { Layout } from 'antd';import AppSidebar from './AppSidebar';
import AppHeader from './AppHeader';

const { Content } = Layout;

const SIDEBAR_WIDTH = 260;const SIDEBAR_COLLAPSED_WIDTH = 64;

export default function AppLayout({ children }: { children: React.ReactNode }) {const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

return (
    <Layout style={{ minHeight: '100vh' }}>
        <AppSidebar
        />

        <Layout
            style={{
                transition: 'margin-left 0.2s',
            }}
        >
            <AppHeader
                sidebarWidth={SIDEBAR_WIDTH}
                onMobileMenuToggle={() => setMobileMenuOpen(true)}
            />

            <Content
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '15px 20px',
                }}
            >
                {children}
            </Content>
        </Layout>
    </Layout>
);

}