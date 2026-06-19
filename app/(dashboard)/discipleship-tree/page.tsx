"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
    Layout,
    Input,
    Tag,
    Button,
    Select,
    Drawer,
    Empty,
    message,
    Spin,
    Card,
    Flex,
    Space,
    Divider,
    Avatar
} from "antd";
import {
    BookOutlined,
    CloseOutlined,
    SendOutlined,
    EyeOutlined,
    
} from "@ant-design/icons";

import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    Handle,
    Position,
    MarkerType,
    Panel,
    BackgroundVariant,
    Node,
    Edge,
} from "@xyflow/react";

import {
    User,
    Mail,
    Phone,
    Calendar,
    Building2,
    GraduationCap,
    ChevronDown,
    ChevronUp,
    Users,
    X,
    Send,
} from "lucide-react";

import "@xyflow/react/dist/style.css";
import { AncestorNodeRecord, MemberProfileRecord } from "@/types/member.types";
import { TreePersonCard } from "@/components/TreePersonCard/TreePersonCard";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";

const { Header, Content } = Layout;
const { Option } = Select;

// ==================== I18N ====================
const T: Record<string, Record<string, string>> = {
    vi: {
        appName: "Môn Đồ Hóa",
        appSub: "Hệ thống sơ đồ truyền thừa",
        dashboard: "Tổng quan",
        diagram: "Sơ đồ truyền thừa",
        adminPanel: "Quản trị",
        members: "Thành viên",
        messages: "Thư tín",
        settings: "Cài đặt",
        selectCourse: "Chọn môn học",
        myDiagram: "Xem sơ đồ của tôi",
        totalMembers: "Tổng thành viên",
        totalMentors: "Người hướng dẫn",
        totalDisciples: "Môn đồ",
        totalCompletions: "Lượt hoàn thành",
        activeBranches: "Chi nhánh",
        totalMessages: "Thư tín đã gửi",
        searchPlaceholder: "Tìm tên, chi nhánh, môn học...",
        mentor: "Người hướng dẫn",
        disciple: "Môn đồ",
        branch: "Chi nhánh",
        course: "Môn học",
        startMonth: "Tháng bắt đầu",
        endMonth: "Tháng kết thúc",
        sendMessage: "Gửi thư tín",
        messagePlaceholder: "Nhập nội dung thư tín...",
        noMentorFound: "Không tìm thấy người hướng dẫn?",
        registerMentor: "Đăng ký người hướng dẫn mới",
        pendingApproval: "Chờ duyệt",
        approve: "Duyệt",
        reject: "Từ chối",
        courses: "Danh mục môn học",
        addCourse: "Thêm môn học",
        statistics: "Thống kê",
        topMentors: "Người hướng dẫn xuất sắc",
        allLinks: "Bảng liên kết huấn luyện",
        dragZoom: "Kéo để di chuyển · Cuộn để zoom · Click node để xem chi tiết",
        login: "Đăng nhập",
        logout: "Đăng xuất",
        selectMentor: "Chọn người hướng dẫn",
        confirmDelete: "Xác nhận xóa?",
        save: "Lưu",
        cancel: "Hủy",
        close: "Đóng",
        send: "Gửi",
        mentorStats: "Thống kê đào tạo",
        disciples: "môn đồ",
        generation: "thế hệ",
        viewTree: "Xem cây",
        addLink: "Thêm liên kết",
    },
    en: {
        appName: "Discipleship",
        appSub: "Lineage diagram system",
        dashboard: "Dashboard",
        diagram: "Lineage Diagram",
        adminPanel: "Admin",
        members: "Members",
        messages: "Messages",
        settings: "Settings",
        selectCourse: "Select course",
        myDiagram: "My Diagram",
        totalMembers: "Total Members",
        totalMentors: "Mentors",
        totalDisciples: "Disciples",
        totalCompletions: "Completions",
        activeBranches: "Branches",
        totalMessages: "Messages Sent",
        searchPlaceholder: "Search name, branch, course...",
        mentor: "Mentor",
        disciple: "Disciple",
        branch: "Branch",
        course: "Course",
        startMonth: "Start Month",
        endMonth: "End Month",
        sendMessage: "Send Message",
        messagePlaceholder: "Type your message...",
        noMentorFound: "Mentor not found?",
        registerMentor: "Register New Mentor",
        pendingApproval: "Pending Approval",
        approve: "Approve",
        reject: "Reject",
        courses: "Course Catalog",
        addCourse: "Add Course",
        statistics: "Statistics",
        topMentors: "Top Mentors",
        allLinks: "Training Links Table",
        dragZoom: "Drag to pan · Scroll to zoom · Click node for details",
        login: "Login",
        logout: "Logout",
        selectMentor: "Select mentor",
        confirmDelete: "Confirm delete?",
        save: "Save",
        cancel: "Cancel",
        close: "Close",
        send: "Send",
        mentorStats: "Training Stats",
        disciples: "disciples",
        generation: "generation",
        viewTree: "View Tree",
        addLink: "Add Link",
    },
    ko: {
        appName: "제자화",
        appSub: "계보 다이어그램 시스템",
        dashboard: "대시보드",
        diagram: "계보 다이어그램",
        adminPanel: "관리자",
        members: "회원",
        messages: "서신",
        settings: "설정",
        selectCourse: "과목 선택",
        myDiagram: "내 다이어그램",
        totalMembers: "전체 회원",
        totalMentors: "목자",
        totalDisciples: "제자",
        totalCompletions: "완료 횟수",
        activeBranches: "지부",
        totalMessages: "발송 서신",
        searchPlaceholder: "이름, 지부, 과목 검색...",
        mentor: "목자",
        disciple: "제자",
        branch: "지부",
        course: "과목",
        startMonth: "시작 월",
        endMonth: "종료 월",
        sendMessage: "서신 보내기",
        messagePlaceholder: "서신 내용을 입력하세요...",
        noMentorFound: "목자를 찾을 수 없나요?",
        registerMentor: "새 목자 등록",
        pendingApproval: "승인 대기",
        approve: "승인",
        reject: "거절",
        courses: "과목 목록",
        addCourse: "과목 추가",
        statistics: "통계",
        topMentors: "우수 목자",
        allLinks: "훈련 연결 목록",
        dragZoom: "드래그로 이동 · 스크롤로 확대/축소 · 노드 클릭 시 상세 정보",
        login: "로그인",
        logout: "로그아웃",
        selectMentor: "목자 선택",
        confirmDelete: "삭제 확인?",
        save: "저장",
        cancel: "취소",
        close: "닫기",
        send: "보내기",
        mentorStats: "훈련 통계",
        disciples: "제자",
        generation: "세대",
        viewTree: "트리 보기",
        addLink: "연결 추가",
    },
};

