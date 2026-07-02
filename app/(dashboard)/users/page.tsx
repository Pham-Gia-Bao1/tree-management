'use client';

import { useEffect, useMemo, useState, type Key } from 'react';
import {
    App,
    Avatar,
    Badge,
    Button,
    Checkbox,
    Collapse,
    Descriptions,
    Divider,
    Drawer,
    Dropdown,
    Empty,
    Flex,
    Form,
    Input,
    Modal,
    Popconfirm,
    Result,
    Select,
    Space,
    Tag,
    Typography,
} from 'antd';
import {
    ApartmentOutlined,
    CalendarOutlined,
    CheckCircleFilled,
    DeleteOutlined,
    DownloadOutlined,
    EditOutlined,
    EllipsisOutlined,
    EyeOutlined,
    FilterOutlined,
    IdcardOutlined,
    MailOutlined,
    MinusCircleFilled,
    PlusOutlined,
    SearchOutlined,
    StopOutlined,
    UploadOutlined,
    UserOutlined,
    WarningFilled,
} from '@ant-design/icons';

import type { UserRecord } from '@/types/user.types';
import { RoleCode } from '@/types/database.types';
import DataPage from '@/components/common/DataPage';

const { Text } = Typography;

type UserTableRecord = UserRecord & {
    branch: string;
};

interface BranchOption {
    value: string;
    label: string;
}

const ROLE_OPTIONS: { value: RoleCode; label: string }[] = [
    { value: 'ADMIN', label: 'Admin' },
    { value: 'MENTOR', label: 'Mentor' },
    { value: 'MEMBER', label: 'Member' },
];

const STATUS_OPTIONS = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending' },
];

const AVATAR_PALETTE = ['#7C3AED', '#3B82F6', '#F59E0B', '#22C55E', '#EF4444', '#EC4899', '#06B6D4'];

function avatarColor(seed: string) {
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function initials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');
}

function roleLabel(roles: RoleCode[]) {
    if (!roles?.length) return '—';
    const label = roles[0].charAt(0) + roles[0].slice(1).toLowerCase();
    return roles.length > 1 ? `${label} +${roles.length - 1}` : label;
}

/**
 * The reference design shows a few extra columns (Login ID, MER, Business
 * Role, Division, Department) that don't exist on `UserRecord` yet. Until
 * those fields are added on the backend, we fall back to the closest
 * equivalent we already have, or an em-dash. Swap these out once the API
 * returns the real fields.
 */
function getDisplayField(user: UserTableRecord, key: 'loginId' | 'mer' | 'businessRole' | 'division' | 'department') {
    const record = user as unknown as Record<string, string | undefined>;

    switch (key) {
        case 'loginId':
            return record.loginId ?? user.email;
        case 'division':
            return record.division ?? user.branch ?? '—';
        case 'department':
            return record.department ?? user.branch ?? '—';
        default:
            return record[key] ?? '—';
    }
}

/** Filter section shown inside the Filter drawer, styled after the reference design. */
function FilterSection({
    title,
    options,
    selected,
    onChange,
}: {
    title: string;
    options: { value: string; label: string }[];
    selected: string[];
    onChange: (values: string[]) => void;
}) {
    const [query, setQuery] = useState('');

    const visibleOptions = query
        ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
        : options;

    return (
        <Flex vertical gap={10}>
            <Input
                allowClear
                size="small"
                placeholder="Search by ..."
                prefix={<SearchOutlined style={{ color: 'rgba(0,0,0,0.3)' }} />}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
            <Checkbox.Group
                value={selected}
                onChange={(values) => onChange(values as string[])}
                style={{ width: '100%' }}
            >
                <Flex vertical gap={8}>
                    {visibleOptions.map((option) => (
                        <Checkbox key={option.value} value={option.value}>
                            {option.label}
                        </Checkbox>
                    ))}
                    {visibleOptions.length === 0 && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            No {title.toLowerCase()} found
                        </Text>
                    )}
                </Flex>
            </Checkbox.Group>
        </Flex>
    );
}

