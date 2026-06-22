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
    Tag,
} from 'antd';

import {
    EditOutlined,
    DeleteOutlined,
    PlusOutlined,
} from '@ant-design/icons';


import type {
    TrainingRelationRecord,
} from '@/types/training-link.types';

import type {
    CourseRecord,
} from '@/types/course.types';

import type {
    UserRecord,
} from '@/types/user.types';
import { ColumnsType } from 'antd/es/table';
import { renderText } from '@/utils/renderText';
import DataPage from '@/components/common/DataPage';



const { Title, Text } = Typography;



type RelationRow =
    TrainingRelationRecord & {
        key:string;
    };




export default function TrainingRelations(){

const [loading,setLoading] =
    useState(false);
    const {message} =
        App.useApp();


    const [search,setSearch] =
        useState('');


    const [open,setOpen] =
        useState(false);


    const [editing,setEditing] =
        useState<RelationRow|null>(null);


    const [relations,setRelations] =
        useState<RelationRow[]>([]);


    const [courses,setCourses] =
        useState<CourseRecord[]>([]);


    const [users,setUsers] =
        useState<UserRecord[]>([]);


    const [form] =
        Form.useForm();




    const loadData = async()=>{
        setLoading(true);
        try{


            const [
                relationRes,
                courseRes,
                userRes,

            ] = await Promise.all([

                fetch('/api/training-relations'),

                fetch('/api/courses'),

                fetch('/api/users'),

            ]);



            const [
                relationData,
                courseData,
                userData,

            ] = await Promise.all([

                relationRes.json(),

                courseRes.json(),

                userRes.json(),

            ]);



            setRelations(

                (relationData.data ?? [])
                .map(
                    (item:TrainingRelationRecord)=>({
                        ...item,
                        key:item.id
                    })
                )

            );


            setCourses(
                courseData.data ?? []
            );


            setUsers(
                userData.data ?? []
            );


        }catch{

            message.error(
                'Load data failed'
            );

        } finally{

            setLoading(false);
        }

    };



    useEffect(()=>{

        loadData();

    },[]);




    const mentorOptions =
        useMemo(()=>{


            return users

            .filter(user=>

                user.roles?.includes('MENTOR')
                ||
                user.roles?.includes('ADMIN')

            )

            .map(user=>({

                value:user.id,

                label:user.name,

            }));


        },[users]);





    const discipleOptions =
        useMemo(()=>{


            return users.map(user=>({

                value:user.id,

                label:user.name,

            }));


        },[users]);




    const courseOptions =
        useMemo(()=>{


            return courses.map(course=>({

                value:course.id,

                label:course.name,

            }));


        },[courses]);






    const filteredData =
        relations.filter(item=>{


            if(!search)
                return true;


            const keyword =
                search.toLowerCase();



            return [

                item.mentorName,

                item.discipleName,

                item.courseName,

                item.branchName,

            ]

            .filter(Boolean)

            .some(value=>

                String(value)
                .toLowerCase()
                .includes(keyword)

            );


        });







    const openCreate = ()=>{

        setEditing(null);

        form.resetFields();

        setOpen(true);

    };





    const openEdit = (
        record:RelationRow
    )=>{


        setEditing(record);


        form.setFieldsValue({

            courseId:
                record.courseId,


            mentorId:
                record.mentorId,


            discipleId:
                record.discipleId,


            startDate:
                record.startDate,


            endDate:
                record.endDate,


            notes:
                record.notes,

        });


        setOpen(true);

    };







    const handleSave = async()=>{


        try{


            const values =
                await form.validateFields();



            const payload:TrainingRelationRecord = {


                courseId:
                    values.courseId,


                mentorId:
                    values.mentorId,


                discipleId:
                    values.discipleId,


                startDate:
                    values.startDate,


                endDate:
                    values.endDate ?? null,


                status:
                    'in_progress',


                notes:
                    values.notes ?? null,


            };



            const url =
                editing

                ? `/api/training-relations/${editing.id}`

                : '/api/training-relations';



            const method =
                editing
                ? 'PUT'
                : 'POST';




            await fetch(
                url,
                {
                    method,

                    headers:{
                        'Content-Type':
                            'application/json'
                    },

                    body:
                        JSON.stringify(payload)
                }
            );



            message.success(
                editing
                ? 'Updated'
                : 'Created'
            );



            setOpen(false);

            loadData();



        }catch{

        }


    };








    const handleDelete = async(
        id:string
    )=>{


        await fetch(
            `/api/training-relations/${id}`,
            {
                method:'DELETE'
            }
        );


        message.success(
            'Deleted'
        );


        loadData();

    };


const columns: ColumnsType<RelationRow> = [
    {
        title: 'Mentor',
        dataIndex: 'mentorName',
        width: 220,
        ellipsis: true,
        render: renderText,
    },

    {
        title: 'Disciple',
        dataIndex: 'discipleName',
        width: 220,
        ellipsis: true,
        render: renderText,
    },

    {
        title: 'Course',
        dataIndex: 'courseName',
        width: 260,
        ellipsis: true,
        render: renderText,
    },

    {
        title: 'Branch',
        dataIndex: 'branchName',
        width: 180,
        ellipsis: true,
        render: renderText,
    },

    {
        title: 'Start Date',
        dataIndex: 'startDate',
        width: 140,
        align: 'center',
    },

    {
        title: 'End Date',
        dataIndex: 'endDate',
        width: 140,
        align: 'center',
        render: (v: string | null) => v ?? '-',
    },

    {
        title: 'Status',
        dataIndex: 'status',
        width: 140,
        align: 'center',
        render: (status: string) => (
            <Tag
                color={
                    status === 'COMPLETED'
                        ? 'green'
                        : status === 'IN_PROGRESS'
                        ? 'blue'
                        : 'default'
                }
            >
                {status}
            </Tag>
        ),
    },

    {
        title: 'Actions',
        width: 120,
        fixed: 'right',
        align: 'center',
        render: (_: unknown, row: RelationRow) => (
            <Space size={4}>
                <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => openEdit(row)}
                />

                <Popconfirm
                    title="Delete relation?"
                    onConfirm={() => handleDelete(row.id)}
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







            <DataPage<RelationRow>
    title="Training Relations"
    subtitle="Manage mentor-disciple training relationships"
    columns={columns}
    dataSource={filteredData}
    searchable
    loading={loading}
    // onSearch={(keyword) => {
    //     setKeyword(keyword);
    // }}
    // onRefresh={() => {
    //     void loadRelations();
    // }}
/>








            <Drawer

                open={open}

                size="large"

                title={
                    editing
                    ? 'Edit'
                    : 'Create'
                }

                onClose={()=>{
                    setOpen(false)
                }}


                footer={

                    <Button
                        type="primary"
                        onClick={handleSave}
                    >
                        Save
                    </Button>

                }

            >


                <Form
                    form={form}
                    layout="vertical"
                >


                    <Form.Item
                        label="Course"
                        name="courseId"
                        rules={[
                            {
                                required:true
                            }
                        ]}
                    >

                        <Select
                            options={courseOptions}
                        />

                    </Form.Item>



                    <Form.Item
                        label="Mentor"
                        name="mentorId"
                        rules={[
                            {
                                required:true
                            }
                        ]}
                    >

                        <Select
                            options={mentorOptions}
                        />

                    </Form.Item>



                    <Form.Item
                        label="Disciple"
                        name="discipleId"
                        rules={[
                            {
                                required:true
                            }
                        ]}
                    >

                        <Select
                            options={discipleOptions}
                        />

                    </Form.Item>




                    <Form.Item
                        label="Start Date"
                        name="startDate"
                        rules={[
                            {
                                required:true
                            }
                        ]}
                    >

                        <Input placeholder="YYYY-MM-DD"/>

                    </Form.Item>



                    <Form.Item
                        label="End Date"
                        name="endDate"
                    >

                        <Input placeholder="YYYY-MM-DD"/>

                    </Form.Item>



                    <Form.Item
                        label="Notes"
                        name="notes"
                    >

                        <Input.TextArea rows={4}/>

                    </Form.Item>


                </Form>


            </Drawer>


        </div>

    );

}
