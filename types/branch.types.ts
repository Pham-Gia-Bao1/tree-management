import type { ReactNode } from 'react';

export interface ColumnType<T, TValue = unknown> {
    title: string;
    dataIndex?: keyof T;
    key: string;
    width?: number;
    align?: 'left' | 'center' | 'right';
    sorter?: (a: T, b: T) => number;
    render?: (value: any, record: T) => ReactNode;
}
export type ColumnsType<T> = ColumnType<T, any>[];

export interface BranchRecord {
    id: string;
    code: string;
    name: string;
    city: string;
    isActive: boolean;
    members?: number;
    mentors?: number;
    trainings?: number;
}

export interface BranchInput {
    code?: string;
    name: string;
    city: string;
    isActive?: boolean;
}
