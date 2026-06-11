'use client';
import { useState } from 'react';
import {
    Breadcrumb,
    Card,
    Typography,
    Button,
    Input,
    Space,
    Form,
    DatePicker,
    Select,
    Popconfirm,
    App,
    Drawer,
    Table,
} from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { BRANCHES, SUBJECTS, TRAINING_RELATIONS, USERS } from '@/lib/trainingDemoData';
const { Title, Text } = Typography;
type TrainingRecord = (typeof TRAINING_RELATIONS)[number] & {
    key?: string;
};
export default function TrainingRelations() {
    const { message } = App.useApp();
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] =
        useState<TrainingRecord | null>(null);
    const [data, setData] = useState<TrainingRecord[]>(
        TRAINING_RELATIONS.map((item) => ({
            ...item,
            key: item.id,
        })),
    );
    const [form] = Form.useForm();
    const filteredData = data.filter((record) => {
        if (!search) return true;
        const keyword = search.toLowerCase();
        return (
            record.mentor.toLowerCase().includes(keyword) ||
            record.disciple.toLowerCase().includes(keyword) ||
            record.subject.toLowerCase().includes(keyword) ||
            record.branch.toLowerCase().includes(keyword)
        );
    });
    const openCreate = () => {
        setEditingRecord(null);
        form.resetFields();
        setModalOpen(true);
    };
    const openEdit = (record: TrainingRecord) => {
        setEditingRecord(record);
        form.setFieldsValue(record);
        setModalOpen(true);
    };
    const handleDelete = (id: string) => {
        setData((prev) =>
            prev.filter((item) => item.id !== id),
        );
        message.success('Relation deleted');
    };
    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            if (editingRecord) {
                setData((prev) =>
                    prev.map((item) =>
                        item.id === editingRecord.id
                            ? {
                                ...item,
                                ...values,
                            }
                            : item,
                    ),
                );
                message.success('Relation updated');
            } else {
                const id = String(Date.now());
                setData((prev) => [
                    ...prev,
                    {
                        ...values,
                        id,
                        key: id,
                        createdBy: 'Admin',
                    },
                ]);
                message.success('Relation created');
            }
            setModalOpen(false);
        } catch { }
    };
    const columns = [
        {
            title: 'Mentor',
dataIndex: 'mentor',
            sorter: (
                a: TrainingRecord,
                b: TrainingRecord,
            ) => a.mentor.localeCompare(b.mentor),
            render: (value: string) => (
                <span className="font-medium text-[#24292f]">
                    {value}
                </span>
            ),
        },
        {
            title: 'Disciple',
            dataIndex: 'disciple',
            render: (value: string) => (
                <span className="text-[#24292f]">
                    {value}
                </span>
            ),
        },
        {
            title: 'Subject',
            dataIndex: 'subject',
            render: (value: string) => (
                <span className="text-[#0969da] font-medium">
                    {value}
                </span>
            ),
        },
        {
            title: 'Branch',
            dataIndex: 'branch',
            render: (value: string) => (
                <span className="text-[#656d76]">
                    {value}
                </span>
            ),
        },
        {
            title: 'Start Date',
            dataIndex: 'startDate',
        },
        {
            title: 'End Date',
            dataIndex: 'endDate',
        },
        {
            title: 'Created By',
            dataIndex: 'createdBy',
            render: (value: string) => (
                <span className="text-[#656d76]">
                    {value}
                </span>
            ),
        },
        {
            title: '',
            key: 'actions',
            width: 100,
            align: 'right' as const,
            render: (
                _: unknown,
                record: TrainingRecord,
            ) => (
                <Space size={4}>
                    <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => openEdit(record)}
                    />
                    <Popconfirm
                        title="Delete relation?"
                        onConfirm={() =>
                            handleDelete(record.id)
                        }
                    >
                        <Button
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                        />
                    </Popconfirm>
                </Space>
            ),
        },
    ];
    return (
        <div className="space-y-4">
            <div className="space-y-4">
                <Breadcrumb
                    items={[
                        { title: 'Administration' },
                        { title: 'Training Relations' },
                    ]}
                />
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <Title level={3} style={{ marginBottom: 0 }}>
                            Training Relations
                        </Title>
                        <Text type="secondary">
                            Manage discipleship relationships
                        </Text>
                    </div>
                    <Space>
                        <Button>Export</Button>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={openCreate}
                        >
                            New Training Relation
                        </Button>
                    </Space>
                </div>
                <Card>
                    <div className="flex flex-wrap items-center justify-between gap-4">
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
                        <Space wrap>
                            <Select
                                allowClear
                                placeholder="Subject"
                                style={{ width: 180 }}
                                options={SUBJECTS.map((subject) => ({
                                    value: subject.name,
                                    label: subject.name,
                                }))}
                            />
                            <Select
                                allowClear
                                placeholder="Branch"
                                style={{ width: 180 }}
                                options={BRANCHES.map((branch) => ({
                                    value: branch.name,
                                    label: branch.name,
                                }))}
                            />
                            <DatePicker.RangePicker />
                        </Space>
                    </div>
                </Card>
                <Card styles={{ body: { padding: 0 } }}>
                    <Table<TrainingRecord>
                        rowKey="id"
                        columns={columns}
                        dataSource={filteredData}
                        pagination={{
                            showSizeChanger: true,
                            pageSizeOptions: ['10', '20', '50', '100'],
                            showTotal: (total) => `${total} items`,
                        }}
                    />
                </Card>
            </div>
            <Drawer
                open={modalOpen}
                title={
                    editingRecord
                        ? 'Edit Training Relation'
                        : 'Create Training Relation'
                }
                placement="right"
                size="large"
                onClose={() => setModalOpen(false)}
                footer={
                    <Space style={{ width: '100%', justifyContent: 'end' }}>
                        <Button
                            onClick={() =>
                                setModalOpen(false)
                            }
                        >
                            Cancel
                        </Button>
                        <Button
                            type="primary"
                            onClick={handleSave}
                        >
                            Save
                        </Button>
                    </Space>
                }
            >
                <Form
                    form={form}
                    layout="vertical"
                >
                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item
                            label="Mentor"
name="mentor"
                            rules={[
                                {
                                    required: true,
                                },
                            ]}
                        >
                            <Select
                                placeholder="Select mentor"
                                options={USERS.filter(
                                    (user) =>
                                        user.role ===
                                        'mentor',
                                ).map((user) => ({
                                    value: user.name,
                                    label: user.name,
                                }))}
                            />
                        </Form.Item>
                        <Form.Item
                            label="Disciple"
                            name="disciple"
                            rules={[
                                {
                                    required: true,
                                },
                            ]}
                        >
                            <Select
                                placeholder="Select disciple"
                                options={USERS.map(
                                    (user) => ({
                                        value: user.name,
                                        label: user.name,
                                    }),
                                )}
                            />
                        </Form.Item>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item
                            label="Subject"
                            name="subject"
                            rules={[
                                {
                                    required: true,
                                },
                            ]}
                        >
                            <Select
                                placeholder="Select subject"
                                options={SUBJECTS.map(
                                    (subject) => ({
                                        value: subject.name,
                                        label: subject.name,
                                    }),
                                )}
                            />
                        </Form.Item>
                        <Form.Item
                            label="Branch"
                            name="branch"
                            rules={[
                                {
                                    required: true,
                                },
                            ]}
                        >
                            <Select
                                placeholder="Select branch"
                                options={BRANCHES.map(
(branch) => ({
                                        value: branch.name,
                                        label: branch.name,
                                    }),
                                )}
                            />
                        </Form.Item>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item
                            label="Start Date"
                            name="startDate"
                            rules={[
                                {
                                    required: true,
                                },
                            ]}
                        >
                            <Input type="date" />
                        </Form.Item>
                        <Form.Item
                            label="End Date"
                            name="endDate"
                        >
                            <Input type="date" />
                        </Form.Item>
                    </div>
                </Form>
            </Drawer>
        </div>
    );
}