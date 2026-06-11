'use client';
import { useState } from 'react';
import { Button, Input, Space, Tag, App, Select, Drawer } from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    SaveOutlined,
    CloseOutlined,
    BookOutlined,
} from '@ant-design/icons';
import { SUBJECTS } from '@/lib/trainingDemoData';
import DataPage from '@/components/common/DataPage';
type SubjectRecord = {
    id: string;
    name: string;
    totalTrainings: number;
    createdDate: string;
    editing?: boolean;
    tempName?: string;
};
const INITIAL_DATA: SubjectRecord[] = SUBJECTS.map((s, i) => ({
    id: s.id,
    name: s.name,
    totalTrainings: [1200, 980, 870, 760, 700][i] ?? 500,
    createdDate: `2024-0${i + 1}-01`,
}));
export default function SubjectsPage() {
    const { message, modal } = App.useApp();
    const [data, setData] = useState<SubjectRecord[]>(INITIAL_DATA);
    const [addingNew, setAddingNew] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState('');
    const startEdit = (id: string) => {
        setData((prev) =>
            prev.map((item) =>
                item.id === id
                    ? {
                        ...item,
                        editing: true,
                        tempName: item.name,
                    }
                    : item,
            ),
        );
    };
    const cancelEdit = (id: string) => {
        setData((prev) =>
            prev.map((item) =>
                item.id === id
                    ? {
                        ...item,
                        editing: false,
                        tempName: undefined,
                    }
                    : item,
            ),
        );
    };
    const saveEdit = (id: string) => {
        const target = data.find((x) => x.id === id);
        if (!target?.tempName?.trim()) {
            message.error('Subject name is required');
            return;
        }
        setData((prev) =>
            prev.map((item) =>
                item.id === id
                    ? {
                        ...item,
                        name: item.tempName!.trim(),
                        editing: false,
                        tempName: undefined,
                    }
                    : item,
            ),
        );
        message.success('Subject updated');
    };
    const addSubject = () => {
        if (!newSubjectName.trim()) {
            message.error('Subject name is required');
            return;
        }
        setData((prev) => [
            {
                id: Date.now().toString(),
                name: newSubjectName.trim(),
                totalTrainings: 0,
                createdDate: new Date()
                    .toISOString()
                    .split('T')[0],
            },
            ...prev,
        ]);
        setAddingNew(false);
        setNewSubjectName('');
        message.success('Subject created');
    };
    const deleteSubject = (id: string) => {
        modal.confirm({
title: 'Delete subject?',
            content:
                'This action cannot be undone.',
            okButtonProps: {
                danger: true,
            },
            onOk() {
                setData((prev) =>
                    prev.filter((x) => x.id !== id),
                );
                message.success('Subject deleted');
            },
        });
    };
    const columns = [
        {
            title: 'Subject',
            dataIndex: 'name',
            width: 420,
            render: (
                name: string,
                record: SubjectRecord,
            ) =>
                record.editing ? (
                    <Input
                        autoFocus
                        value={record.tempName}
                        onPressEnter={() =>
                            saveEdit(record.id)
                        }
                        onChange={(e) =>
                            setData((prev) =>
                                prev.map((item) =>
                                    item.id === record.id
                                        ? {
                                            ...item,
                                            tempName:
                                                e.target.value,
                                        }
                                        : item,
                                ),
                            )
                        }
                    />
                ) : (
                    <div className="flex items-center gap-3">
                        <div
                            className="flex items-center justify-center"
                        >
                            <BookOutlined
                            />
                        </div>
                        <div>
                            <div className="font-medium text-[#24292f]">
                                {name}
                            </div>
                            <div className="text-xs text-[#656d76]">
                                Bible Subject
                            </div>
                        </div>
                    </div>
                ),
        },
        {
            title: 'Trainings',
            dataIndex: 'totalTrainings',
            width: 180,
            render: (value: number) => (
                <Tag
                    variant='outlined'
                >
                    {value.toLocaleString()}
                </Tag>
            ),
            sorter: (
                a: SubjectRecord,
                b: SubjectRecord,
            ) => a.totalTrainings - b.totalTrainings,
        },
        {
            title: 'Created',
            dataIndex: 'createdDate',
            width: 160,
            render: (value: string) => (
                <span className="text-[#656d76]">
                    {value}
                </span>
            ),
        },
        {
            title: '',
width: 140,
            align: 'right' as const,
            render: (
                _: unknown,
                record: SubjectRecord,
            ) =>
                record.editing ? (
                    <Space size={4}>
                        <Button
                            size="small"
                            icon={<SaveOutlined />}
                            onClick={() =>
                                saveEdit(record.id)
                            }
                        />
                        <Button
                            size="small"
                            icon={<CloseOutlined />}
                            onClick={() =>
                                cancelEdit(record.id)
                            }
                        />
                    </Space>
                ) : (
                    <Space size={4}>
                        <Button
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() =>
                                startEdit(record.id)
                            }
                        />
                        <Button
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() =>
                                deleteSubject(record.id)
                            }
                        />
                    </Space>
                ),
        },
    ];
    return (
        <div className="space-y-4">
            {addingNew && (
                <Drawer
                    title="Add new subject"
                    open={addingNew}
                    onClose={() => {
                        setAddingNew(false);
                        setNewSubjectName("");
                    }}
                    destroyOnClose
                    width={420}
                    footer={
                        <div className="flex justify-end gap-2">
                            <Button
                                onClick={() => {
                                    setAddingNew(false);
                                    setNewSubjectName("");
                                }}
                            >
                                Cancel
                            </Button>
                            <Button type="primary" onClick={addSubject}>
                                Save
                            </Button>
                        </div>
                    }
                >
                    <div className="flex flex-col gap-3">
                        <Input
                            autoFocus
                            value={newSubjectName}
                            placeholder="Subject name..."
                            onPressEnter={addSubject}
                            onChange={(e) =>
                                setNewSubjectName(e.target.value)
}
                        />
                    </div>
                </Drawer>
            )}
            <DataPage<SubjectRecord>
                title="Subjects"
                subtitle="Manage bible training subjects"
                breadcrumbs={[
                    'Administration',
                    'Subjects',
                ]}
                columns={columns}
                dataSource={data}
                onSearch={() => { }}
                onRefresh={() =>
                    message.success('Refreshed')
                }
                filters={<>
                    <div>
                        <div className="flex flex-wrap gap-3">
                            <Select
                                allowClear
                                placeholder="Subject"
                                style={{ width: 180 }}
                                options={SUBJECTS.map(
                                    (subject) => ({
                                        value: subject.name,
                                        label: subject.name,
                                    }),
                                )}
                            />
                        </div>
                    </div>
                </>}
                actions={
                    <>
                        <Button>
                            Export
                        </Button>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setAddingNew((prev) => !prev)}
                        >
                            New Subject
                        </Button>
                    </>
                }
            />
        </div >
    );
}