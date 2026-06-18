'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    Breadcrumb,
    Card,
    Typography,
    Button,
    Input,
    Space,
    Form,
    Select,
    Popconfirm,
    App,
    Drawer,
    Table,
} from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { TrainingRelationRecord } from '@/types/training-link.types';
import type { CourseRecord } from '@/types/course.types';
import type { UserRecord } from '@/types/user.types';

const { Title, Text } = Typography;

type RelationRow = TrainingRelationRecord & { key: string };

export default function TrainingRelations() {
    const { message } = App.useApp();
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<RelationRow | null>(null);
    const [data, setData] = useState<RelationRow[]>([]);
    const [courses, setCourses] = useState<CourseRecord[]>([]);
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [form] = Form.useForm();

    useEffect(() => {
        void (async () => {
            try {
                const [relationsResponse, coursesResponse, usersResponse] = await Promise.all([
                    fetch('/api/training-relations'),
                    fetch('/api/courses'),
                    fetch('/api/users'),
                ]);
                const relationsPayload = await relationsResponse.json();
                const coursesPayload = await coursesResponse.json();
                const usersPayload = await usersResponse.json();
                setData((relationsPayload.data ?? []).map((relation: TrainingRelationRecord) => ({ ...relation, key: relation.id })));
                setCourses(coursesPayload.data ?? []);
                setUsers(usersPayload.data ?? []);
            } catch {
                message.error('Failed to load training relations');
            }
        })();
    }, [message]);

    const mentorOptions = useMemo(
        () => users.filter((user) => user.role === 'ADMIN' || user.role === 'MEMBER').map((user) => ({ value: user.id, label: user.name })),
        [users],
    );

    const discipleOptions = mentorOptions;
    const courseOptions = useMemo(
        () => courses.map((course) => ({ value: course.id, label: course.name })),
        [courses],
    );

    const filteredData = data.filter((record) => {
        if (!search) return true;
        const keyword = search.toLowerCase();
        return [record.mentorName, record.discipleName, record.courseName, record.branchName]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(keyword));
    });

    const openCreate = () => {
        setEditingRecord(null);
        form.resetFields();
        setModalOpen(true);
    };

    const openEdit = (record: RelationRow) => {
        setEditingRecord(record);
        form.setFieldsValue({
            courseId: record.courseId,
            mentorId: record.mentorId,
            discipleId: record.discipleId,
            startMonth: record.startMonth,
            endMonth: record.endMonth,
            notes: record.notes,
        });
        setModalOpen(true);
    };

    const handleDelete = (id: string) => {
        setData((prev) => prev.filter((item) => item.id !== id));
        message.success('Relation deleted');
    };

    const handleSave = async () => {
    try {
        const values = await form.validateFields();

        if (editingRecord) {
            // TODO: call PUT API sau này
            message.info('Update API not implemented yet');
            return;
        }

        const response = await fetch('/api/training-relations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                courseId: values.courseId,
                mentorId: values.mentorId,
                discipleId: values.discipleId,
                startMonth: values.startMonth,
                endMonth: values.endMonth || null,
                notes: values.notes || null,
                createdBy: 'Admin',
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result?.message || 'Failed to create relation');
        }

        const relation = result.data;

        setData((prev) => [
            {
                ...relation,
                key: relation.id,
            },
            ...prev,
        ]);

        message.success('Relation created');
        setModalOpen(false);
        form.resetFields();
    } catch (error) {
        message.error(
            error instanceof Error
                ? error.message
                : 'Failed to create relation'
        );
    }
};

    const columns = [
       {
  title: 'Mentor',
  dataIndex: 'mentorName',
  sorter: (a: RelationRow, b: RelationRow) =>
    (a.mentorName ?? '').localeCompare(b.mentorName ?? ''),
  render: (value?: string) => (
    <span className="font-medium text-[#24292f]">
      {value ?? '-'}
    </span>
  ),
},
        {
            title: 'Disciple',
            dataIndex: 'discipleName',
            render: (value: string) => <span className="text-[#24292f]">{value}</span>,
        },
        {
            title: 'Course',
            dataIndex: 'courseName',
            render: (value: string) => <span className="text-[#0969da] font-medium">{value}</span>,
        },
        {
            title: 'Branch',
            dataIndex: 'branchName',
            render: (value: string | undefined) => <span className="text-[#656d76]">{value ?? '-'}</span>,
        },
        {
            title: 'Start Month',
            dataIndex: 'startMonth',
        },
        {
            title: 'End Month',
            dataIndex: 'endMonth',
            render: (value: string | null) => value ?? '-',
        },
        {
            title: 'Created By',
            dataIndex: 'createdBy',
            render: (value: string | null) => <span className="text-[#656d76]">{value ?? '-'}</span>,
        },
        {
            title: '',
            key: 'actions',
            width: 100,
            align: 'right' as const,
            render: (_: unknown, record: RelationRow) => (
                <Space size={4}>
                    <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
                    <Popconfirm title="Delete relation?" onConfirm={() => handleDelete(record.id)}>
                        <Button danger size="small" icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div className="space-y-4">
            <Breadcrumb items={[{ title: 'Administration' }, { title: 'Training Relations' }]} />
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <Title level={3} style={{ marginBottom: 0 }}>Training Relations</Title>
                    <Text type="secondary">Manage discipleship relationships</Text>
                </div>
                <Space>
                    <Button>Export</Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>New Training Relation</Button>
                </Space>
            </div>
            <Card>
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <Space wrap>
                        <Input.Search allowClear placeholder="Search..." style={{ width: 280 }} onChange={(event) => setSearch(event.target.value)} />
                        <Button onClick={() => message.success('Refreshed')}>Refresh</Button>
                    </Space>
                    <Space wrap>
                        <Select allowClear placeholder="Course" style={{ width: 180 }} options={courseOptions} />
                        <Select allowClear placeholder="Mentor" style={{ width: 180 }} options={mentorOptions} />
                    </Space>
                </div>
            </Card>
            <Card styles={{ body: { padding: 0 } }}>
                <Table<RelationRow> rowKey="id" columns={columns} dataSource={filteredData} pagination={{ showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], showTotal: (total) => `${total} items` }} />
            </Card>
            <Drawer
                open={modalOpen}
                title={editingRecord ? 'Edit Training Relation' : 'Create Training Relation'}
                placement="right"
                size="large"
                onClose={() => setModalOpen(false)}
                footer={<Space style={{ width: '100%', justifyContent: 'end' }}><Button onClick={() => setModalOpen(false)}>Cancel</Button><Button type="primary" onClick={handleSave}>Save</Button></Space>}
            >
                <Form form={form} layout="vertical">
                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item label="Course" name="courseId" rules={[{ required: true }]}>
                            <Select placeholder="Select course" options={courseOptions} />
                        </Form.Item>
                        <Form.Item label="Mentor" name="mentorId" rules={[{ required: true }]}>
                            <Select placeholder="Select mentor" options={mentorOptions} />
                        </Form.Item>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item label="Disciple" name="discipleId" rules={[{ required: true }]}>
                            <Select placeholder="Select disciple" options={discipleOptions} />
                        </Form.Item>
                        <Form.Item label="Start Month" name="startMonth" rules={[{ required: true }]}>
                            <Input placeholder="2026-06" />
                        </Form.Item>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item label="End Month" name="endMonth">
                            <Input placeholder="2026-12" />
                        </Form.Item>
                        <Form.Item label="Notes" name="notes">
                            <Input.TextArea rows={3} />
                        </Form.Item>
                    </div>
                </Form>
            </Drawer>
        </div>
    );
}
