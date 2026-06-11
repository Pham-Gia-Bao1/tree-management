import type { Metadata } from 'next';
import './globals.css';

import { App, ConfigProvider } from 'antd';

import AppLayout from '@/components/layout/AppLayout';
import GlobalThemeConfig from '@/configs/theme.global.json';
export const metadata: Metadata = {
    title: 'Tree Management System',
    description:
        'A system to manage discipleship trees and training resources.',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body>
                <ConfigProvider theme={GlobalThemeConfig}
                notification={{ style: { top: '80px' } }}
                form={{  validateMessages: { required: 'This field is required!' } }}>
                    <App>
                        <AppLayout>
                            {children}
                        </AppLayout>
                    </App>
                </ConfigProvider>
            </body>
        </html>
    );
}