// Mirrors TreeLinkRecord from @/types/tree.types (API response shape for
// /api/discipleship-tree); DB columns are start_date / end_date.
type Link = {
    id: string;
    mentorId: string;
    discipleId: string;
    startDate?: string;
    endDate?: string | null;
    status?: 'in_progress' | 'completed';
};

type Course = {
    id: string;
    name: string;
};

type MentorStat = {
    courseId: string;
    courseName: string;
    totalDisciples: number;
};

type DescendantNode = {
    member: MemberProfileRecord;
    level: number;
    link: {
        id: string;
        startDate?: string;
        endDate?: string | null;
    };
};

type MemberDetailResponse = {
    member: MemberProfileRecord;
    mentorStats: MentorStat[];
    descendants: DescendantNode[];
    ancestors: AncestorNodeRecord[];
};

// ==================== BUILD TREE ====================
function buildTreeForCourse(
    courseId: string,
    links: Link[],
    memberMap: Map<string, MemberProfileRecord>,
    focusMemberId?: string
) {
    if (!links.length) return { nodes: [], edges: [] as Edge[] };

    const allMentorIds = [...new Set(links.map(l => l.mentorId))];
    const allDiscipleIds = [...new Set(links.map(l => l.discipleId))];
    const rootIds = allMentorIds.filter(id => !allDiscipleIds.includes(id));

    const discipleCount: Record<string, number> = {};
    links.forEach(l => {
        discipleCount[l.mentorId] = (discipleCount[l.mentorId] || 0) + 1;
    });

    // BFS Level
    const levelMap: Record<string, number> = {};
    const queue = [...rootIds];
    rootIds.forEach(id => (levelMap[id] = 0));
    const visited = new Set(rootIds);

    while (queue.length) {
        const cur = queue.shift()!;
        links
            .filter(l => l.mentorId === cur)
            .forEach(l => {
                if (!visited.has(l.discipleId)) {
                    visited.add(l.discipleId);
                    levelMap[l.discipleId] = (levelMap[cur] || 0) + 1;
                    queue.push(l.discipleId);
                }
            });
    }

    const byLevel: Record<number, string[]> = {};
    Object.entries(levelMap).forEach(([id, lv]) => {
        byLevel[lv] ||= [];
        byLevel[lv].push(id);
    });

    const posMap: Record<string, { x: number; y: number }> = {};
    const NODE_W = 200,
        NODE_H = 100,
        GAP_X = 50,
        GAP_Y = 120;

    Object.entries(byLevel).forEach(([lvStr, ids]) => {
        const lv = Number(lvStr);
        const totalW = ids.length * NODE_W + (ids.length - 1) * GAP_X;
        const startX = -totalW / 2;
        ids.forEach((id, i) => {
            posMap[id] = {
                x: startX + i * (NODE_W + GAP_X),
                y: lv * (NODE_H + GAP_Y),
            };
        });
    });

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Track added node IDs to prevent duplicates
    const addedNodeIds = new Set<string>();

    // Root Node
    nodes.push({
        id: "root",
        type: "rootNode",
        position: { x: -110, y: -160 },
        data: { courseName: "Môn học Kinh Thánh" },
    });
    addedNodeIds.add("root");

    // A member can be both a mentor and a disciple (intermediate nodes).
    // We must render each unique member ID only once, choosing the most
    // appropriate node type: prefer "mentorNode" when the member mentors
    // at least one disciple, otherwise fall back to "discipleNode".
    const mentorSet = new Set(allMentorIds);

    // Collect all unique member IDs across both roles
    const allMemberIds = new Set([...allMentorIds, ...allDiscipleIds]);

    allMemberIds.forEach(id => {
        if (addedNodeIds.has(id)) return;

        const member = memberMap.get(id);
        const isFocus = focusMemberId === id;
        const isMentor = mentorSet.has(id);

        if (isMentor) {
            nodes.push({
                id,
                type: "mentorNode",
                position: posMap[id] || { x: 0, y: 0 },
                data: {
                    member,
                    discipleCount: discipleCount[id] || 0,
                    isMentor: true,
                    isFocus,
                },
            });
        } else {
            // Pure disciple — find their link for date info
            const link = links.find(l => l.discipleId === id);
            nodes.push({
                id,
                type: "discipleNode",
                position: posMap[id] || { x: 0, y: 0 },
                data: { member, link, isFocus },
            });
        }

        addedNodeIds.add(id);
    });

    // Edges
    links.forEach(link => {
        edges.push({
            id: `e_${link.id}`,
            source: link.mentorId,
            target: link.discipleId,
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: "#6366F1", strokeWidth: 2 },
        });
    });

    // Root → Top Mentors
    rootIds.forEach(rid => {
        edges.unshift({
            id: `root_${rid}`,
            source: "root",
            target: rid,
            markerEnd: { type: MarkerType.ArrowClosed },
        });
    });

    return { nodes, edges };
}

