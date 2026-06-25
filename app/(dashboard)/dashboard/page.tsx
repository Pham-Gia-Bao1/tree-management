import React, { useState } from "react";
import {
  Layout,
  Card,
  Row,
  Col,
  Typography,
  Select,
  DatePicker,
  Button,
  Table,
  Tag,
  Checkbox,
  Input,
  Space,
  Dropdown,
} from "antd";
import {
  DownloadOutlined,
  CalendarOutlined,
  InfoCircleOutlined,
  ArrowUpOutlined,
  SearchOutlined,
  PlusOutlined,
  MoreOutlined,
  BulbOutlined,
  RightOutlined,
} from "@ant-design/icons";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const { Title, Text } = Typography;

// ---------- Mock data ----------

const summaryCards = [
  {
    label: "Total Revenue",
    value: "$20,320",
    delta: "+0,94 last year",
    spark: [4, 7, 5, 9, 6, 10, 8],
  },
  {
    label: "Total Orders",
    value: "10,320",
    suffix: "Orders",
    delta: "+0,94 last year",
    spark: [6, 4, 8, 5, 9, 7, 10],
  },
  {
    label: "New Customers",
    value: "4,305",
    suffix: "New Users",
    delta: "+0,94 last year",
    spark: [3, 6, 4, 8, 6, 9, 7],
  },
  {
    label: "Conversion Rate",
    value: "3.9%",
    delta: "+0,94 last year",
    spark: [8, 5, 7, 4, 9, 6, 8],
  },
];

const salesTrendData = [
  { month: "JAN", newUser: 12, existingUser: 9 },
  { month: "FEB", newUser: 18, existingUser: 7 },
  { month: "MAR", newUser: 10, existingUser: 14 },
  { month: "APR", newUser: 22, existingUser: 11 },
  { month: "MAY", newUser: 14, existingUser: 9 },
  { month: "JUN", newUser: 38, existingUser: 18 },
  { month: "JUL", newUser: 16, existingUser: 8 },
  { month: "AUG", newUser: 13, existingUser: 7 },
  { month: "SEP", newUser: 9, existingUser: 27 },
  { month: "OCT", newUser: 17, existingUser: 10 },
  { month: "NOV", newUser: 24, existingUser: 12 },
  { month: "DEC", newUser: 11, existingUser: 6 },
];

const revenueBreakdownData = [
  { day: 1, value: 28 },
  { day: 2, value: 19 },
  { day: 3, value: 35 },
  { day: 4, value: 22 },
  { day: 5, value: 41 },
  { day: 6, value: 17 },
  { day: 7, value: 31 },
  { day: 8, value: 24 },
  { day: 9, value: 38 },
  { day: 10, value: 20 },
  { day: 11, value: 29 },
];

const transactions = [
  {
    key: "1",
    id: "#04910",
    customer: "Ryan Korsgaard",
    product: "Ergo Office Chair",
    status: "Success",
    qty: 12,
    unitPrice: 3450,
    totalRevenue: 41400,
  },
  {
    key: "2",
    id: "#04911",
    customer: "Madelyn Lubin",
    product: "Sunset Desk 02",
    status: "Success",
    qty: 20,
    unitPrice: 2980,
    totalRevenue: 89200,
  },
  {
    key: "3",
    id: "#04912",
    customer: "Abram Bergson",
    product: "Eco Bookshelf",
    status: "Pending",
    qty: 22,
    unitPrice: 1750,
    totalRevenue: 75900,
  },
  {
    key: "4",
    id: "#04913",
    customer: "Phillip Mango",
    product: "Green Leaf Desk",
    status: "Refunded",
    qty: 24,
    unitPrice: 1950,
    totalRevenue: 19500,
  },
];

const statusColors = {
  Success: "success",
  Pending: "warning",
  Refunded: "default",
};

// ---------- Small sparkline component (inline svg, decorative) ----------

const Sparkline = ({ data }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const w = 64;
  const h = 28;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / (max - min || 1)) * h;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline
        points={points}
        fill="none"
        stroke="#1f1f1f"
        strokeWidth="1.5"
      />
    </svg>
  );
};

// ---------- Summary card ----------

