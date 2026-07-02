'use client';

import { ReactNode, type Key } from 'react';

import {
    Alert,
    Breadcrumb,
    Button,
    Card,
    Empty,
    Flex,
    Input,
    Skeleton,
    Space,
    Table,
    Typography,
} from 'antd';

import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';

import type { ColumnsType, TableProps } from 'antd/es/table';

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
    refreshing?: boolean;

    searchable?: boolean;
    searchPlaceholder?: string;

    onSearch?: (keyword: string) => void;
    onRefresh?: () => void;

    tableProps?: TableProps<T>;

    /** Enables the checkbox column and the selection toolbar. */
    selectable?: boolean;
    selectedRowKeys?: Key[];
    onSelectedRowKeysChange?: (keys: Key[], rows: T[]) => void;
    /** Buttons rendered in the selection banner once at least one row is checked. */
    selectionActions?: ReactNode;
    /** Noun used in the selection banner, e.g. "user" -> "3 users selected". */
    selectionLabel?: string;
    /** Escape hatch to fully override the computed rowSelection config. */
    rowSelection?: TableProps<T>['rowSelection'];
}

export default function DataPage<T extends object>({
    title,
    subtitle,
    breadcrumbs,

    filters,
    actions,

    columns,
    dataSource,

    loading = false,
    refreshing = false,

    rowKey = 'id',

    searchable = true,
    searchPlaceholder = 'Search...',

    onSearch,
    onRefresh,

    tableProps,

    selectable = false,
    selectedRowKeys,
    onSelectedRowKeysChange,
    selectionActions,
    selectionLabel = 'item',
    rowSelection: rowSelectionProp,
}: DataPageProps<T>) {
    const resolvedRowSelection: TableProps<T>['rowSelection'] | undefined =
        selectable
            ? {
                  selectedRowKeys,
                  onChange: (keys, rows) =>
                      onSelectedRowKeysChange?.(keys, rows),
                  ...rowSelectionProp,
              }
            : rowSelectionProp;

    const selectionCount = selectedRowKeys?.length ?? 0;
    const hasSelection = selectable && selectionCount > 0;

    return (
        <div className="space-y-4">
            {/* Breadcrumb */}
            {breadcrumbs && (
                <Breadcrumb
                    separator={
                        <span style={{ color: 'rgba(0,0,0,0.35)', fontSize: 12 }}>
                            /
                        </span>
                    }
                    items={breadcrumbs.map((item, index) => {
                        const isLast = index === breadcrumbs.length - 1;

                        return {
                            title: (
                                <Text
                                    type={isLast ? undefined : 'secondary'}
                                    strong={isLast}
                                    style={{
                                        fontSize: 13,
                                        cursor: isLast ? 'default' : 'pointer',
                                    }}
                                >
                                    {item}
                                </Text>
                            ),
                        };
                    })}
                />
            )}

            {/* Header */}
            <Flex align="center" justify="space-between" gap={16} wrap="wrap">
                <div>
                    {loading && dataSource.length === 0 ? (
                        <>
                            <Skeleton.Input active style={{ width: 240, height: 30 }} />

                            {subtitle && (
                                <div style={{ marginTop: 8 }}>
                                    <Skeleton.Input active size="small" style={{ width: 320 }} />
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <Title level={3} style={{ marginBottom: 2 }}>
                                {title}
                            </Title>

                            {subtitle && <Text type="secondary">{subtitle}</Text>}
                        </>
                    )}
                </div>

                <Space wrap>{actions}</Space>
            </Flex>

            {/* Filters */}
            {(filters || searchable) && (
                <Card size="small">
                    <Flex align="center" justify="space-between" gap={12} wrap="wrap">
                        <Space wrap>
                            {searchable && (
                                <Input.Search
                                    allowClear
                                    disabled={loading}
                                    prefix={<SearchOutlined style={{ color: 'rgba(0,0,0,0.3)' }} />}
                                    placeholder={searchPlaceholder}
                                    style={{ width: 260 }}
                                    onSearch={onSearch}
                                />
                            )}

                            {onRefresh && (
                                <Button
                                    icon={<ReloadOutlined />}
                                    loading={refreshing}
                                    disabled={loading}
                                    onClick={onRefresh}
                                >
                                    Refresh
                                </Button>
                            )}
                        </Space>

                        {filters && <Space wrap>{filters}</Space>}
                    </Flex>
                </Card>
            )}

            {/* Selection banner - appears above the table once rows are checked */}
            {hasSelection && (
                <Alert
                    type="info"
                    showIcon
                    closable
                    onClose={() => onSelectedRowKeysChange?.([], [])}
                    message={
                        <Flex align="center" justify="space-between" gap={12} wrap="wrap">
                            <Text strong>
                                {selectionCount} {selectionLabel}
                                {selectionCount > 1 ? 's' : ''} selected
                            </Text>

                            <Space size={8} wrap>
                                {selectionActions}
                            </Space>
                        </Flex>
                    }
                />
            )}

            {/* Table */}
            <Card styles={{ body: { padding: 0, overflow: 'hidden' } }}>
                <div style={{ width: '100%', overflowX: 'auto' }}>
                    <Table<T>
                        rowKey={rowKey}
                        columns={columns}
                        dataSource={dataSource}
                        loading={loading}
                        rowSelection={resolvedRowSelection}
                        scroll={{ x: 'max-content', ...tableProps?.scroll }}
                        locale={{
                            emptyText: (
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description="No records found"
                                    style={{ padding: '32px 0' }}
                                />
                            ),
                        }}
                        pagination={{
                            showSizeChanger: true,
                            pageSizeOptions: ['10', '20', '50', '100'],
                            showTotal: (total) => `${total} items`,
                            ...(typeof tableProps?.pagination === 'object'
                                ? tableProps.pagination
                                : {}),
                        }}
                        {...tableProps}
                    />
                </div>
            </Card>
        </div>
    );
}