// ==================== CUSTOM NODES ====================
const RootNode = ({ data }: any) => (
    <div
        style={{
            background: "linear-gradient(135deg,#0F172A,#1E3A5F)",
            color: "#fff",
            borderRadius: 12,
            padding: "10px 22px",
            fontSize: 13,
            fontWeight: 700,
            boxShadow: "0 4px 20px rgba(15,23,42,0.35)",
            textAlign: "center",
            minWidth: 200,
            border: "2px solid #38BDF8",
        }}
    >
        <BookOutlined style={{ marginRight: 6, color: "#38BDF8" }} />
        {data.courseName}
        <Handle
            type="source"
            position={Position.Bottom}
            style={{ background: "#14B8A6", width: 10, height: 10 }}
        />
    </div>
);

const MentorNode = ({ data }: any) => {
    const { member, discipleCount, isFocus } = data;
    return (
        <div
            style={{
                background: isFocus
                    ? "linear-gradient(135deg,#EEF2FF,#E0E7FF)"
                    : "#fff",
                border: `2px solid ${isFocus ? "#6366F1" : "#C7D2FE"}`,
                borderRadius: 12,
                padding: "10px 14px",
                width: 196,
                boxShadow: isFocus
                    ? "0 0 0 4px #6366F130, 0 4px 16px rgba(99,102,241,0.2)"
                    : "0 2px 8px rgba(0,0,0,0.08)",
                transition: "all 0.2s",
                cursor: "pointer",
            }}
        >
            <Handle
                type="target"
                position={Position.Top}
                style={{ background: "#6366F1", width: 9, height: 9 }}
            />
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 6,
                }}
            >
                <Avatar
                    size={32}
                    style={{
                        background:
                            "linear-gradient(135deg,#6366F1,#8B5CF6)",
                        fontSize: 13,
                        fontWeight: 700,
                    }}
                >
                    {member?.fullName?.[0] || "?"}
                </Avatar>
                <div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>
                        {member?.fullName}
                    </div>
                    <div style={{ fontSize: 10, color: "#64748B" }}>
                        {member?.branchName}
                    </div>
                </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
                <Tag color="geekblue">👤 {discipleCount} môn đồ</Tag>
                <Tag color="purple">Người HD</Tag>
            </div>
            <Handle
                type="source"
                position={Position.Bottom}
                style={{ background: "#6366F1", width: 9, height: 9 }}
            />
        </div>
    );
};