type FilterState = { branch: string[]; role: string[]; status: string[] };
const EMPTY_FILTERS: FilterState = { branch: [], role: [], status: [] };

export default function UsersPage() {
    const { message, modal } = App.useApp();

    // TODO: wire this up to the authenticated user (see lib/auth/get-current-user.ts)
    // once a client-side auth/session hook is available.
    const currentUserRoles: RoleCode[] = ['ADMIN'];

    const [data, setData] = useState<UserTableRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);

    const [branchOptions, setBranchOptions] = useState<BranchOption[]>([]);
    const [branchLoading, setBranchLoading] = useState(false);

    const [search, setSearch] = useState('');

    // Applied filters drive the table; draft filters are edited inside the
    // drawer and only take effect once "Apply" is pressed, matching the
    // reference design.
    const [appliedFilters, setAppliedFilters] = useState<FilterState>(EMPTY_FILTERS);
    const [draftFilters, setDraftFilters] = useState<FilterState>(EMPTY_FILTERS);

    const [editingRecord, setEditingRecord] = useState<UserTableRecord | null>(null);
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    // Row selection
    const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
    const [selectedRows, setSelectedRows] = useState<UserTableRecord[]>([]);

    // Detail drawer
    const [detailRecord, setDetailRecord] = useState<UserTableRecord | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    // Filter drawer
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

    // Activate / deactivate confirmation
    const [statusModal, setStatusModal] = useState<{
        action: 'activate' | 'deactivate';
        records: UserTableRecord[];
    } | null>(null);
    const [statusSubmitting, setStatusSubmitting] = useState(false);

    const loadUsers = async () => {
        try {
            setLoading(true);

            const params = new URLSearchParams();
            if (search) params.set('search', search);

            const response = await fetch(`/api/users?${params.toString()}`);
            if (!response.ok) throw new Error();

            const payload = await response.json();

            const users: UserTableRecord[] = (payload.data ?? []).map((user: UserRecord) => ({
                ...user,
                branch: user.branchName ?? '',
            }));

            setData(users);
            setLastLoadedAt(new Date());
        } catch {
            message.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const loadBranches = async () => {
        try {
            setBranchLoading(true);

            const response = await fetch('/api/branches');
            if (!response.ok) throw new Error();

            const payload = await response.json();

            const options: BranchOption[] = (payload.data ?? []).map(
                (branch: { id: string; name: string }) => ({
                    value: branch.id,
                    label: branch.name,
                }),
            );

            setBranchOptions(options);
        } catch {
            message.error('Failed to load branches');
        } finally {
            setBranchLoading(false);
        }
    };

    useEffect(() => {
        void loadUsers();
    }, []);

    const branchFilterOptions = useMemo(
        () =>
            Array.from(new Set(data.map((item) => item.branch).filter(Boolean))).map((branch) => ({
                value: branch,
                label: branch,
            })),
        [data],
    );

    const filteredData = useMemo(() => {
        return data.filter((user) => {
            if (
                search &&
                !user.fullName.toLowerCase().includes(search.toLowerCase()) &&
                !user.email.toLowerCase().includes(search.toLowerCase())
            ) {
                return false;
            }

            if (appliedFilters.branch.length && !appliedFilters.branch.includes(user.branch)) return false;
            if (
                appliedFilters.role.length &&
                !user.roles.some((role) => appliedFilters.role.includes(role))
            )
                return false;
            if (appliedFilters.status.length && !appliedFilters.status.includes(user.status)) return false;

            return true;
        });
    }, [data, search, appliedFilters]);

    const activeFilterCount =
        appliedFilters.branch.length + appliedFilters.role.length + appliedFilters.status.length;

    const clearSelection = () => {
        setSelectedRowKeys([]);
        setSelectedRows([]);
    };

    const handleSelectionChange = (keys: Key[], rows: UserTableRecord[]) => {
        setSelectedRowKeys(keys);
        setSelectedRows(rows);
    };

    const openCreate = async () => {
        await loadBranches();

        setEditingRecord(null);
        form.resetFields();
        form.setFieldsValue({ roles: ['MEMBER'], status: 'active' });
        setOpen(true);
    };

    const openEdit = async (record: UserTableRecord) => {
        await loadBranches();

        setEditingRecord(record);
        form.setFieldsValue({
            name: record.fullName,
            email: record.email,
            roles: record.roles,
            branchId: record.branchId,
            status: record.status,
        });
        setOpen(true);
    };

    const openDetail = (record: UserTableRecord) => {
        setDetailRecord(record);
        setDetailOpen(true);
    };

    const openFilterDrawer = () => {
        setDraftFilters(appliedFilters);
        setFilterDrawerOpen(true);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);

            const payload = {
                name: values.name,
                email: values.email,
                roles: values.roles as RoleCode[],
                branchId: values.branchId,
                status: values.status,
            };

            if (editingRecord) {
                const response = await fetch(`/api/users/${editingRecord.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                if (!response.ok) throw new Error();
                message.success('User updated successfully');
            } else {
                const response = await fetch('/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...payload, status: payload.status ?? 'active' }),
                });
                if (!response.ok) throw new Error();
                message.success('User created successfully');
            }

            setOpen(false);
            await loadUsers();
        } catch (err) {
            if (err instanceof Error) {
                message.error('Failed to save user');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (id: string) => {
        void (async () => {
            try {
                const response = await fetch(`/api/users/${id}`, { method: 'DELETE' });
                if (!response.ok) throw new Error();

                message.success('User deleted successfully');
                clearSelection();
                await loadUsers();
            } catch {
                message.error('Failed to delete user');
            }
        })();
    };

    const requestStatusChange = (records: UserTableRecord[], action: 'activate' | 'deactivate') => {
        if (!records.length) return;
        setStatusModal({ action, records });
    };

    const confirmStatusChange = async () => {
        if (!statusModal) return;

        try {
            setStatusSubmitting(true);
            const nextStatus = statusModal.action === 'activate' ? 'active' : 'inactive';

            await Promise.all(
                statusModal.records.map((row) =>
                    fetch(`/api/users/${row.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: nextStatus }),
                    }),
                ),
            );

            message.success(
                statusModal.action === 'activate' ? 'User(s) activated successfully' : 'User(s) deactivated successfully',
            );
            setStatusModal(null);
            clearSelection();
            await loadUsers();
        } catch {
            message.error('Failed to update user status');
        } finally {
            setStatusSubmitting(false);
        }
    };

    const handleBulkDelete = () => {
        modal.confirm({
            title: `Delete ${selectedRows.length} user${selectedRows.length > 1 ? 's' : ''}?`,
            content: 'This action cannot be undone.',
            okText: 'Delete',
            okButtonProps: { danger: true },
            async onOk() {
                try {
                    await Promise.all(selectedRows.map((row) => fetch(`/api/users/${row.id}`, { method: 'DELETE' })));
                    message.success('Users deleted successfully');
                    clearSelection();
                    await loadUsers();
                } catch {
                    message.error('Failed to delete users');
                }
            },
        });
    };

    const handleExport = () => {
        // TODO: wire up to a real export endpoint (e.g. /api/users/export).
        message.info(`Exporting ${selectedRows.length || filteredData.length} user(s)...`);
    };

    const handleImport = () => {
        // TODO: wire up to a real import flow (file picker + /api/users/import).
        message.info('Import coming soon');
    };

    // Toolbar strip pinned above the table, matching the reference design.
    const toolbar = (
        <>
            <Button
                icon={<EditOutlined />}
                disabled={selectedRows.length !== 1}
                onClick={() => selectedRows[0] && openEdit(selectedRows[0])}
            >
                Edit
            </Button>
            <Button
                icon={<CheckCircleFilled />}
                disabled={selectedRows.length === 0}
                onClick={() => requestStatusChange(selectedRows, 'activate')}
            >
                Activate
            </Button>
            <Button
                icon={<StopOutlined />}
                disabled={selectedRows.length === 0}
                onClick={() => requestStatusChange(selectedRows, 'deactivate')}
            >
                Deactivate
            </Button>
            <Button icon={<DownloadOutlined />} disabled={selectedRows.length === 0} onClick={handleExport}>
                Export
            </Button>
            {selectedRows.length > 0 && (
                <>
                    <Divider type="vertical" />
                    <Button danger type="text" icon={<DeleteOutlined />} onClick={handleBulkDelete}>
                        Delete
                    </Button>
                </>
            )}
        </>
    );

    const columns = [
        {
            title: 'User Name',
            dataIndex: 'fullName',
            width: 240,
            sorter: (a: UserTableRecord, b: UserTableRecord) => a.fullName.localeCompare(b.fullName),
            render: (_: string, record: UserTableRecord) => (
                <Flex align="center" gap={10}>
                    <Avatar size={32} style={{ backgroundColor: avatarColor(record.fullName), flexShrink: 0 }}>
                        {initials(record.fullName) || <UserOutlined />}
                    </Avatar>
                    <Typography.Link
                        onClick={() => openDetail(record)}
                        style={{ fontWeight: 500 }}
                    >
                        {record.fullName}
                    </Typography.Link>
                </Flex>
            ),
        },
        {
            title: 'Login ID',
            dataIndex: 'email',
            width: 200,
            sorter: (a: UserTableRecord, b: UserTableRecord) => a.email.localeCompare(b.email),
            render: (_: string, record: UserTableRecord) => (
                <Text type="secondary">{getDisplayField(record, 'loginId')}</Text>
            ),
        },
        {
            title: 'MER',
            dataIndex: 'mer',
            width: 120,
            render: (_: string, record: UserTableRecord) => (
                <Text type="secondary">{getDisplayField(record, 'mer')}</Text>
            ),
        },
        {
            title: 'System Role',
            dataIndex: 'roles',
            width: 140,
            render: (value: RoleCode[]) => <Text>{roleLabel(value)}</Text>,
        },
        {
            title: 'Business Role',
            dataIndex: 'businessRole',
            width: 140,
            render: (_: string, record: UserTableRecord) => (
                <Text>{getDisplayField(record, 'businessRole')}</Text>
            ),
        },
        {
            title: 'Division',
            dataIndex: 'division',
            width: 150,
            render: (_: string, record: UserTableRecord) => <Text>{getDisplayField(record, 'division')}</Text>,
        },
        {
            title: 'Department',
            dataIndex: 'department',
            width: 150,
            render: (_: string, record: UserTableRecord) => <Text>{getDisplayField(record, 'department')}</Text>,
        },
        {
            title: 'Account Status',
            dataIndex: 'status',
            width: 140,
            render: (value: string) =>
                value === 'active' ? (
                    <Flex align="center" gap={6}>
                        <CheckCircleFilled style={{ color: '#22C55E', fontSize: 13 }} />
                        <Text style={{ color: '#22C55E' }}>Active</Text>
                    </Flex>
                ) : value === 'inactive' ? (
                    <Flex align="center" gap={6}>
                        <MinusCircleFilled style={{ color: '#EF4444', fontSize: 13 }} />
                        <Text style={{ color: '#EF4444' }}>Inactive</Text>
                    </Flex>
                ) : (
                    <Flex align="center" gap={6}>
                        <MinusCircleFilled style={{ color: '#F59E0B', fontSize: 13 }} />
                        <Text style={{ color: '#F59E0B' }}>Pending</Text>
                    </Flex>
                ),
        },
    ];

    if (!currentUserRoles.includes('ADMIN')) {
        return <Result status="403" title="403" subTitle="You do not have permission to access this page." />;
    }

    return (
        <>
            <DataPage<UserTableRecord>
                title="User Management"
                subtitle={lastLoadedAt ? `Last refreshed ${lastLoadedAt.toLocaleString()}` : undefined}
                breadcrumbs={['Administration', 'Users']}
                loading={loading}
                columns={columns}
                dataSource={filteredData}
                onRefresh={() => void loadUsers()}
                searchable
                searchPlaceholder="Search by name or email..."
                onSearch={setSearch}
                selectable
                selectedRowKeys={selectedRowKeys}
                onSelectedRowKeysChange={handleSelectionChange}
                toolbar={toolbar}
                selectionLabel="record"
                actions={
                    <Space>
                        <Badge count={activeFilterCount} size="small" offset={[-4, 4]}>
                            <Button icon={<FilterOutlined />} onClick={openFilterDrawer}>
                                Filters
                            </Button>
                        </Badge>
                        <Button icon={<UploadOutlined />} onClick={handleImport}>
                            Import
                        </Button>
                        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                            New user
                        </Button>
                        <Dropdown
                            menu={{
                                items: [
                                    { key: 'export', label: 'Export all', icon: <DownloadOutlined /> },
                                ],
                                onClick: ({ key }) => {
                                    if (key === 'export') handleExport();
                                },
                            }}
                        >
                            <Button icon={<EllipsisOutlined />} />
                        </Dropdown>
                    </Space>
                }
                tableProps={{ size: 'middle', sticky: true, scroll: { x: 1400 } }}
            />

            {/* Filter Drawer — collapsible checkbox sections, matching the reference design */}
            <Drawer
                title="Filter"
                placement="right"
                open={filterDrawerOpen}
                onClose={() => setFilterDrawerOpen(false)}
                width={360}
                destroyOnClose
                footer={
                    <Flex gap={12}>
                        <Button
                            block
                            onClick={() => {
                                setDraftFilters(EMPTY_FILTERS);
                            }}
                        >
                            Clear All
                        </Button>
                        <Button
                            block
                            type="primary"
                            onClick={() => {
                                setAppliedFilters(draftFilters);
                                setFilterDrawerOpen(false);
                            }}
                        >
                            Apply
                        </Button>
                    </Flex>
                }
            >
                <Collapse
                    ghost
                    defaultActiveKey={['branch']}
                    items={[
                        {
                            key: 'branch',
                            label: (
                                <Flex align="center" gap={8}>
                                    <Text strong>Branch</Text>
                                    {draftFilters.branch.length > 0 && (
                                        <Tag color="purple" bordered={false}>
                                            {draftFilters.branch.length} Selected
                                        </Tag>
                                    )}
                                </Flex>
                            ),
                            children: (
                                <FilterSection
                                    title="Branch"
                                    options={branchFilterOptions}
                                    selected={draftFilters.branch}
                                    onChange={(values) => setDraftFilters((f) => ({ ...f, branch: values }))}
                                />
                            ),
                        },
                        {
                            key: 'role',
                            label: (
                                <Flex align="center" gap={8}>
                                    <Text strong>Role</Text>
                                    {draftFilters.role.length > 0 && (
                                        <Tag color="purple" bordered={false}>
                                            {draftFilters.role.length} Selected
                                        </Tag>
                                    )}
                                </Flex>
                            ),
                            children: (
                                <FilterSection
                                    title="Role"
                                    options={ROLE_OPTIONS}
                                    selected={draftFilters.role}
                                    onChange={(values) => setDraftFilters((f) => ({ ...f, role: values }))}
                                />
                            ),
                        },
                        {
                            key: 'status',
                            label: (
                                <Flex align="center" gap={8}>
                                    <Text strong>Status</Text>
                                    {draftFilters.status.length > 0 && (
                                        <Tag color="purple" bordered={false}>
                                            {draftFilters.status.length} Selected
                                        </Tag>
                                    )}
                                </Flex>
                            ),
                            children: (
                                <FilterSection
                                    title="Status"
                                    options={STATUS_OPTIONS}
                                    selected={draftFilters.status}
                                    onChange={(values) => setDraftFilters((f) => ({ ...f, status: values }))}
                                />
                            ),
                        },
                    ]}
                />
            </Drawer>

            {/* Create / Edit modal */}
            <Modal
                open={open}
                width={520}
                title={editingRecord ? 'Edit user' : 'Create user'}
                onCancel={() => setOpen(false)}
                onOk={handleSave}
                okText="Save"
                confirmLoading={saving}
                destroyOnClose
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="name" label="Full name" rules={[{ required: true }]}>
                        <Input placeholder="Jane Doe" />
                    </Form.Item>
                    <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
                        <Input placeholder="jane@example.com" />
                    </Form.Item>
                    <Form.Item name="branchId" label="Branch" rules={[{ required: true, message: 'Branch is required' }]}>
                        <Select
                            loading={branchLoading}
                            placeholder="Select branch"
                            options={branchOptions}
                            showSearch
                            optionFilterProp="label"
                        />
                    </Form.Item>
                    <Form.Item name="roles" label="Roles" rules={[{ required: true, message: 'At least one role is required' }]}>
                        <Select mode="multiple" placeholder="Select roles" options={ROLE_OPTIONS} />
                    </Form.Item>
                    <Form.Item
                        name="status"
                        label="Status"
                        initialValue="active"
                        rules={[{ required: true, message: 'Status is required' }]}
                    >
                        <Select options={STATUS_OPTIONS} />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Activate / Deactivate confirmation — matches the reference warning modal */}
            <Modal
                open={!!statusModal}
                onCancel={() => setStatusModal(null)}
                footer={null}
                width={420}
                destroyOnClose
                closable={false}
            >
                {statusModal && (
                    <Flex vertical gap={16}>
                        <WarningFilled style={{ color: '#F59E0B', fontSize: 28 }} />

                        <Flex vertical gap={8}>
                            <Text strong style={{ fontSize: 16 }}>
                                {statusModal.action === 'activate' ? 'Activate User' : 'Deactivate User'}
                            </Text>
                            <Text type="secondary">
                                You are about to {statusModal.action}{' '}
                                {statusModal.records.length > 1
                                    ? `${statusModal.records.length} user accounts.`
                                    : 'this user account.'}
                            </Text>
                            <Text type="secondary" style={{ marginTop: 4 }}>
                                After {statusModal.action === 'activate' ? 'activation' : 'deactivation'}:
                            </Text>
                            <ul style={{ margin: 0, paddingLeft: 20, color: 'rgba(0,0,0,0.45)' }}>
                                <li>
                                    {statusModal.action === 'activate'
                                        ? 'The user will regain access to the system.'
                                        : 'The user will no longer be able to access the system.'}
                                </li>
                                <li>You can change this again at any time.</li>
                            </ul>
                        </Flex>

                        <Flex gap={12} justify="flex-end">
                            <Button onClick={() => setStatusModal(null)}>Cancel</Button>
                            <Button
                                danger={statusModal.action === 'deactivate'}
                                type="primary"
                                loading={statusSubmitting}
                                onClick={confirmStatusChange}
                                style={
                                    statusModal.action === 'activate'
                                        ? { backgroundColor: '#22C55E', borderColor: '#22C55E' }
                                        : undefined
                                }
                            >
                                {statusModal.action === 'activate' ? 'Activate' : 'Deactivate'}
                            </Button>
                        </Flex>
                    </Flex>
                )}
            </Modal>

            {/* Detail Drawer */}
            <Drawer
                open={detailOpen}
                onClose={() => setDetailOpen(false)}
                size="large"
                title={
                    <Flex align="center" gap={12}>
                        <Avatar size={48} style={{ backgroundColor: avatarColor(detailRecord?.fullName || '') }}>
                            {detailRecord ? initials(detailRecord.fullName) || <UserOutlined /> : <UserOutlined />}
                        </Avatar>
                        <Space direction="vertical" size={0}>
                            <Text strong style={{ fontSize: 20 }}>
                                {detailRecord?.fullName || 'User details'}
                            </Text>
                            {detailRecord && (
                                <Flex align="center" gap={6}>
                                    {detailRecord.status === 'active' ? (
                                        <CheckCircleFilled style={{ color: '#22C55E', fontSize: 12 }} />
                                    ) : (
                                        <MinusCircleFilled style={{ color: '#EF4444', fontSize: 12 }} />
                                    )}
                                    <Text type="secondary" style={{ textTransform: 'capitalize' }}>
                                        {detailRecord.status}
                                    </Text>
                                </Flex>
                            )}
                        </Space>
                    </Flex>
                }
                footer={
                    detailRecord ? (
                        <Flex justify="space-between" align="center">
                            <Space>
                                <Button
                                    icon={<StopOutlined />}
                                    onClick={() =>
                                        requestStatusChange(
                                            [detailRecord],
                                            detailRecord.status === 'active' ? 'deactivate' : 'activate',
                                        )
                                    }
                                >
                                    {detailRecord.status === 'active' ? 'Deactivate' : 'Activate'}
                                </Button>
                                <Popconfirm
                                    title="Delete this user?"
                                    description="This action cannot be undone."
                                    okText="Delete"
                                    okButtonProps={{ danger: true }}
                                    onConfirm={() => {
                                        setDetailOpen(false);
                                        handleDelete(detailRecord.id);
                                    }}
                                >
                                    <Button danger icon={<DeleteOutlined />}>
                                        Delete user
                                    </Button>
                                </Popconfirm>
                            </Space>
                            <Space>
                                <Button
                                    icon={<EditOutlined />}
                                    onClick={() => {
                                        setDetailOpen(false);
                                        void openEdit(detailRecord);
                                    }}
                                >
                                    Edit
                                </Button>
                                <Button type="primary" onClick={() => setDetailOpen(false)}>
                                    Close
                                </Button>
                            </Space>
                        </Flex>
                    ) : (
                        <Button onClick={() => setDetailOpen(false)}>Close</Button>
                    )
                }
                destroyOnClose
            >
                {detailRecord ? (
                    <Flex vertical gap={24}>
                        <Descriptions column={2} size="middle" bordered={false}>
                            <Descriptions.Item label={<><MailOutlined /> Email</>}>{detailRecord.email}</Descriptions.Item>
                            <Descriptions.Item label={<><ApartmentOutlined /> Branch</>}>
                                {detailRecord.branch || '—'}
                            </Descriptions.Item>
                            <Descriptions.Item label={<><CalendarOutlined /> Birth date</>}>
                                {detailRecord.birthDate ?? '—'}
                            </Descriptions.Item>
                            <Descriptions.Item label={<><IdcardOutlined /> User ID</>}>
                                <Text code copyable style={{ fontSize: 12 }}>
                                    {detailRecord.id}
                                </Text>
                            </Descriptions.Item>
                        </Descriptions>

                        <Flex vertical gap={8}>
                            <Text strong style={{ fontSize: 16 }}>
                                Roles
                            </Text>
                            <Divider style={{ margin: 0 }} />
                        </Flex>
                        <Space size={8} wrap>
                            {detailRecord.roles.map((role) => (
                                <Tag key={role} bordered={false} style={{ fontSize: 14 }}>
                                    {role}
                                </Tag>
                            ))}
                        </Space>
                    </Flex>
                ) : (
                    <Empty description="No user selected" />
                )}
            </Drawer>
        </>
    );
}