const SummaryCard = ({ label, value, suffix, delta }) => (
  <Card
    bordered
    style={{ borderRadius: 12 }}
    bodyStyle={{ padding: "16px 20px" }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
      }}
    >
      <Text
        style={{
          fontSize: 12,
          letterSpacing: 0.5,
          color: "rgba(0,0,0,0.45)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <InfoCircleOutlined style={{ color: "rgba(0,0,0,0.25)", fontSize: 13 }} />
    </div>
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 8,
      }}
    >
      <div>
        <Title level={3} style={{ margin: 0 }}>
          {value}
        </Title>
        {suffix && (
          <Text style={{ fontSize: 12, color: "rgba(0,0,0,0.45)" }}>
            {suffix}
          </Text>
        )}
      </div>
      <Sparkline data={summaryCards[0].spark} />
    </div>
    <div
      style={{
        marginTop: 12,
        paddingTop: 10,
        borderTop: "1px solid #f0f0f0",
        display: "flex",
        alignItems: "center",
        gap: 4,
        color: "#389e0d",
        fontSize: 12,
      }}
    >
      <ArrowUpOutlined style={{ fontSize: 10 }} />
      {delta}
    </div>
  </Card>
);

// ---------- Main dashboard ----------

export default function Dashboard() {
  const [period, setPeriod] = useState("monthly");
  const [selectedRows, setSelectedRows] = useState([]);

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
    },
    {
      title: "Customer",
      dataIndex: "customer",
      key: "customer",
    },
    {
      title: "Product",
      dataIndex: "product",
      key: "product",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => <Tag color={statusColors[status]}>{status}</Tag>,
    },
    {
      title: "Qty",
      dataIndex: "qty",
      key: "qty",
    },
    {
      title: "Unit Price",
      dataIndex: "unitPrice",
      key: "unitPrice",
      render: (v) => `$${v.toLocaleString()}`,
    },
    {
      title: "Total Revenue",
      dataIndex: "totalRevenue",
      key: "totalRevenue",
      render: (v) => `$${v.toLocaleString()}`,
    },
    {
      title: "Actions",
      key: "actions",
      render: () => (
        <Dropdown
          menu={{
            items: [
              { key: "view", label: "View" },
              { key: "edit", label: "Edit" },
              { key: "delete", label: "Delete" },
            ],
          }}
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  return (
    <Layout style={{ background: "#f5f5f3", minHeight: "100vh" }}>
      <div style={{ padding: 24, maxWidth: 1280, margin: "0 auto", width: "100%" }}>
        {/* Header */}
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Title level={3} style={{ margin: 0 }}>
              Welcome back, Salung
            </Title>
          </Col>
          <Col>
            <Space>
              <Select
                defaultValue="daily"
                style={{ width: 110 }}
                options={[
                  { value: "daily", label: "Daily" },
                  { value: "weekly", label: "Weekly" },
                  { value: "monthly", label: "Monthly" },
                ]}
              />
              <DatePicker
                suffixIcon={<CalendarOutlined />}
                placeholder="6 Nov 2025"
                style={{ width: 160 }}
              />
              <Button type="primary" icon={<DownloadOutlined />} style={{ background: "#1f1f1f" }}>
                Export CSV
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Summary cards */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          {summaryCards.map((c) => (
            <Col span={6} key={c.label}>
              <SummaryCard {...c} />
            </Col>
          ))}
        </Row>

        {/* Sales trend + Revenue breakdown */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={16}>
            <Card
              bordered
              style={{ borderRadius: 12, height: 420 }}
              bodyStyle={{ padding: 20 }}
            >
              <Row justify="space-between" align="top">
                <Col>
                  <Space size={4}>
                    <Text strong style={{ fontSize: 13 }}>
                      Sales Trend
                    </Text>
                    <InfoCircleOutlined style={{ color: "rgba(0,0,0,0.25)", fontSize: 12 }} />
                  </Space>
                  <div style={{ marginTop: 8 }}>
                    <Text style={{ fontSize: 12, color: "rgba(0,0,0,0.45)" }}>
                      Total Revenue:{" "}
                    </Text>
                    <Text strong style={{ fontSize: 16 }}>
                      $20,320
                    </Text>
                  </div>
                  <Space size={16} style={{ marginTop: 6 }}>
                    <Space size={6}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "#d9d9d9",
                          display: "inline-block",
                        }}
                      />
                      <Text style={{ fontSize: 12 }}>New User</Text>
                    </Space>
                    <Space size={6}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "#1f1f1f",
                          display: "inline-block",
                        }}
                      />
                      <Text style={{ fontSize: 12 }}>Existing User</Text>
                    </Space>
                  </Space>
                </Col>
                <Col>
                  <Select
                    value={period}
                    onChange={setPeriod}
                    size="small"
                    style={{ width: 220 }}
                    options={[
                      { value: "weekly", label: "Weekly" },
                      { value: "monthly", label: "Monthly" },
                      { value: "yearly", label: "Yearly" },
                    ]}
                  />
                </Col>
              </Row>
              <div style={{ height: 300, marginTop: 16 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesTrendData} barGap={2}>
                    <CartesianGrid vertical={false} stroke="#f0f0f0" />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "rgba(0,0,0,0.45)" }}
                    />
                    <Tooltip />
                    <Bar dataKey="newUser" stackId="a" fill="#e0e0e0" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="existingUser" stackId="a" fill="#1f1f1f" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>

          <Col span={8}>
            <Card
              bordered
              style={{ borderRadius: 12, height: 420 }}
              bodyStyle={{ padding: 20 }}
            >
              <Space size={4}>
                <Text strong style={{ fontSize: 13 }}>
                  Revenue Breakdown
                </Text>
                <InfoCircleOutlined style={{ color: "rgba(0,0,0,0.25)", fontSize: 12 }} />
              </Space>
              <Row justify="space-between" align="middle" style={{ marginTop: 8 }}>
                <Col>
                  <Text style={{ fontSize: 12, color: "rgba(0,0,0,0.45)" }}>
                    Revenue by Category
                  </Text>
                </Col>
                <Col>
                  <Text style={{ fontSize: 12, color: "rgba(0,0,0,0.45)" }}>
                    <CalendarOutlined /> Jan 1 - Aug 30
                  </Text>
                </Col>
              </Row>
              <Title level={3} style={{ margin: "4px 0 16px" }}>
                $20,320
              </Title>
              <Card
                size="small"
                style={{
                  background: "#fafafa",
                  borderRadius: 8,
                  marginBottom: 16,
                  cursor: "pointer",
                }}
                bodyStyle={{
                  padding: "10px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Space size={8}>
                  <BulbOutlined />
                  <Text style={{ fontSize: 12 }}>Get AI insight for better analysis</Text>
                </Space>
                <RightOutlined style={{ fontSize: 11 }} />
              </Card>
              <div style={{ height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueBreakdownData}>
                    <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                      {revenueBreakdownData.map((entry, idx) => (
                        <Bar key={idx} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <Row justify="space-between" style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 11, color: "rgba(0,0,0,0.35)" }}>1 JAN</Text>
                <Text style={{ fontSize: 11, color: "rgba(0,0,0,0.35)" }}>30 JAN 2025</Text>
              </Row>
            </Card>
          </Col>
        </Row>

        {/* Recent transactions */}
        <Card bordered style={{ borderRadius: 12 }} bodyStyle={{ padding: 20 }}>
          <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
            <Col>
              <Space size={4}>
                <Text strong style={{ fontSize: 13 }}>
                  Recent Transactions
                </Text>
                <InfoCircleOutlined style={{ color: "rgba(0,0,0,0.25)", fontSize: 12 }} />
              </Space>
            </Col>
            <Col>
              <Space>
                <Input
                  placeholder="Search transactions..."
                  prefix={<SearchOutlined style={{ color: "rgba(0,0,0,0.3)" }} />}
                  style={{ width: 220 }}
                />
                <Button type="primary" icon={<PlusOutlined />} style={{ background: "#1f1f1f" }}>
                  Add Transaction
                </Button>
                <Button type="text" icon={<MoreOutlined />} />
              </Space>
            </Col>
          </Row>
          <Table
            rowSelection={{
              selectedRowKeys: selectedRows,
              onChange: setSelectedRows,
            }}
            columns={columns}
            dataSource={transactions}
            pagination={false}
          />
        </Card>
      </div>
    </Layout>
  );
}