const DiscipleNode = ({ data }: any) => {
    const { member, link, isFocus } = data;
    return (
        <div
            style={{
                background: isFocus
                    ? "linear-gradient(135deg,#F0FDF4,#DCFCE7)"
                    : "#fff",
                border: `2px solid ${isFocus ? "#10B981" : "#BBF7D0"}`,
                borderRadius: 12,
                padding: "10px 14px",
                width: 196,
                boxShadow: isFocus
                    ? "0 0 0 4px #10B98120, 0 4px 16px rgba(16,185,129,0.15)"
                    : "0 2px 8px rgba(0,0,0,0.06)",
                transition: "all 0.2s",
                cursor: "pointer",
            }}
        >
            <Handle
                type="target"
                position={Position.Top}
                style={{ background: "#10B981", width: 9, height: 9 }}
            />
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 6,
                }}
            >
                <Avatar
                    size={32}
                    style={{
                        background:
                            "linear-gradient(135deg,#10B981,#059669)",
                        fontSize: 13,
                        fontWeight: 700,
                    }}
                >
                    {member?.fullName?.[0] || "?"}
                </Avatar>
                <div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>
                        {member?.fullName}
                    </div>
                    <div style={{ fontSize: 10, color: "#64748B" }}>
                        {member?.branchName}
                    </div>
                </div>
            </div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                <Tag color="green">Môn đồ</Tag>
                {link?.startDate && (
                    <Tag
                        style={{
                            fontSize: 9,
                            background: "#F8FAFC",
                            border: "1px solid #E2E8F0",
                            color: "#64748B",
                        }}
                    >
                        {link.startDate} → {link.endDate ?? '-'}
                    </Tag>
                )}
            </div>
            <Handle
                type="source"
                position={Position.Bottom}
                style={{ background: "#10B981", width: 9, height: 9 }}
            />
        </div>
    );
};

const nodeTypes = {
    rootNode: RootNode,
    mentorNode: MentorNode,
    discipleNode: DiscipleNode,
};

