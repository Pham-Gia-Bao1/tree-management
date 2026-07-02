'use client';

import { ReactNode, useEffect, useMemo, useState, type Key } from 'react';

import {
    Alert,
    Breadcrumb,
    Button,
    Card,
    Divider,
    Empty,
    Flex,
    Input,
    Select,
    Skeleton,
    Space,
    Table,
    Typography,
} from 'antd';

import { LeftOutlined, ReloadOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons';

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

    /**
     * Left-aligned buttons rendered in a toolbar strip pinned above the table
     * header (Edit / Activate / Deactivate / Export style). Pass buttons that
     * manage their own `disabled` state based on the current selection.
     * When provided, this replaces the legacy alert-style selection banner.
     * By default the strip only renders once at least one row is selected,
     * to keep the table header uncluttered — set `toolbarAlwaysVisible` to
     * keep it pinned even with an empty selection.
     */
    toolbar?: ReactNode;
    /** Show the `toolbar` strip even when nothing is selected. Default: false. */
    toolbarAlwaysVisible?: boolean;
    /** Noun used for the "N selected" label, e.g. "user" -> "3 users selected". */
    selectionLabel?: string;

    /** @deprecated prefer `toolbar` — kept so older pages keep working unchanged. */
    selectionActions?: ReactNode;

    /** Escape hatch to fully override the computed rowSelection config. */
    rowSelection?: TableProps<T>['rowSelection'];

    pageSizeOptions?: number[];
    defaultPageSize?: number;
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

    toolbar,
    selectionLabel = 'record',
    selectionActions,

    rowSelection: rowSelectionProp,

    pageSizeOptions = [10, 20, 50, 100],
    defaultPageSize = 10,
}: DataPageProps<T>) {
    const resolvedRowSelection: TableProps<T>['rowSelection'] | undefined =
        selectable
            ? {
                  selectedRowKeys,
                  onChange: (keys, rows) => onSelectedRowKeysChange?.(keys, rows),
                  ...rowSelectionProp,
              }
            : rowSelectionProp;

    const selectionCount = selectedRowKeys?.length ?? 0;
    const hasSelection = selectable && selectionCount > 0;

    // Pagination is handled locally so we can render the
    // "Showing X-Y of Z records" footer shown in the reference design,
    // unless the caller passes a controlled `tableProps.pagination` object.
    const controlledPagination =
        typeof tableProps?.pagination === 'object' ? tableProps.pagination : undefined;

    const [page, setPage] = useState(controlledPagination?.current ?? 1);
    const [pageSize, setPageSize] = useState(
        controlledPagination?.pageSize ?? defaultPageSize,
    );

    const total = dataSource.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));

    useEffect(() => {
        if (page > pageCount) setPage(1);
    }, [pageCount, page]);

    const pagedData = useMemo(() => {
        if (tableProps?.pagination === false || controlledPagination) return dataSource;

        const start = (page - 1) * pageSize;
        return dataSource.slice(start, start + pageSize);
    }, [dataSource, page, pageSize, tableProps?.pagination, controlledPagination]);

    const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const rangeEnd = Math.min(page * pageSize, total);

    const useCustomPagination = tableProps?.pagination !== false && !controlledPagination;

    return (
        <div className="space-y-4">
            {/* Breadcrumb */}
            {breadcrumbs && (
                <Breadcrumb
                    separator={
                        <span style={{ color: 'rgba(0,0,0,0.35)', fontSize: 12 }}>/</span>
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
            <Flex align="flex-start" justify="space-between" gap={16} wrap="wrap">
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
                            {subtitle && (
                                <Text type="secondary" style={{ fontSize: 13 }}>
                                    {subtitle}
                                </Text>
                            )}
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

            {/* Legacy alert-style selection banner (only used when `toolbar` isn't passed) */}
            {!toolbar && hasSelection && (
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

            {/* Table card */}
            <Card styles={{ body: { padding: 0, overflow: 'hidden' } }}>
                {/* Toolbar strip pinned above the table, matching the reference design */}
                {toolbar && (
                    <>
                        <Flex
                            align="center"
                            justify="space-between"
                            gap={12}
                            wrap="wrap"
                            style={{ padding: '14px 20px' }}
                        >
                            <Space size={8} wrap>
                                {toolbar}
                            </Space>

                            {hasSelection && (
                                <Text type="secondary" style={{ fontSize: 13 }}>
                                    {selectionCount} {selectionLabel}
                                    {selectionCount > 1 ? 's' : ''} selected
                                </Text>
                            )}
                        </Flex>
                        <Divider style={{ margin: 0 }} />
                    </>
                )}

                <div style={{ width: '100%', overflowX: 'auto' }}>
                    <Table<T>
                        rowKey={rowKey}
                        columns={columns}
                        dataSource={useCustomPagination ? pagedData : dataSource}
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
                        {...tableProps}
                        pagination={useCustomPagination ? false : tableProps?.pagination}
                    />
                </div>

                {/* "Showing X-Y of Z records" footer, matching the reference design */}
                {useCustomPagination && total > 0 && (
                    <>
                        <Divider style={{ margin: 0 }} />
                        <Flex
                            align="center"
                            justify="space-between"
                            gap={12}
                            wrap="wrap"
                            style={{ padding: '12px 20px' }}
                        >
                            <Text type="secondary" style={{ fontSize: 13 }}>
                                Showing {rangeStart}-{rangeEnd} of {total} records
                            </Text>

                            <Space size={8} align="center">
                                <Select
                                    size="small"
                                    value={pageSize}
                                    onChange={(value) => {
                                        setPageSize(value);
                                        setPage(1);
                                    }}
                                    options={pageSizeOptions.map((size) => ({
                                        value: size,
                                        label: `${size} / page`,
                                    }))}
                                    style={{ width: 104 }}
                                />

                                <Button
                                    size="small"
                                    type="text"
                                    icon={<LeftOutlined style={{ fontSize: 11 }} />}
                                    disabled={page <= 1}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                />

                                <Flex
                                    align="center"
                                    justify="center"
                                    style={{
                                        minWidth: 32,
                                        height: 28,
                                        borderRadius: 8,
                                        border: '1px solid var(--ant-color-border, #E7E8F2)',
                                        fontSize: 13,
                                    }}
                                >
                                    {page}
                                </Flex>

                                <Text type="secondary" style={{ fontSize: 13 }}>
                                    of {pageCount}
                                </Text>

                                <Button
                                    size="small"
                                    type="text"
                                    icon={<RightOutlined style={{ fontSize: 11 }} />}
                                    disabled={page >= pageCount}
                                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                                />
                            </Space>
                        </Flex>
                    </>
                )}
            </Card>
        </div>
    );
}
