'use client';

import { ReactNode, type Key } from 'react';

import {
    Breadcrumb,
    Button,
    Card,
    Empty,
    Input,
    Skeleton,
    Space,
    Spin,
    Table,
    Typography,
} from 'antd';

import {
    ReloadOutlined,
    SearchOutlined,
} from '@ant-design/icons';

import type {
    ColumnsType,
    TableProps,
} from 'antd/es/table';

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

    // --- Row selection support ---
    selectable?: boolean;
    selectedRowKeys?: Key[];
    onSelectedRowKeysChange?: (keys: Key[], rows: T[]) => void;
    /** Buttons/content shown in the toolbar above the table once at least one row is selected */
    selectionActions?: ReactNode;
    /** Escape hatch to fully override the computed rowSelection config */
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

    const hasSelection = Boolean(
        selectable && selectedRowKeys && selectedRowKeys.length > 0,
    );

    return (
        
            <div className="space-y-4">
                {/* Breadcrumb */}
                {breadcrumbs && (
                    <Breadcrumb
                        separator={
                            <span
                                style={{
                                    color: '#9CA3AF',
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
                                                    ? '#111827'
                                                    : '#6B7280',
                                                fontWeight:
                                                    isLast
                                                        ? 600
                                                        : 500,
                                                fontSize: 14,
                                                cursor:
                                                    isLast
                                                        ? 'default'
                                                        : 'pointer',
                                                transition:
                                                    'all .2s ease',
                                            }}
                                            onMouseEnter={(
                                                e,
                                            ) => {
                                                if (
                                                    !isLast
                                                ) {
                                                    e.currentTarget.style.color =
                                                        '#166534';
                                                }
                                            }}
                                            onMouseLeave={(
                                                e,
                                            ) => {
                                                if (
                                                    !isLast
                                                ) {
                                                    e.currentTarget.style.color =
                                                        '#6B7280';
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
                        {loading &&
                        dataSource.length === 0 ? (
                            <>
                                <Skeleton.Input
                                    active
                                    style={{
                                        width: 280,
                                        height: 32,
                                    }}
                                />

                                {subtitle && (
                                    <div
                                        style={{
                                            marginTop: 8,
                                        }}
                                    >
                                        <Skeleton.Input
                                            active
                                            size="small"
                                            style={{
                                                width: 360,
                                            }}
                                        />
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
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
                            </>
                        )}
                    </div>

                    <Space>{actions}</Space>
                </div>

                {/* Filters */}
                {(filters || searchable) && (
                    <Card>
                        <div className="flex flex-wrap justify-between gap-4">
                            <Space>
                                {searchable && (
                                    <Input.Search
                                        allowClear
                                        disabled={loading}
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
                                        loading={
                                            refreshing
                                        }
                                        disabled={
                                            loading
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

                {/* Selection toolbar - shown above the table when rows are checked */}
                {hasSelection && (
                    <Card
                        styles={{ body: { padding: 12 } }}
                        style={{
                            background: '#F0FDF4',
                            borderColor: '#BBF7D0',
                        }}
                    >
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <Text strong>
                                {selectedRowKeys?.length} selected
                            </Text>

                            <Space wrap>{selectionActions}</Space>
                        </div>
                    </Card>
                )}

                {/* Table */}
                <Card
                    styles={{
                        body: {
                            padding: 0,
                            overflow: 'hidden',
                        },
                    }}
                >
                    <div
                        style={{
                            width: '100%',
                            overflowX: 'auto',
                        }}
                    >
                        <Table<T>
                            rowKey={rowKey}
                            columns={columns}
                            dataSource={dataSource}
                            loading={loading}
                            rowSelection={resolvedRowSelection}
                            scroll={{
                                x: 'max-content',
                                ...tableProps?.scroll,
                            }}
                            locale={{
                                emptyText: <Empty />,
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
                                ...(typeof tableProps?.pagination ===
                                'object'
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