// ==================== MAIN COMPONENT ====================
export default function Diagram() {
    const [lang] = useState<"vi" | "en" | "ko">("vi");
    const t = T[lang];

    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState("");
    const [focusMyself, setFocusMyself] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string>("");

    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    const [nodeModalOpen, setNodeModalOpen] = useState(false);
    const [selectedMemberDetail, setSelectedMemberDetail] =
        useState<MemberDetailResponse | null>(null);
    const [messageInput, setMessageInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [drawerLoading, setDrawerLoading] = useState(false);

    // Load Courses
    useEffect(() => {
        fetch("/api/courses")
            .then(r => r.json())
            .then(res => {
                if (res.success) {
                    setCourses(res.data || []);
                    if (res.data?.length) setSelectedCourse(res.data[0].id);
                }
            })
            .catch(() => message.error("Không tải được danh sách môn học"));
    }, []);

    // Load Tree
    useEffect(() => {
        if (!selectedCourse) return;

        const loadTree = async () => {
            setLoading(true);
            try {
                const url =
                    focusMyself && currentUserId
                        ? `/api/discipleship-tree?courseId=${selectedCourse}&focusMemberId=${currentUserId}`
                        : `/api/discipleship-tree?courseId=${selectedCourse}`;

                const res = await fetch(url).then(r => r.json());
                if (res.success && res.data?.links) {
                    const links: Link[] = res.data.links;
                    const memberMap = new Map<string, MemberProfileRecord>(
                        res.data.members?.map((m: MemberProfileRecord) => [
                            m.id,
                            m,
                        ]) || []
                    );

                    const { nodes: n, edges: e } = buildTreeForCourse(
                        selectedCourse,
                        links,
                        memberMap,
                        focusMyself ? currentUserId : undefined
                    );

                    setNodes(n);
                    setEdges(e);
                }
            } catch (e) {
                message.error("Lỗi tải sơ đồ");
            } finally {
                setLoading(false);
            }
        };

        loadTree();
    }, [selectedCourse, focusMyself, currentUserId, setNodes, setEdges]);

    const loadMemberDetail = async (memberId: string) => {
        try {
            setDrawerLoading(true);

            const res = await fetch(
                `/api/members/${memberId}?courseId=${selectedCourse}`
            );

            const result = await res.json();

            if (!result.success) {
                message.error(result.message ?? "Load member failed");
                return;
            }

            setSelectedMemberDetail(result.data);
            setNodeModalOpen(true);
        } catch (error) {
            console.error(error);
            message.error("Load member failed");
        } finally {
            setDrawerLoading(false);
        }
    };

    // Click Node → Fetch Detail from API
    const onNodeClick = useCallback(
        async (_: any, node: Node) => {
            if (node.id === "root") return;

            setDrawerLoading(true);
            setNodeModalOpen(true);

            try {
                const res = await fetch(
                    `/api/members/${node.id}?courseId=${selectedCourse}`
                );
                const json = await res.json();

                if (json.success) {
                    setSelectedMemberDetail(json.data);
                } else {
                    message.error(
                        json.error?.message ||
                            "Không tải được thông tin thành viên"
                    );
                }
            } catch (err) {
                message.error("Lỗi kết nối server");
            } finally {
                setDrawerLoading(false);
            }
        },
        [selectedCourse]
    );

    const sendMessage = async () => {
        if (!messageInput.trim() || !selectedMemberDetail?.member) return;
        try {
            const res = await fetch("/api/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fromId: currentUserId,
                    toId: selectedMemberDetail.member.id,
                    content: messageInput,
                }),
            });
            if (res.ok) {
                message.success("Thư tín đã gửi thành công!");
                setMessageInput("");
            }
        } catch (e) {
            message.error("Gửi thư tín thất bại");
        }
    };

    return (
        <div style={{ height: "100vh", background: "#f8fafc" }}>
            <Layout style={{ height: "100%" }}>
               
                    <div className="flex items-center gap-4">
                        <Select
                            value={selectedCourse}
                            onChange={setSelectedCourse}
                            style={{ width: 280 }}
                            placeholder={t.selectCourse}
                        >
                            {courses.map(c => (
                                <Option key={c.id} value={c.id}>
                                    {c.name}
                                </Option>
                            ))}
                        </Select>

                        <Button
                            type={focusMyself ? "primary" : "default"}
                            icon={<EyeOutlined />}
                            onClick={() => setFocusMyself(!focusMyself)}
                        >
                            {t.myDiagram}
                        </Button>
                    </div>

                <Content style={{ position: "relative" }}>
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-20">
                            <Spin size="large" description="Đang tải sơ đồ..." />
                        </div>
                    )}

                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onNodeClick={onNodeClick}
                        nodeTypes={nodeTypes}
                        fitView
                        fitViewOptions={{ padding: 0.2 }}
                        minZoom={0.2}
                        maxZoom={2.5}
                    >
                        <Background
                            variant={BackgroundVariant.Lines}
                            gap={20}
                            color="#f1f5f9"
                        />
                        <Controls />
                        <MiniMap />
                        <Panel position="top-right">
                            <div
                                style={{
                                    background: "#fff",
                                    padding: "6px 12px",
                                    borderRadius: 8,
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                                }}
                            >
                                💡 {t.dragZoom}
                            </div>
                        </Panel>
                    </ReactFlow>
                </Content>
            </Layout>

            {/* ==================== DRAWER ==================== */}
            <Drawer
  open={nodeModalOpen}
  onClose={() => {
    setNodeModalOpen(false);
    setSelectedMemberDetail(null);
  }}
  placement="right"
  closable={false}
  size="large"
