'use client';

import { useEffect, useMemo, useState, type Key } from 'react';
import {
    App,
    Avatar,
    Button,
    Descriptions,
    Divider,
    Drawer,
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
    Tooltip,
    Typography,
} from 'antd';
import {
    ApartmentOutlined,
    CalendarOutlined,
    DeleteOutlined,
    EditOutlined,
    EyeOutlined,
    FilterOutlined,
    IdcardOutlined,
    MailOutlined,
    PlusOutlined,
    StopOutlined,
    UserOutlined,
} from '@ant-design/icons';

import type { UserRecord } from '@/types/user.types';
import { RoleCode } from '@/types/database.types';
import DataPage from '@/components/common/DataPage';

const { Text, Title } = Typography;

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

const ROLE_COLORS: Record<RoleCode, string> = {
    ADMIN: 'red',
    MENTOR: 'blue',
    MEMBER: 'green',
};

const STATUS_COLORS: Record<string, string> = {
    active: 'success',
    inactive: 'default',
    pending: 'warning',
};

const STATUS_OPTIONS = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending' },
];

const AVATAR_PALETTE = [
    '#f56a00',
    '#7265e6',
    '#ffbf00',
    '#00a2ae',
    '#1677ff',
    '#eb2f96',
    '#52c41a',
];

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

