'use client';
import {
    Breadcrumb,
    Button,
    Card,
    Empty,
    Input,
    Space,
    Table,
    Typography,
} from 'antd';
import {
    ReloadOutlined,
    SearchOutlined,
} from '@ant-design/icons';
import { ReactNode, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
const { Title, Text } = Typography;
interface DataPageProps<T> {
    title: string;
    subtitle?: string;
    breadcrumbs?: string[];
    filters?: ReactNode;
    actions?: ReactNode;
    columns: ColumnsType<T>;
    dataSource: T[];
    rowKey?: string;
    loading?: boolean;
    searchable?: boolean;
    searchPlaceholder?: string;
    onSearch?: (keyword: string) => void;
    onRefresh?: () => void;
}
export default function DataPage<
    T extends object,
>({
    title,
    subtitle,
    breadcrumbs,
    filters,
    actions,
    columns,
    dataSource,
    loading,
    rowKey = 'id',
    searchable = true,
    searchPlaceholder = 'Search...',
    onSearch,
    onRefresh,
}: DataPageProps<T>) {
    return (
        <div className="space-y-4">
            {/* Breadcrumb */}
            {breadcrumbs && (
                <Breadcrumb
                    separator={
                        <span
                            style={{
                                color: "#9CA3AF",
                                fontSize: 12,
                            }}
                        >
                            /
                        </span>
                    }
                    items={breadcrumbs.map(
                        (item, index) => {
                            const isLast =
                                index ===
                                breadcrumbs.length - 1;
                            return {
                                title: (
                                    <span
                                        style={{
                                            color: isLast
                                                ? "#111827"
                                                : "#6B7280",
                                            fontWeight: isLast
                                                ? 600
                                                : 500,
                                            fontSize: 14,
                                            cursor: isLast
                                                ? "default"
                                                : "pointer",
                                            transition:
                                                "all .2s ease",
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isLast) {
                                                e.currentTarget.style.color =
                                                    "#166534";
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isLast) {
                                                e.currentTarget.style.color =
                                                    "#6B7280";
                                            }
                                        }}
                                    >
                                        {item}
                                    </span>
                                ),
                            };
                        },
                    )}
                />
            )}
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <Title
                        level={3}
                        style={{
                            marginBottom: 0,
                        }}
                    >
                        {title}
                    </Title>
                    {subtitle && (
                        <Text type="secondary">
                            {subtitle}
                        </Text>
                    )}
                </div>
                <Space>{actions}</Space>
            </div>
            {/* Filter Card */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
            }}>
                {(filters || searchable) && (
                    <Card>
                        <div className="flex flex-wrap gap-10 justify-between">
                            <Space>
                                {searchable && (
                                    <Input.Search
                                        allowClear
                                        prefix={
                                            <SearchOutlined />
                                        }
                                        placeholder={
                                            searchPlaceholder
                                        }
                                        style={{
                                            width: 280,
                                        }}
                                        onSearch={
                                            onSearch
                                        }
                                    />
                                )}
                                {onRefresh && (
                                    <Button
                                        icon={
                                            <ReloadOutlined />
                                        }
                                        onClick={
                                            onRefresh
                                        }
                                    >
                                        Refresh
                                    </Button>
                                )}
                            </Space>
                            <Space wrap>
                                {filters}
                            </Space>
                        </div>
                    </Card>
                )}
                {/* Table */}
                <Card
                    styles={{
                        body: {
                            padding: 0,
                        },
                    }}
                >
                    <Table<T>
                        rowKey={rowKey}
                        columns={columns}
                        dataSource={dataSource}
                        loading={loading}
                        locale={{
                            emptyText: (
                                <Empty />
                            ),
                        }}
                        pagination={{
                            showSizeChanger: true,
                            pageSizeOptions: [
                                '10',
                                '20',
                                '50',
                                '100',
                            ],
                            showTotal: (
                                total,
                            ) =>
                                `${total} items`,
                        }}
                    />
                </Card>
            </div>
        </div>
    );
}