'use client';

import { useEffect, useMemo, useState, type Key } from 'react';
import {
    App,
    Avatar,
    Breadcrumb,
    Button,
    Descriptions,
    Drawer,
    Form,
    Input,
    Modal,
    Result,
    Select,
    Space,
    Table,
    Tag,
    Typography,
} from 'antd';
import {
    DeleteOutlined,
    EditOutlined,
    EyeOutlined,
    PlusOutlined,
    StopOutlined,
    UserOutlined,
} from '@ant-design/icons';

import type { UserRecord } from '@/types/user.types';
import { RoleCode } from '@/types/database.types';
import DataPage from '@/components/common/DataPage';

const { Title, Text } = Typography;

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

    const [editingRecord, setEditingRecord] =
        useState<UserTableRecord | null>(null);

    const [open, setOpen] = useState(false);

    const [form] = Form.useForm();

    // --- Row selection state ---
    const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
    const [selectedRows, setSelectedRows] = useState<UserTableRecord[]>([]);

    // --- Detail drawer state ---
    const [detailRecord, setDetailRecord] =
        useState<UserTableRecord | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    const loadUsers = async () => {
        try {
            setLoading(true);

            const params = new URLSearchParams();

            if (search) params.set('search', search);
            if (branchFilter) params.set('branchId', branchFilter);
            if (roleFilter) params.set('role', roleFilter);
            if (statusFilter) params.set('status', statusFilter);

            const response = await fetch(
                `/api/users?${params.toString()}`,
            );

            if (!response.ok) {
                throw new Error();
            }

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

            if (!response.ok) {
                throw new Error();
            }

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
        void (async () => {
            await loadUsers();
        })();
    }, []);

    const branchFilterOptions = useMemo(
        () =>
            Array.from(
                new Set(data.map((item) => item.branch).filter(Boolean)),
            ).map((branch) => ({
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

            if (branchFilter && user.branch !== branchFilter) {
                return false;
            }

            if (roleFilter && !user.roles.includes(roleFilter as RoleCode)) {
                return false;
            }

            if (statusFilter && user.status !== statusFilter) {
                return false;
            }

            return true;
        });
    }, [data, search, branchFilter, roleFilter, statusFilter]);

    const openCreate = async () => {
        await loadBranches();

        setEditingRecord(null);

        form.resetFields();

        form.setFieldsValue({
            roles: ['MEMBER'],
        });

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

            const payload = {
                name: values.name,
                email: values.email,
                roles: values.roles as RoleCode[],
                branchId: values.branchId,
                status: values.status,
            };

            if (editingRecord) {
                const response = await fetch(
                    `/api/users/${editingRecord.id}`,
                    {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(payload),
                    },
                );

                if (!response.ok) {
                    throw new Error();
                }

                message.success('User updated successfully');
            } else {
                const response = await fetch('/api/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        ...payload,
                        status: 'active',
                    }),
                });

                if (!response.ok) {
                    throw new Error();
                }

                message.success('User created successfully');
            }

            setOpen(false);

            await loadUsers();
        } catch {
            message.error('Failed to save user');
        }
    };

    const handleDelete = (id: string) => {
        modal.confirm({
            title: 'Delete user?',
            content: 'This action cannot be undone.',
            okButtonProps: {
                danger: true,
            },
            async onOk() {
                try {
                    const response = await fetch(`/api/users/${id}`, {
                        method: 'DELETE',
                    });

                    if (!response.ok) {
                        throw new Error();
                    }

                    message.success('User deleted successfully');

                    await loadUsers();
                } catch {
                    message.error('Failed to delete user');
                }
            },
        });
    };

    const toggleStatus = async (record: UserTableRecord) => {
        try {
            const response = await fetch(`/api/users/${record.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status:
                        record.status === 'active' ? 'inactive' : 'active',
                }),
            });

            if (!response.ok) {
                throw new Error();
            }

            message.success('User updated successfully');

            await loadUsers();
        } catch {
            message.error('Failed to update user');
        }
    };

    // --- Selection helpers ---
    const clearSelection = () => {
        setSelectedRowKeys([]);
        setSelectedRows([]);
    };

    const handleSelectionChange = (
        keys: Key[],
        rows: UserTableRecord[],
    ) => {
        setSelectedRowKeys(keys);
        setSelectedRows(rows);
    };

    const handleBulkToggleStatus = async () => {
        try {
            await Promise.all(
                selectedRows.map((row) =>
                    fetch(`/api/users/${row.id}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            status:
                                row.status === 'active'
                                    ? 'inactive'
                                    : 'active',
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
            title: `Delete ${selectedRows.length} user(s)?`,
            content: 'This action cannot be undone.',
            okButtonProps: {
                danger: true,
            },
            async onOk() {
                try {
                    await Promise.all(
                        selectedRows.map((row) =>
                            fetch(`/api/users/${row.id}`, {
                                method: 'DELETE',
                            }),
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
        <>
            <Button
                icon={<EyeOutlined />}
                disabled={selectedRows.length !== 1}
                onClick={() =>
                    selectedRows[0] && openDetail(selectedRows[0])
                }
            >
                View
            </Button>

            <Button
                icon={<EditOutlined />}
                disabled={selectedRows.length !== 1}
                onClick={() =>
                    selectedRows[0] && openEdit(selectedRows[0])
                }
            >
                Edit
            </Button>

            <Button icon={<StopOutlined />} onClick={handleBulkToggleStatus}>
                Toggle Status
            </Button>

            <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleBulkDelete}
            >
                Delete
            </Button>

            <Button onClick={clearSelection}>Cancel</Button>
        </>
    );

    const columns = [
        {
            title: 'User',
            dataIndex: 'name',
            width: 280,
            render: (_: string, record: UserTableRecord) => (
                <div className="flex items-center gap-3">
                    <Avatar size={32} icon={<UserOutlined />} />
                    <div>
                        <div className="font-medium">{record.fullName}</div>
                        <div className="text-xs text-gray-500">
                            {record.email}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            title: 'Roles',
            dataIndex: 'roles',
            width: 200,
            render: (value: RoleCode[]) => (
                <Space size={4} wrap>
                    {value.map((role) => (
                        <Tag key={role}>{role}</Tag>
                    ))}
                </Space>
            ),
        },
        {
            title: 'Branch',
            dataIndex: 'branch',
            width: 180,
        },
        {
            title: 'Birth Date',
            dataIndex: 'birthDate',
            width: 140,
            render: (value: string | null) => value ?? '-',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            width: 120,
            render: (value: string) => (
                <Tag color={value === 'active' ? 'success' : 'default'}>
                    {value}
                </Tag>
            ),
        },
        {
            title: '',
            width: 160,
            align: 'right' as const,
            render: (_: unknown, record: UserTableRecord) => (
                <Space size={4}>
                    <Button
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => openDetail(record)}
                    />

                    <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => openEdit(record)}
                    />

                    <Button
                        size="small"
                        icon={<StopOutlined />}
                        onClick={() => toggleStatus(record)}
                    />

                    <Button
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => handleDelete(record.id)}
                    />
                </Space>
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
    searchPlaceholder="Search users..."
    onSearch={setSearch}
    selectable
    selectedRowKeys={selectedRowKeys}
    onSelectedRowKeysChange={handleSelectionChange}
    selectionActions={selectionActions}
    actions={
        <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreate}
        >
            New User
        </Button>
    }
    filters={
        <>
            <Select
                allowClear
                placeholder="Branch"
                style={{ width: 180 }}
                options={branchFilterOptions}
                onChange={setBranchFilter}
            />

            <Select
                allowClear
                placeholder="Role"
                style={{ width: 140 }}
                onChange={setRoleFilter}
                options={ROLE_OPTIONS}
            />

            <Select
                allowClear
                placeholder="Status"
                style={{ width: 140 }}
                onChange={setStatusFilter}
                options={[
                    {
                        value: 'active',
                        label: 'Active',
                    },
                    {
                        value: 'inactive',
                        label: 'Inactive',
                    },
                    {
                        value: 'pending',
                        label: 'Pending',
                    },
                ]}
            />
        </>
    }
    tableProps={{
        size: 'middle',
        sticky: true,
        scroll: {
            x: 1200,
        },
    }}
/>
<Modal
    open={open}
    width={520}
    title={
        editingRecord
            ? 'Edit User'
            : 'Create User'
    }
    onCancel={() => setOpen(false)}
    onOk={handleSave}
    okText="Save"
>
    <Form
        form={form}
        layout="vertical"
        className="mt-4"
    >
        <Form.Item
            name="name"
            label="Full Name"
            rules={[
                {
                    required: true,
                },
            ]}
        >
            <Input />
        </Form.Item>

        <Form.Item
            name="email"
            label="Email"
            rules={[
                {
                    required: true,
                    type: 'email',
                },
            ]}
        >
            <Input />
        </Form.Item>

        <Form.Item
            name="branchId"
            label="Branch"
            rules={[
                {
                    required: true,
                    message:
                        'Branch is required',
                },
            ]}
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
            rules={[
                {
                    required: true,
                    message:
                        'At least one role is required',
                },
            ]}
        >
            <Select
                mode="multiple"
                placeholder="Select roles"
                options={ROLE_OPTIONS}
            />
        </Form.Item>

        <Form.Item
            name="status"
            label="Status"
            initialValue="active"
            rules={[
                {
                    required: true,
                    message:
                        'Status is required',
                },
            ]}
        >
            <Select
                options={[
                    {
                        value: 'active',
                        label: 'Active',
                    },
                    {
                        value: 'inactive',
                        label: 'Inactive',
                    },
                    {
                        value: 'pending',
                        label: 'Pending',
                    },
                ]}
            />
        </Form.Item>
    </Form>
</Modal>

<Drawer
    open={detailOpen}
    width={420}
    title="User Details"
    onClose={() => setDetailOpen(false)}
    extra={
        detailRecord && (
            <Button
                icon={<EditOutlined />}
                onClick={() => {
                    setDetailOpen(false);
                    void openEdit(detailRecord);
                }}
            >
                Edit
            </Button>
        )
    }
>
    {detailRecord && (
        <>
            <div className="flex items-center gap-3 mb-6">
                <Avatar size={48} icon={<UserOutlined />} />
                <div>
                    <div className="text-base font-medium">
                        {detailRecord.fullName}
                    </div>
                    <div className="text-xs text-gray-500">
                        {detailRecord.email}
                    </div>
                </div>
            </div>

            <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Full Name">
                    {detailRecord.fullName}
                </Descriptions.Item>

                <Descriptions.Item label="Email">
                    {detailRecord.email}
                </Descriptions.Item>

                <Descriptions.Item label="Roles">
                    <Space size={4} wrap>
                        {detailRecord.roles.map((role) => (
                            <Tag key={role}>{role}</Tag>
                        ))}
                    </Space>
                </Descriptions.Item>

                <Descriptions.Item label="Branch">
                    {detailRecord.branch || '-'}
                </Descriptions.Item>

                <Descriptions.Item label="Status">
                    <Tag
                        color={
                            detailRecord.status === 'active'
                                ? 'success'
                                : 'default'
                        }
                    >
                        {detailRecord.status}
                    </Tag>
                </Descriptions.Item>

                <Descriptions.Item label="Birth Date">
                    {detailRecord.birthDate ?? '-'}
                </Descriptions.Item>

                <Descriptions.Item label="User ID">
                    {detailRecord.id}
                </Descriptions.Item>
            </Descriptions>
        </>
    )}
</Drawer>

        </>
    );
}