>
  {drawerLoading ? (
    <Flex
      justify="center"
      align="center"
      style={{ height: "100%" }}
    >
      <Spin size="large" />
    </Flex>
  ) : selectedMemberDetail ? (
    <Flex vertical gap={24}>
      {/* Header */}

      <Card
        styles={{
          body: {
            background:
              "linear-gradient(135deg,#4F46E5 0%, #7C3AED 100%)",
            color: "#fff",
          },
        }}
      >
        <Flex justify="space-between" align="flex-start">
          <Space size={16} align="start">
            <Avatar size={72}>
              {selectedMemberDetail.member.fullName?.[0]}
            </Avatar>

            <Flex vertical gap={4}>
              <Title
                level={3}
                style={{ color: "#fff", margin: 0 }}
              >
                {selectedMemberDetail.member.fullName}
              </Title>

              <Text style={{ color: "#E2E8F0" }}>
                {selectedMemberDetail.member.branchName}
              </Text>

              <Space wrap>
  {selectedMemberDetail.member.roles?.map(role => (
    <Tag key={role} color="processing">
      {role}
    </Tag>
  ))}
</Space>
            </Flex>
          </Space>

          <Button
            type="text"
            icon={<X size={18} />}
            onClick={() => setNodeModalOpen(false)}
          />
        </Flex>
      </Card>

      {/* Profile */}

      <Card title="Thông tin cá nhân">
        <Flex vertical gap={20}>
          <Flex justify="space-between">
            <Space>
              <Mail size={16} />
              <Text strong>Email</Text>
            </Space>

            <Text>
              {selectedMemberDetail.member.email}
            </Text>
          </Flex>

          <Flex justify="space-between">
            <Space>
              <Phone size={16} />
              <Text strong>Phone</Text>
            </Space>

            <Text>
              {selectedMemberDetail.member.phone}
            </Text>
          </Flex>

          <Flex justify="space-between">
            <Space>
              <Calendar size={16} />
              <Text strong>Birth Date</Text>
            </Space>

            <Text>
              {selectedMemberDetail.member.birthDate}
            </Text>
          </Flex>

          <Flex justify="space-between">
            <Space>
              <Building2 size={16} />
              <Text strong>Branch</Text>
            </Space>

            <Text>
              {selectedMemberDetail.member.branchName}
            </Text>
          </Flex>
        </Flex>
      </Card>

      {/* Tree */}

      <Card
        title={
          <Space>
            <Users size={18} />
            <span>Cây Môn Đồ</span>
          </Space>
        }
      >
        <Flex vertical gap={12}>
          {selectedMemberDetail.ancestors
            ?.slice()
            .reverse()
            .map(item => (
              <React.Fragment key={item.member.id}>
                <TreePersonCard
                  member={item.member}
                  onClick={() =>
                    loadMemberDetail(item.member.id)
                  }
                />

                <Flex justify="center">
                  <ChevronDown size={18} />
                </Flex>
              </React.Fragment>
            ))}

          <TreePersonCard
            member={selectedMemberDetail.member}
            active
          />

          {selectedMemberDetail.descendants.length > 0 && (
            <Flex justify="center">
              <ChevronDown size={18} />
            </Flex>
          )}

          {selectedMemberDetail.descendants.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Chưa có môn đồ"
            />
          ) : (
            <Flex vertical gap={10}>
              {selectedMemberDetail.descendants.map(
                item => (
                  <TreePersonCard
                    key={item.member.id}
                    member={item.member}
                    level={item.level}
                    onClick={() =>
                      loadMemberDetail(item.member.id)
                    }
                  />
                )
              )}
            </Flex>
          )}
        </Flex>
      </Card>

      {/* Stats */}

      {selectedMemberDetail.mentorStats.length > 0 && (
        <Card
          title={
            <Space>
              <GraduationCap size={18} />
              <span>Thống kê đào tạo</span>
            </Space>
          }
        >
          <Flex vertical>
            {selectedMemberDetail.mentorStats.map(
              (stat, index) => (
                <React.Fragment
                  key={stat.courseId}
                >
                  <Flex
                    justify="space-between"
                    align="center"
                  >
                    <Text>{stat.courseName}</Text>

                    <Tag color="blue">
                      {stat.totalDisciples}
                    </Tag>
                  </Flex>

                  {index !==
                    selectedMemberDetail.mentorStats
                      .length -
                      1 && <Divider />}
                </React.Fragment>
              )
            )}
          </Flex>
        </Card>
      )}

      {/* Message */}

      <Card title="Thư tín">
        <Space.Compact block>
          <Input
            value={messageInput}
            onChange={e =>
              setMessageInput(e.target.value)
            }
            onPressEnter={sendMessage}
            placeholder={t.messagePlaceholder}
          />

          <Button
            type="primary"
            icon={<Send size={16} />}
            onClick={sendMessage}
          >
            {t.send}
          </Button>
        </Space.Compact>
      </Card>
    </Flex>
  ) : null}
</Drawer>
        </div>
    );
}