export default function UsersPage() {
    const { message, modal } = App.useApp();

    // TODO: wire this up to the authenticated user (see lib/auth/get-current-user.ts)
    // once a client-side auth/session hook is available.
    const currentUserRoles: RoleCode[] = ['ADMIN'];

    const [data, setData] = useState<UserTableRecord[]>([]);
    const [loading, setLoading] = useState(false);

    const [branchOptions, setBranchOptions] = useState<BranchOption[]>([]);
    const [branchLoading, setBranchLoading] = useState(false);

    const [search, setSearch] = useState('');
    const [branchFilter, setBranchFilter] = useState<string>();
    const [roleFilter, setRoleFilter] = useState<string>();
    const [statusFilter, setStatusFilter] = useState<string>();

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

    const loadUsers = async () => {
        try {
            setLoading(true);

            const params = new URLSearchParams();

            if (search) params.set('search', search);
            if (branchFilter) params.set('branchId', branchFilter);
            if (roleFilter) params.set('role', roleFilter);
            if (statusFilter) params.set('status', statusFilter);

            const response = await fetch(`/api/users?${params.toString()}`);

            if (!response.ok) throw new Error();

            const payload = await response.json();

            const users: UserTableRecord[] = (payload.data ?? []).map(
                (user: UserRecord) => ({
                    ...user,
                    branch: user.branchName ?? '',
                }),
            );

            setData(users);
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
            Array.from(new Set(data.map((item) => item.branch).filter(Boolean))).map(
                (branch) => ({ value: branch, label: branch }),
            ),
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

            if (branchFilter && user.branch !== branchFilter) return false;
            if (roleFilter && !user.roles.includes(roleFilter as RoleCode)) return false;
            if (statusFilter && user.status !== statusFilter) return false;

            return true;
        });
    }, [data, search, branchFilter, roleFilter, statusFilter]);

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

    const toggleStatus = async (record: UserTableRecord) => {
        try {
            const response = await fetch(`/api/users/${record.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: record.status === 'active' ? 'inactive' : 'active',
                }),
            });

            if (!response.ok) throw new Error();

            message.success('User updated successfully');
            await loadUsers();
        } catch {
            message.error('Failed to update user');
        }
    };

    const handleBulkToggleStatus = async () => {
        try {
            await Promise.all(
                selectedRows.map((row) =>
                    fetch(`/api/users/${row.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            status: row.status === 'active' ? 'inactive' : 'active',
                        }),
                    }),
                ),
            );

            message.success('Users updated successfully');
            clearSelection();
            await loadUsers();
        } catch {
            message.error('Failed to update users');
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
                    await Promise.all(
                        selectedRows.map((row) =>
                            fetch(`/api/users/${row.id}`, { method: 'DELETE' }),
                        ),
                    );

                    message.success('Users deleted successfully');
                    clearSelection();
                    await loadUsers();
                } catch {
                    message.error('Failed to delete users');
                }
            },
        });
    };

    const selectionActions = (
        <Space>
            <Button
                icon={<EyeOutlined />}
                disabled={selectedRows.length !== 1}
                onClick={() => selectedRows[0] && openDetail(selectedRows[0])}
            >
                View
            </Button>
            <Button
                icon={<EditOutlined />}
                disabled={selectedRows.length !== 1}
                onClick={() => selectedRows[0] && openEdit(selectedRows[0])}
            >
                Edit
            </Button>
            <Button icon={<StopOutlined />} onClick={handleBulkToggleStatus}>
                Toggle status
            </Button>
            <Button danger icon={<DeleteOutlined />} onClick={handleBulkDelete}>
                Delete
            </Button>
        </Space>
    );

    const columns = [
        {
            title: 'User',
            dataIndex: 'name',
            width: 280,
            render: (_: string, record: UserTableRecord) => (
                <Flex align="center" gap={12}>
                    <Avatar
                        size={36}
                        style={{ backgroundColor: avatarColor(record.fullName), flexShrink: 0 }}
                    >
                        {initials(record.fullName) || <UserOutlined />}
                    </Avatar>
                    <Flex vertical gap={2}>
                        <Text strong>{record.fullName}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {record.email}
                        </Text>
                    </Flex>
                </Flex>
            ),
        },
        {
            title: 'Roles',
            dataIndex: 'roles',
            width: 200,
            render: (value: RoleCode[]) => (
                <Space size={4} wrap>
                    {value.map((role) => (
                        <Tag key={role} color={ROLE_COLORS[role]} bordered={false}>
                            {role}
                        </Tag>
                    ))}
                </Space>
            ),
        },
        {
            title: 'Branch',
            dataIndex: 'branch',
            width: 180,
            render: (value: string) => value || <Text type="secondary">—</Text>,
        },
        {
            title: 'Birth date',
            dataIndex: 'birthDate',
            width: 140,
            render: (value: string | null) => value ?? <Text type="secondary">—</Text>,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            width: 120,
            render: (value: string) => (
                <Tag color={STATUS_COLORS[value] ?? 'default'} bordered={false}>
                    {value}
                </Tag>
            ),
        },
    ];

    if (!currentUserRoles.includes('ADMIN')) {
        return (
            <Result
                status="403"
                title="403"
                subTitle="You do not have permission to access this page."
            />
        );
    }

    return (
        <>
            <DataPage<UserTableRecord>
                title="Users"
                subtitle="Manage system users"
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
                selectionActions={selectionActions}
                selectionLabel="user"
                actions={
                    <Space>
                        <Button
                            icon={<FilterOutlined />}
                            onClick={() => setFilterDrawerOpen(true)}
                        >
                            Filters
                        </Button>
                        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                            New user
                        </Button>
                    </Space>
                }
                tableProps={{
                    size: 'middle',
                    sticky: true,
                    scroll: { x: 1200 },
                }}
            />

            {/* Filter Drawer */}
            <Drawer
                title="Filters"
                placement="right"
                open={filterDrawerOpen}
                onClose={() => setFilterDrawerOpen(false)}
                width={360}
                destroyOnClose
                footer={
                    <Button onClick={() => setFilterDrawerOpen(false)} block>
                        Close
                    </Button>
                }
            >
                <Flex vertical gap={16}>
                    <Select
                        allowClear
                        placeholder="Branch"
                        style={{ width: '100%' }}
                        options={branchFilterOptions}
                        onChange={setBranchFilter}
                        value={branchFilter}
                    />
                    <Select
                        allowClear
                        placeholder="Role"
                        style={{ width: '100%' }}
                        onChange={setRoleFilter}
                        options={ROLE_OPTIONS}
                        value={roleFilter}
                    />
                    <Select
                        allowClear
                        placeholder="Status"
                        style={{ width: '100%' }}
                        onChange={setStatusFilter}
                        options={STATUS_OPTIONS}
                        value={statusFilter}
                    />
                    <Button
                        onClick={() => {
                            setBranchFilter(undefined);
                            setRoleFilter(undefined);
                            setStatusFilter(undefined);
                        }}
                    >
                        Reset filters
                    </Button>
                </Flex>
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
                    <Form.Item
                        name="email"
                        label="Email"
                        rules={[{ required: true, type: 'email' }]}
                    >
                        <Input placeholder="jane@example.com" />
                    </Form.Item>
                    <Form.Item
                        name="branchId"
                        label="Branch"
                        rules={[{ required: true, message: 'Branch is required' }]}
                    >
                        <Select
                            loading={branchLoading}
                            placeholder="Select branch"
                            options={branchOptions}
                            showSearch
                            optionFilterProp="label"
                        />
                    </Form.Item>
                    <Form.Item
                        name="roles"
                        label="Roles"
                        rules={[{ required: true, message: 'At least one role is required' }]}
                    >
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

            {/* Detail Drawer */}
            <Drawer
                open={detailOpen}
                onClose={() => setDetailOpen(false)}
                size="large"
                title={
                    <Flex align="center" gap={12}>
                        <Avatar
                            size={48}
                            style={{ backgroundColor: avatarColor(detailRecord?.fullName || '') }}
                        >
                            {detailRecord ? initials(detailRecord.fullName) || <UserOutlined /> : <UserOutlined />}
                        </Avatar>
                        <Space direction="vertical" size={0}>
                            <Text strong style={{ fontSize: 20 }}>
                                {detailRecord?.fullName || 'User details'}
                            </Text>
                            {detailRecord && (
                                <Tag color={STATUS_COLORS[detailRecord.status] ?? 'default'}>
                                    {detailRecord.status}
                                </Tag>
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
                                    onClick={() => {
                                        void toggleStatus(detailRecord);
                                    }}
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
                        <Flex vertical gap={12}>
                            <Descriptions column={2} size="middle" bordered={false}>
                                <Descriptions.Item label={<><MailOutlined /> Email</>}>
                                    {detailRecord.email}
                                </Descriptions.Item>
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
                        </Flex>

                        <Divider orientation="left">Roles</Divider>
                        <Space size={8} wrap>
                            {detailRecord.roles.map((role) => (
                                <Tag key={role} color={ROLE_COLORS[role]} bordered={false} style={{ fontSize: 14 }}>
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
