'use client';;
import { useState } from 'react';
import {
    Typography,
    Button,
    Input,
    Select,
    Space,
    Tag,
    Avatar,
    Modal,
    Form,
    App,
    Result,
    Breadcrumb,
    Table,
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    StopOutlined,
    EyeOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { USERS, BRANCHES } from '@/lib/trainingDemoData';
// import { useRole } from '@/hooks/useRole';
const { Title, Text } = Typography;
type UserRecord = (typeof USERS)[number];
export default function UsersPage() {
    const { message, modal } = App.useApp();
    const role = true ? 'admin' : 'user'; // useRole() hook can be used here to get actual user role
    const [data, setData] = useState<UserRecord[]>(USERS);
    const [search, setSearch] = useState('');
    const [branchFilter, setBranchFilter] = useState<string>();
    const [roleFilter, setRoleFilter] = useState<string>();
    const [statusFilter, setStatusFilter] = useState<string>();
    const [editingRecord, setEditingRecord] = useState<UserRecord | null>(null);
    const [open, setOpen] = useState(false);
    const [form] = Form.useForm();
    const openCreate = () => {
        setEditingRecord(null);
        form.resetFields();
        setOpen(true);
    };
    const filteredData = data.filter((u) => {
        if (
            search &&
            !u.name.toLowerCase().includes(search.toLowerCase()) &&
            !u.email.toLowerCase().includes(search.toLowerCase())
        )
            return false;
        if (branchFilter && u.branch !== branchFilter) return false;
        if (roleFilter && u.role !== roleFilter) return false;
        if (statusFilter && u.status !== statusFilter) return false;
        return true;
    });
    const filterBar = (
        <>
            <Select
                allowClear
                placeholder="Branch"
                style={{ width: 160 }}
                onChange={setBranchFilter}
                options={BRANCHES.map((b: { name: string }) => ({
                    value: b.name,
                    label: b.name,
                }))}
            />
            <Select
                allowClear
                placeholder="Role"
                style={{ width: 140 }}
                onChange={setRoleFilter}
                options={[
                    {
                        value: 'admin',
                        label: 'Admin',
                    },
                    {
                        value: 'mentor',
                        label: 'Mentor',
                    },
                    {
                        value: 'user',
                        label: 'User',
                    },
                ]}
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
                ]}
            />
        </>
    );
    const openEdit = (record: UserRecord) => {
        setEditingRecord(record);
        form.setFieldsValue(record);
        setOpen(true);
    };
    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setData((prev) =>
                prev.map((item) =>
                    item.id === editingRecord?.id
                        ? { ...item, ...values }
                        : item,
                ),
            );
            message.success('User updated');
            setOpen(false);
        } catch { }
    };
    const handleDelete = (id: string) => {
        modal.confirm({
            title: 'Delete user?',
            content: 'This action cannot be undone.',
            okButtonProps: {
                danger: true,
            },
            onOk() {
                setData((prev) => prev.filter((x) => x.id !== id));
                message.success('User deleted');
            },
        });
    };
    const toggleStatus = (id: string) => {
        setData((prev) =>
            prev.map((u) =>
                u.id === id
                    ? {
                        ...u,
                        status:
                            u.status === 'active'
                                ? 'inactive'
                                : 'active',
                    }
                    : u,
            ),
        );
        message.success('User updated');
    };
    const columns = [
        {
            title: 'User',
            dataIndex: 'name',
            width: 280,
            sorter: (a: UserRecord, b: UserRecord) =>
                a.name.localeCompare(b.name),
            render: (_: string, record: UserRecord) => (
                <div className="flex items-center gap-3">
                    <Avatar
                        size={32}
                        icon={<UserOutlined />}
                        style={{
                            background: '#f6f8fa',
                            color: '#57606a',
                        }}
                    />
                    <div>
                        <div className="font-medium text-[#24292f]">
                            {record.name}
                        </div>
                        <div className="text-xs text-[#656d76]">
                            {record.email}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            title: 'Role',
            dataIndex: 'role',
            width: 120,
            render: (role: string) => (
                <Tag
                    variant="filled"
                    style={{
                        background: '#f6f8fa',
                        color: '#57606a',
                    }}
                >
                    {role}
                </Tag>
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
            render: (v: string) => (
                <span className="text-[#656d76]">{v}</span>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            width: 120,
            render: (status: string) => (
                <Tag
                    variant="filled"
                    color={status === 'active' ? 'success' : 'default'}
                >
                    {status}
                </Tag>
            ),
        },
        {
            title: '',
            width: 140,
            align: 'right' as const,
            render: (_: unknown, record: UserRecord) => (
                <Space size={4}>
                    <Button
                        size="small"
                        icon={<EyeOutlined />}
                    />
                    <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => openEdit(record)}
                    />
                    <Button
                        size="small"
                        icon={<StopOutlined />}
                        onClick={() => toggleStatus(record.id)}
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
    if (role !== null && role !== 'admin') {
        return (
            <Result
                status="403"
                title="403"
                subTitle="You do not have permission to access this page."
            />
        );
    }
    return (
        <div className="space-y-4">
            <div className="space-y-4">
                
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <Title level={3} style={{ marginBottom: 0 }}>
                            Users
                        </Title>
                        <Text type="secondary">
                            Manage system users
                        </Text>
                    </div>
                    <Space>
                        <Button>Export</Button>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={openCreate}
                        >
                            New User
                        </Button>
                    </Space>
                </div>
                <div className="grid gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[#d0d7de] bg-white p-4">
                        <Space wrap>
                            <Input.Search
                                allowClear
                                placeholder="Search..."
                                style={{ width: 280 }}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                            />
                            <Button onClick={() => message.success('Refreshed')}>
                                Refresh
                            </Button>
                        </Space>
                        <Space wrap>{filterBar}</Space>
                    </div>
                    <div className="overflow-hidden rounded-lg border border-[#d0d7de] bg-white">
                        <Table<UserRecord>
                            rowKey="id"
                            columns={columns}
                            dataSource={filteredData}
                            pagination={{
                                showSizeChanger: true,
                                pageSizeOptions: ['10', '20', '50', '100'],
                                showTotal: (total) => `${total} items`,
                            }}
                        />
                    </div>
                </div>
            </div>
            {/* Modal */}
            <Modal
                open={open}
                width={520}
                title="Edit User"
                onCancel={() => setOpen(false)}
                onOk={handleSave}
                okText="Save Changes"
            >
                <Form
                    form={form}
                    layout="vertical"
                    className="mt-4"
                >
                    <Form.Item
                        name="name"
                        label="Full Name"
                        rules={[{ required: true }]}
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
                        name="branch"
                        label="Branch"
                    >
                        <Select
                            options={BRANCHES.map((b: { name: string }) => ({
                                value: b.name,
                                label: b.name,
                            }))}
                        />
                    </Form.Item>
                    <Form.Item
                        name="role"
                        label="Role"
                    >
                        <Select
                            options={[
                                {
                                    value: 'admin',
                                    label: 'Admin',
                                },
                                {
                                    value: 'mentor',
                                    label: 'Mentor',
                                },
                                {
                                    value: 'user',
                                    label: 'User',
                                },
                            ]}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}