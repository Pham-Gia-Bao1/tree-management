"use client";

import React, {
  useState,
  useCallback,
  useEffect,
} from "react";
import {
  Input,
  Tag,
  Button,
  Select,
  Empty,
  Spin,
  Avatar,
  Typography,
  Skeleton,
  Timeline,
  Form,
  App,
  Tooltip,
  Badge,
  Divider,
  Space,
  Flex,
  Card,
  Layout,
} from "antd";
import {
  SearchOutlined,
  PlusOutlined,
  EyeOutlined,
  CloseOutlined,
  SendOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  ApartmentOutlined,
  NodeIndexOutlined,
  CrownOutlined,
  TeamOutlined,
  BookOutlined,
  EditOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
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
  Connection,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const { Text } = Typography;
const { Sider, Content } = Layout;

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

type Link = {
  id: string;
  courseId: string;
  mentorId: string;
  discipleId: string;
  startDate: string;
  endDate?: string | null;
  status?: "in_progress" | "completed";
  notes?: string;
};

type Course = { id: string; name: string };

type UserRecord = { id: string; fullName: string; roles?: string[] };

type MemberProfile = {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  branchName?: string;
  roles?: string[];
};

type MentorStat = {
  courseId: string;
  courseName: string;
  totalDisciples: number;
};

type AncestorNode = {
  member: MemberProfile;
  level: number;
};

type DescendantNode = {
  member: MemberProfile;
  level: number;
  link: { id: string; startDate?: string; endDate?: string | null };
};

type MemberDetail = {
  member: MemberProfile;
  mentorStats: MentorStat[];
  descendants: DescendantNode[];
  ancestors: AncestorNode[];
};

type PanelMode = "view" | "create" | "edit";

// ─────────────────────────────────────────────────────────────
// DESIGN TOKENS — level-based color palette (colors only; layout/spacing
// now comes from antd's theme via components, not inline CSS)
// ─────────────────────────────────────────────────────────────

const LEVEL_PALETTE = [
  {
    header: "#6D28D9",
    headerText: "#fff",
    bg: "#EDE9FE",
    border: "#8B5CF6",
    avatarBg: "rgba(255,255,255,0.25)",
    avatarText: "#fff",
    subtextOnBg: "#5B21B6",
    chipBg: "#7C3AED",
    chipText: "#fff",
  },
  {
    header: "#1D4ED8",
    headerText: "#fff",
    bg: "#EFF6FF",
    border: "#3B82F6",
    avatarBg: "rgba(255,255,255,0.25)",
    avatarText: "#fff",
    subtextOnBg: "#1E40AF",
    chipBg: "#2563EB",
    chipText: "#fff",
  },
  {
    header: "#0E7490",
    headerText: "#fff",
    bg: "#ECFEFF",
    border: "#06B6D4",
    avatarBg: "rgba(255,255,255,0.25)",
    avatarText: "#fff",
    subtextOnBg: "#155E75",
    chipBg: "#0891B2",
    chipText: "#fff",
  },
  {
    header: "#065F46",
    headerText: "#fff",
    bg: "#ECFDF5",
    border: "#10B981",
    avatarBg: "rgba(255,255,255,0.25)",
    avatarText: "#fff",
    subtextOnBg: "#064E3B",
    chipBg: "#059669",
    chipText: "#fff",
  },
];

const ROOT_COLOR = {
  header: "#374151",
  headerText: "#fff",
  bg: "#F9FAFB",
  border: "#6B7280",
};

const EDGE_COLORS = ["#8B5CF6", "#3B82F6", "#06B6D4", "#10B981", "#F59E0B"];

const getPalette = (level: number) =>
  LEVEL_PALETTE[Math.min(level, LEVEL_PALETTE.length - 1)];

const getEdgeColor = (level: number) =>
  EDGE_COLORS[Math.min(level, EDGE_COLORS.length - 1)];

const getInitials = (name?: string) => {
  if (!name) return "?";
  const words = name.trim().split(" ");
  return words
    .slice(-2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
};

// ─────────────────────────────────────────────────────────────
// LAYOUT ENGINE — Reingold-Tilford style with proper spacing
// ─────────────────────────────────────────────────────────────

const NODE_W = 210;
const NODE_H = 96;
const GAP_X = 60;
const GAP_Y = 20;

function getSubtreeIds(links: Link[], rootId: string): Set<string> {
  const set = new Set<string>([rootId]);
  const queue = [rootId];
  while (queue.length) {
    const cur = queue.shift()!;
    links
      .filter((l) => l.mentorId === cur)
      .forEach((l) => {
        if (!set.has(l.discipleId)) {
          set.add(l.discipleId);
          queue.push(l.discipleId);
        }
      });
  }
  return set;
}

function computeLayout(
  rootIds: string[],
  links: Link[]
): Record<string, { x: number; y: number }> {
  const posMap: Record<string, { x: number; y: number }> = {};
  const subtreeH: Record<string, number> = {};

  const computeH = (id: string): number => {
    const children = links.filter((l) => l.mentorId === id).map((l) => l.discipleId);
    if (!children.length) {
      subtreeH[id] = 1;
      return 1;
    }
    const total = children.reduce((s, c) => s + computeH(c), 0);
    subtreeH[id] = total;
    return total;
  };
  rootIds.forEach(computeH);

  const ROW_H = NODE_H + GAP_Y;
  const COL_W = NODE_W + GAP_X;

  const assignPos = (id: string, startRow: number, col: number) => {
    const children = links.filter((l) => l.mentorId === id).map((l) => l.discipleId);
    const myH = subtreeH[id] || 1;
    const centerRow = startRow + myH / 2 - 0.5;

    posMap[id] = {
      x: col * COL_W,
      y: centerRow * ROW_H,
    };

    let childRow = startRow;
    children.forEach((child) => {
      assignPos(child, childRow, col + 1);
      childRow += subtreeH[child] || 1;
    });
  };

  let currentRow = 0;
  rootIds.forEach((root) => {
    assignPos(root, currentRow, 0);
    currentRow += subtreeH[root] || 1;
  });

  return posMap;
}

// ─────────────────────────────────────────────────────────────
// BUILD TREE GRAPH
// ─────────────────────────────────────────────────────────────

function buildTree(
  links: Link[],
  memberMap: Map<string, MemberProfile>,
  focusedId: string | undefined,
  onEyeClick: (id: string) => void,
  onEditEdge: (link: Link) => void
): { nodes: Node[]; edges: Edge[] } {
  if (!links.length) return { nodes: [], edges: [] };

  const allMentorIds = [...new Set(links.map((l) => l.mentorId))];
  const allDiscipleIds = [...new Set(links.map((l) => l.discipleId))];
  const rootIds = allMentorIds.filter((id) => !allDiscipleIds.includes(id));
  const allIds = [...new Set([...allMentorIds, ...allDiscipleIds])];

  const levelMap: Record<string, number> = {};
  const queue = [...rootIds];
  rootIds.forEach((id) => (levelMap[id] = 0));
  const visited = new Set(rootIds);
  while (queue.length) {
    const cur = queue.shift()!;
    links
      .filter((l) => l.mentorId === cur)
      .forEach((l) => {
        if (!visited.has(l.discipleId)) {
          visited.add(l.discipleId);
          levelMap[l.discipleId] = (levelMap[cur] || 0) + 1;
          queue.push(l.discipleId);
        }
      });
  }

  const discipleCount: Record<string, number> = {};
  links.forEach((l) => {
    discipleCount[l.mentorId] = (discipleCount[l.mentorId] || 0) + 1;
  });

  const posMap = computeLayout(rootIds, links);
  const subtreeIds = focusedId ? getSubtreeIds(links, focusedId) : null;
  const mentorSet = new Set(allMentorIds);

  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const addedIds = new Set<string>();

  nodes.push({
    id: "root",
    type: "rootNode",
    position: { x: -NODE_W - GAP_X, y: 0 },
    data: {
      isDimmed: subtreeIds ? !subtreeIds.has(rootIds[0]) : false,
      rootIds,
    },
  });
  addedIds.add("root");

  allIds.forEach((id) => {
    if (addedIds.has(id)) return;
    const member = memberMap.get(id);
    const level = levelMap[id] ?? 0;
    const isMentor = mentorSet.has(id);
    const isFocus = focusedId === id;
    const isDimmed = subtreeIds ? !subtreeIds.has(id) : false;
    const pos = posMap[id] ?? { x: 0, y: 0 };

    nodes.push({
      id,
      position: pos,
      type: isMentor ? "mentorNode" : "discipleNode",
      data: {
        member,
        level,
        isFocus,
        isDimmed,
        isMentor,
        discipleCount: discipleCount[id] || 0,
        onEyeClick,
        link: !isMentor ? links.find((l) => l.discipleId === id) : undefined,
        onEditEdge,
      },
    });
    addedIds.add(id);
  });

  rootIds.forEach((rid) => {
    const level = 0;
    const highlighted = !subtreeIds || subtreeIds.has(rid);
    const dimmed = !!subtreeIds && !highlighted;
    const color = getEdgeColor(level);

    edges.push({
      id: `root_${rid}`,
      source: "root",
      target: rid,
      type: "smoothstep",
      animated: !dimmed,
      zIndex: highlighted ? 10 : 0,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: dimmed ? "#D1D5DB" : color,
        width: 14,
        height: 14,
      },
      style: {
        stroke: dimmed ? "#D1D5DB" : color,
        strokeWidth: dimmed ? 1 : 2,
        opacity: dimmed ? 0.3 : 1,
      },
    } as Edge);
  });

  links.forEach((link) => {
    const srcLevel = levelMap[link.mentorId] ?? 0;
    const highlighted =
      subtreeIds
        ? subtreeIds.has(link.mentorId) && subtreeIds.has(link.discipleId)
        : true;
    const dimmed = !!subtreeIds && !highlighted;
    const color = getEdgeColor(srcLevel);

    edges.push({
      id: `e_${link.id}`,
      source: link.mentorId,
      target: link.discipleId,
      type: "smoothstep",
      animated: !dimmed && link.status === "in_progress",
      zIndex: highlighted ? 10 : 0,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: dimmed ? "#D1D5DB" : color,
        width: 14,
        height: 14,
      },
      style: {
        stroke: dimmed ? "#D1D5DB" : color,
        strokeWidth: dimmed ? 1 : highlighted ? 2.5 : 1.5,
        opacity: dimmed ? 0.25 : 1,
        strokeDasharray: link.status === "completed" ? "0" : "6 3",
      },
      label:
        !dimmed && link.status
          ? link.status === "completed"
            ? "✓"
            : "..."
          : undefined,
      labelStyle: { fontSize: 10, fill: color },
      labelBgStyle: { fill: "transparent" },
    } as Edge);
  });

  return { nodes, edges };
}

// ─────────────────────────────────────────────────────────────
// CUSTOM NODES — React Flow nodes are rendered on an absolutely
// positioned canvas, so they intentionally keep their own inline
// styles (antd components don't apply here). Everything *around*
// the canvas (toolbar, sidebar, side panel, forms) uses antd.
// ─────────────────────────────────────────────────────────────

const RootNode = ({ data }: { data: any }) => {
  const { isDimmed } = data;
  return (
    <div
      style={{
        width: 140,
        background: "#fff",
        border: `1.5px solid ${ROOT_COLOR.border}`,
        borderRadius: 14,
        overflow: "hidden",
        opacity: isDimmed ? 0.3 : 1,
        transition: "opacity 0.2s",
        boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
      }}
    >
      <div
        style={{
          background: ROOT_COLOR.header,
          padding: "9px 12px",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CrownOutlined style={{ color: "#fff", fontSize: 14 }} />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#fff", lineHeight: 1.2 }}>
            Khởi Nguồn
          </div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
            Gốc hệ thống
          </div>
        </div>
      </div>
      <div
        style={{
          padding: "6px 12px 8px",
          background: ROOT_COLOR.bg,
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <ApartmentOutlined style={{ fontSize: 10, color: "#9CA3AF" }} />
        <span style={{ fontSize: 10, color: "#6B7280" }}>Cây môn đồ</span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: ROOT_COLOR.border, width: 10, height: 10, border: "2.5px solid #fff", boxShadow: "0 0 0 1px #E5E7EB" }}
      />
    </div>
  );
};

const MentorNode = ({ data }: { data: any }) => {
  const { member, level, isDimmed, isFocus, discipleCount, onEyeClick } = data;
  const p = getPalette(level);
  const initials = getInitials(member?.fullName);

  return (
    <div
      style={{
        width: NODE_W,
        background: "#fff",
        border: isFocus ? `2px solid ${p.border}` : `1px solid #E5E7EB`,
        borderRadius: 14,
        overflow: "hidden",
        opacity: isDimmed ? 0.25 : 1,
        transition: "all 0.2s",
        boxShadow: isFocus ? `0 0 0 4px ${p.bg}, 0 4px 16px rgba(0,0,0,0.1)` : "0 2px 8px rgba(0,0,0,0.06)",
        cursor: "pointer",
      }}
    >
      <div style={{ background: p.header, padding: "10px 12px", display: "flex", alignItems: "center", gap: 9, position: "relative" }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: p.avatarBg,
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            color: p.avatarText,
            flexShrink: 0,
            border: "1.5px solid rgba(255,255,255,0.3)",
          }}
        >
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: p.headerText, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.3 }}>
            {member?.fullName || "Vô danh"}
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>
            Mentor cấp {level + 1}
          </div>
        </div>
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (member?.id) onEyeClick(member.id);
          }}
          style={{ width: 24, height: 24, borderRadius: 6, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
          title="Xem chi tiết"
        >
          <EyeOutlined style={{ color: "rgba(255,255,255,0.85)", fontSize: 12 }} />
        </div>
      </div>

      <div style={{ padding: "8px 12px 10px", background: p.bg }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
          <div style={{ fontSize: 10, color: p.subtextOnBg, display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
            <BookOutlined style={{ fontSize: 10, flexShrink: 0 }} />
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{member?.branchName || "—"}</span>
          </div>
          {discipleCount > 0 && (
            <div style={{ fontSize: 10, fontWeight: 600, color: p.chipText, background: p.chipBg, borderRadius: 20, padding: "2px 8px", flexShrink: 0, display: "flex", alignItems: "center", gap: 3 }}>
              <TeamOutlined style={{ fontSize: 9 }} />
              {discipleCount}
            </div>
          )}
        </div>
      </div>

      <Handle type="target" position={Position.Left} style={{ background: p.border, width: 10, height: 10, border: "2.5px solid #fff", boxShadow: "0 0 0 1px #E5E7EB" }} />
      <Handle type="source" position={Position.Right} style={{ background: p.border, width: 10, height: 10, border: "2.5px solid #fff", boxShadow: "0 0 0 1px #E5E7EB" }} />
    </div>
  );
};

const DiscipleNode = ({ data }: { data: any }) => {
  const { member, isDimmed, isFocus, onEyeClick, link, onEditEdge } = data;
  const isCompleted = link?.status === "completed";
  const initials = getInitials(member?.fullName);

  return (
    <div
      style={{
        width: NODE_W,
        background: "#fff",
        border: isFocus ? "2px solid #6D28D9" : "1px solid #E5E7EB",
        borderRadius: 12,
        overflow: "hidden",
        opacity: isDimmed ? 0.2 : 1,
        transition: "all 0.2s",
        boxShadow: isFocus ? "0 0 0 3px #EDE9FE, 0 4px 14px rgba(0,0,0,0.1)" : "0 1px 4px rgba(0,0,0,0.05)",
        cursor: "pointer",
      }}
    >
      <div style={{ padding: "9px 12px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#6B7280", flexShrink: 0, border: "1px solid #E5E7EB" }}>
          {initials}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {member?.fullName || "Vô danh"}
          </div>
          <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 1, display: "flex", alignItems: "center", gap: 3 }}>
            {link?.startDate && <span>Từ {link.startDate}</span>}
          </div>
        </div>

        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {onEditEdge && link && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onEditEdge(link);
              }}
              style={{ width: 22, height: 22, borderRadius: 6, background: "#F9FAFB", border: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              title="Chỉnh sửa liên kết"
            >
              <EditOutlined style={{ fontSize: 10, color: "#9CA3AF" }} />
            </div>
          )}
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (member?.id) onEyeClick(member.id);
            }}
            style={{ width: 22, height: 22, borderRadius: 6, background: "#F9FAFB", border: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            title="Xem chi tiết"
          >
            <EyeOutlined style={{ fontSize: 10, color: "#9CA3AF" }} />
          </div>
        </div>
      </div>

      <div style={{ padding: "4px 12px 6px", borderTop: "1px solid #F3F4F6", display: "flex", alignItems: "center", gap: 6, background: isCompleted ? "#F0FDF4" : "#FFFBEB" }}>
        {isCompleted ? <CheckCircleOutlined style={{ fontSize: 10, color: "#16A34A" }} /> : <ClockCircleOutlined style={{ fontSize: 10, color: "#D97706" }} />}
        <span style={{ fontSize: 10, color: isCompleted ? "#16A34A" : "#D97706", fontWeight: 500 }}>
          {isCompleted ? "Hoàn thành" : "Đang đào tạo"}
        </span>
        {member?.branchName && (
          <>
            <span style={{ fontSize: 10, color: "#D1D5DB" }}>·</span>
            <span style={{ fontSize: 10, color: "#9CA3AF" }}>{member.branchName}</span>
          </>
        )}
      </div>

      <Handle type="target" position={Position.Left} style={{ background: "#9CA3AF", width: 8, height: 8, border: "2px solid #fff", boxShadow: "0 0 0 1px #E5E7EB" }} />
      <Handle type="source" position={Position.Right} style={{ background: "#9CA3AF", width: 8, height: 8, border: "2px solid #fff", boxShadow: "0 0 0 1px #E5E7EB" }} />
    </div>
  );
};

const nodeTypes = {
  rootNode: RootNode,
  mentorNode: MentorNode,
  discipleNode: DiscipleNode,
};

// ─────────────────────────────────────────────────────────────
// MAIN CONTENT
// ─────────────────────────────────────────────────────────────

function DiagramContent() {
  const { message } = App.useApp();
  const { fitView } = useReactFlow();
  const [panelForm] = Form.useForm();

  const [courses, setCourses] = useState<Course[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");

  const [treeLinks, setTreeLinks] = useState<Link[]>([]);
  const [memberMap, setMemberMap] = useState<Map<string, MemberProfile>>(new Map());
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(false);

  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [focusMyself] = useState(false);
  const [currentUserId] = useState<string>("");

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<PanelMode>("view");
  const [editingLink, setEditingLink] = useState<Link | null>(null);

  const [memberDetail, setMemberDetail] = useState<MemberDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/courses").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
    ])
      .then(([courseRes, userRes]) => {
        if (courseRes.success) {
          setCourses(courseRes.data || []);
          if (courseRes.data?.length && !selectedCourse) {
            setSelectedCourse(courseRes.data[0].id);
          }
        }
        if (userRes.success) setUsers(userRes.data || []);
      })
      .catch(() => message.error("Lỗi tải dữ liệu khởi tạo"));
  }, []); // eslint-disable-line

  const loadTree = useCallback(async () => {
    if (!selectedCourse) return;
    setLoading(true);
    setFocusedNodeId(null);
    try {
      const url =
        focusMyself && currentUserId
          ? `/api/discipleship-tree?courseId=${selectedCourse}&focusMemberId=${currentUserId}`
          : `/api/discipleship-tree?courseId=${selectedCourse}`;
      const res = await fetch(url).then((r) => r.json());
      if (res.success && res.data?.links) {
        setTreeLinks(res.data.links);
        setMemberMap(new Map((res.data.members || []).map((m: MemberProfile) => [m.id, m])));
      } else {
        setTreeLinks([]);
        setMemberMap(new Map());
      }
    } catch {
      message.error("Lỗi tải cây môn đồ");
    } finally {
      setLoading(false);
    }
  }, [selectedCourse, focusMyself, currentUserId, message]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  const onEyeClick = useCallback(
    (memberId: string) => {
      if (!memberId) return;
      setPanelMode("view");
      setRightPanelOpen(true);
      setDetailLoading(true);
      setMemberDetail(null);
      fetch(`/api/members/${memberId}?courseId=${selectedCourse}`)
        .then((r) => r.json())
        .then((json) => {
          if (json.success) setMemberDetail(json.data);
          else message.error(json.error?.message || "Lỗi tải chi tiết");
        })
        .catch(() => message.error("Lỗi kết nối"))
        .finally(() => setDetailLoading(false));
    },
    [selectedCourse, message]
  );

  const onEditEdge = useCallback(
    (link: Link) => {
      setEditingLink(link);
      setPanelMode("edit");
      setRightPanelOpen(true);
      panelForm.setFieldsValue({
        courseId: link.courseId,
        mentorId: link.mentorId,
        discipleId: link.discipleId,
        startDate: link.startDate,
        endDate: link.endDate ?? undefined,
        status: link.status ?? "in_progress",
        notes: link.notes ?? "",
      });
    },
    [panelForm]
  );

  useEffect(() => {
    if (!treeLinks.length) {
      setNodes([]);
      setEdges([]);
      return;
    }
    const { nodes: n, edges: e } = buildTree(treeLinks, memberMap, focusedNodeId ?? undefined, onEyeClick, onEditEdge);
    setNodes(n);
    setEdges(e);
    setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 50);
  }, [treeLinks, memberMap, focusedNodeId, onEyeClick, onEditEdge, setNodes, setEdges, fitView]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.id === "root") {
        setFocusedNodeId(null);
        return;
      }
      setFocusedNodeId((prev) => (prev === node.id ? null : node.id));
      const member = (node.data as any)?.member as MemberProfile | undefined;
      if (member?.id) onEyeClick(member.id);
    },
    [onEyeClick]
  );

  const handleCreateRelation = async () => {
    const values = await panelForm.validateFields();
    setSubmitLoading(true);
    try {
      const res = await fetch("/api/training-relations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: values.courseId || selectedCourse,
          mentorId: values.mentorId,
          discipleId: values.discipleId,
          startDate: values.startDate,
          endDate: values.endDate || null,
          status: values.status ?? "in_progress",
          notes: values.notes || null,
        }),
      });
      if (!res.ok) throw new Error();
      message.success("Tạo liên kết thành công!");
      await loadTree();
      setPanelMode("view");
      onEyeClick(values.discipleId);
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error("Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleUpdateRelation = async () => {
    if (!editingLink) return;
    const values = await panelForm.validateFields();
    setSubmitLoading(true);
    try {
      const res = await fetch(`/api/training-relations/${editingLink.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: values.courseId || selectedCourse,
          mentorId: values.mentorId,
          discipleId: values.discipleId,
          startDate: values.startDate,
          endDate: values.endDate || null,
          status: values.status,
          notes: values.notes || null,
        }),
      });
      if (!res.ok) throw new Error();
      message.success("Cập nhật liên kết thành công!");
      await loadTree();
      setPanelMode("view");
      onEyeClick(values.discipleId);
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error("Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleSubmit = () => {
    if (panelMode === "create") handleCreateRelation();
    else if (panelMode === "edit") handleUpdateRelation();
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !memberDetail?.member) return;
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromId: currentUserId,
          toId: memberDetail.member.id,
          content: messageInput,
        }),
      });
      if (res.ok) {
        message.success("Gửi tin nhắn thành công!");
        setMessageInput("");
      }
    } catch {
      message.error("Lỗi gửi tin nhắn");
    }
  };

  const openCreatePanel = useCallback(
    (mentorId?: string) => {
      setPanelMode("create");
      setEditingLink(null);
      setRightPanelOpen(true);
      setMemberDetail(null);
      panelForm.resetFields();
      panelForm.setFieldsValue({
        status: "in_progress",
        courseId: selectedCourse,
        ...(mentorId ? { mentorId } : {}),
      });
    },
    [panelForm, selectedCourse]
  );

  const closeRightPanel = () => {
    setRightPanelOpen(false);
    setMemberDetail(null);
    setPanelMode("view");
    setEditingLink(null);
  };

  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.source !== "root") {
        openCreatePanel(connection.source);
        panelForm.setFieldsValue({ discipleId: connection.target });
      }
    },
    [openCreatePanel, panelForm]
  );

  const sidebarMembers = Array.from(memberMap.values()).filter((m) =>
    m.fullName?.toLowerCase().includes(searchText.toLowerCase())
  );

  // ── Right panel: detail view ───────────────────────────────

  const renderDetailPanel = () => {
    if (detailLoading) {
      return (
        <div style={{ padding: 16 }}>
          <Skeleton avatar paragraph={{ rows: 5 }} active />
        </div>
      );
    }

    if (!memberDetail) {
      return (
        <Flex align="center" justify="center" style={{ height: "100%" }}>
          <Empty description="Chọn một thành viên để xem chi tiết" />
        </Flex>
      );
    }

    const d = memberDetail;
    const initials = getInitials(d.member.fullName);

    const statCards = [
      { num: d.descendants.filter((x) => x.level === 1).length, label: "Môn đồ" },
      { num: d.descendants.length, label: "Cây con" },
      { num: d.descendants.filter((x) => x.link && !x.link.endDate).length, label: "Đang HD" },
    ];

    return (
      <Flex vertical style={{ height: "100%", overflow: "hidden" }}>
        <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
          <Flex vertical gap={12}>
            {/* Hero card */}
            <Card size="small">
              <Flex gap={12} align="flex-start">
                <Avatar size={46} style={{ background: "#EDE9FE", color: "#6D28D9", fontWeight: 700, flexShrink: 0 }}>
                  {initials}
                </Avatar>
                <Flex vertical gap={4} style={{ minWidth: 0, flex: 1 }}>
                  <Text strong style={{ fontSize: 15 }}>{d.member.fullName}</Text>
                  {d.member.email && <Text type="secondary" style={{ fontSize: 12 }}>{d.member.email}</Text>}
                  <Space size={4} wrap>
                    {d.member.roles?.map((r) => (
                      <Tag key={r} color="purple" bordered={false}>{r}</Tag>
                    ))}
                  </Space>
                </Flex>
              </Flex>
            </Card>

            {/* Stats row */}
            <Flex gap={8}>
              {statCards.map((s) => (
                <Card key={s.label} size="small" style={{ flex: 1, textAlign: "center" }}>
                  <Text strong style={{ fontSize: 22, color: "#6D28D9", display: "block", lineHeight: 1 }}>
                    {s.num}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>{s.label}</Text>
                </Card>
              ))}
            </Flex>

            {/* Info */}
            <Card
              size="small"
              title={
                <Space size={6}>
                  <NodeIndexOutlined />
                  <Text strong style={{ fontSize: 12 }}>Thông tin cá nhân</Text>
                </Space>
              }
              styles={{ body: { padding: 0 } }}
            >
              {[
                { label: "Điện thoại", val: d.member.phone || "—" },
                { label: "Ngày sinh", val: d.member.birthDate || "—" },
                { label: "Chi hội", val: d.member.branchName || "—" },
              ].map((row, idx, arr) => (
                <Flex
                  key={row.label}
                  align="center"
                  justify="space-between"
                  style={{
                    padding: "8px 14px",
                    borderBottom: idx < arr.length - 1 ? "1px solid #F3F4F6" : undefined,
                  }}
                >
                  <Text type="secondary" style={{ fontSize: 12 }}>{row.label}</Text>
                  <Text style={{ fontSize: 12 }}>{row.val}</Text>
                </Flex>
              ))}
            </Card>

            {/* Mentor stats */}
            {d.mentorStats.length > 0 && (
              <Card
                size="small"
                title={
                  <Space size={6}>
                    <TeamOutlined />
                    <Text strong style={{ fontSize: 12 }}>Chỉ số đào tạo</Text>
                  </Space>
                }
                styles={{ body: { padding: 0 } }}
              >
                {d.mentorStats.map((stat, idx, arr) => (
                  <Flex
                    key={stat.courseId}
                    align="center"
                    justify="space-between"
                    style={{
                      padding: "8px 14px",
                      borderBottom: idx < arr.length - 1 ? "1px solid #F3F4F6" : undefined,
                    }}
                  >
                    <Text type="secondary" style={{ fontSize: 12 }}>{stat.courseName}</Text>
                    <Text strong style={{ color: "#6D28D9" }}>
                      {stat.totalDisciples} <Text type="secondary" style={{ fontWeight: 400, fontSize: 11 }}>môn đồ</Text>
                    </Text>
                  </Flex>
                ))}
              </Card>
            )}

            {/* Hierarchy timeline */}
            <Card
              size="small"
              title={
                <Space size={6}>
                  <ApartmentOutlined />
                  <Text strong style={{ fontSize: 12 }}>Hệ thống cấp bậc</Text>
                </Space>
              }
            >
              <Timeline
                items={[
                  { color: "gray", children: <Text type="secondary" italic style={{ fontSize: 12 }}>Khởi nguồn (Gốc)</Text> },
                  ...d.ancestors
                    .slice()
                    .reverse()
                    .map((a) => ({
                      color: "blue",
                      children: (
                        <Text style={{ fontSize: 12 }}>
                          <Text type="secondary">Người dẫn dắt: </Text>
                          <Text strong>{a.member.fullName}</Text>
                        </Text>
                      ),
                    })),
                  {
                    color: "purple",
                    children: (
                      <Space size={6}>
                        <Text strong style={{ fontSize: 12 }}>{d.member.fullName}</Text>
                        <Tag color="purple">Đang xem</Tag>
                      </Space>
                    ),
                  },
                  ...d.descendants.map((desc) => ({
                    color: "orange",
                    children: (
                      <Flex justify="space-between" align="center">
                        <Text style={{ fontSize: 12 }}>
                          <Text type="secondary">Môn đồ: </Text>
                          <Text strong>{desc.member.fullName}</Text>
                        </Text>
                        <Tag color="orange">Cấp {desc.level}</Tag>
                      </Flex>
                    ),
                  })),
                ]}
              />
            </Card>
          </Flex>
        </div>

        {/* Message box — sticky bottom */}
        <div style={{ padding: 14, borderTop: "1px solid #F3F4F6", flexShrink: 0 }}>
          <Text strong style={{ fontSize: 12, display: "block", marginBottom: 8 }}>
            Gửi tin nhắn đào tạo
          </Text>
          <Input.TextArea
            rows={2}
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Nhập lời nhắn cho thành viên..."
          />
          <Button type="primary" icon={<SendOutlined />} onClick={sendMessage} block style={{ marginTop: 8 }}>
            Gửi tin nhắn
          </Button>
        </div>
      </Flex>
    );
  };

  // ── Right panel: create / edit form ────────────────────────

  const renderFormPanel = () => {
    const isEdit = panelMode === "edit";

    const mentorOptions = users
      .filter((u) => u.roles?.includes("MENTOR") || u.roles?.includes("ADMIN"))
      .map((u) => ({ value: u.id, label: u.fullName }));

    const discipleOptions = users.map((u) => ({ value: u.id, label: u.fullName }));

    return (
      <Flex vertical style={{ height: "100%", overflow: "hidden" }}>
        <div style={{ padding: 14, flexShrink: 0 }}>
          <Space size={6}>
            {isEdit ? <EditOutlined /> : <PlusOutlined />}
            <Text strong>{isEdit ? "Chỉnh sửa liên kết đào tạo" : "Tạo liên kết đào tạo mới"}</Text>
          </Space>
          <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 4 }}>
            {isEdit ? "Cập nhật thông tin liên kết mentor — môn đồ." : "Thiết lập quan hệ đào tạo giữa mentor và môn đồ."}
          </Text>
        </div>

        <Divider style={{ margin: 0 }} />

        <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
          <Form form={panelForm} layout="vertical" requiredMark={false}>
            <Form.Item label="Khóa học" name="courseId" rules={[{ required: true, message: "Vui lòng chọn khóa học." }]}>
              <Select
                options={courses.map((c) => ({ value: c.id, label: c.name }))}
                placeholder="Chọn khóa học..."
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>

            <Divider />

            <Form.Item
              label="Người hướng dẫn (Mentor)"
              name="mentorId"
              rules={[
                { required: true, message: "Vui lòng chọn người hướng dẫn." },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || value !== getFieldValue("discipleId")) return Promise.resolve();
                    return Promise.reject("Mentor và môn đồ phải là 2 người khác nhau.");
                  },
                }),
              ]}
            >
              <Select options={mentorOptions} placeholder="Chọn người hướng dẫn..." showSearch optionFilterProp="label" />
            </Form.Item>

            <Form.Item
              label="Môn đồ"
              name="discipleId"
              rules={[
                { required: true, message: "Vui lòng chọn môn đồ." },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || value !== getFieldValue("mentorId")) return Promise.resolve();
                    return Promise.reject("Mentor và môn đồ phải là 2 người khác nhau.");
                  },
                }),
              ]}
            >
              <Select options={discipleOptions} placeholder="Chọn môn đồ..." showSearch optionFilterProp="label" />
            </Form.Item>

            <Divider />

            <Flex gap={10}>
              <Form.Item
                label="Ngày bắt đầu"
                name="startDate"
                style={{ flex: 1 }}
                rules={[
                  { required: true, message: "Bắt buộc." },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const end = getFieldValue("endDate");
                      if (!value || !end || value <= end) return Promise.resolve();
                      return Promise.reject("Phải nhỏ hơn ngày kết thúc.");
                    },
                  }),
                ]}
              >
                <Input type="date" />
              </Form.Item>

              <Form.Item
                label="Ngày kết thúc"
                name="endDate"
                style={{ flex: 1 }}
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const start = getFieldValue("startDate");
                      if (!value || !start || start <= value) return Promise.resolve();
                      return Promise.reject("Phải lớn hơn ngày bắt đầu.");
                    },
                  }),
                ]}
              >
                <Input type="date" />
              </Form.Item>
            </Flex>

            <Form.Item label="Trạng thái" name="status" initialValue="in_progress">
              <Select
                options={[
                  {
                    value: "in_progress",
                    label: (
                      <Space size={6}>
                        <ClockCircleOutlined style={{ color: "#D97706" }} />
                        Đang đào tạo
                      </Space>
                    ),
                  },
                  {
                    value: "completed",
                    label: (
                      <Space size={6}>
                        <CheckCircleOutlined style={{ color: "#16A34A" }} />
                        Đã hoàn thành
                      </Space>
                    ),
                  },
                ]}
              />
            </Form.Item>

            <Form.Item label="Ghi chú" name="notes">
              <Input.TextArea rows={3} placeholder="Nhập ghi chú về quá trình đào tạo..." />
            </Form.Item>
          </Form>
        </div>

        <Divider style={{ margin: 0 }} />

        <Flex gap={8} style={{ padding: 14, flexShrink: 0 }}>
          <Button onClick={closeRightPanel} style={{ flex: 1 }}>
            Hủy bỏ
          </Button>
          <Button
            type="primary"
            danger={isEdit}
            loading={submitLoading}
            onClick={handleSubmit}
            icon={isEdit ? <EditOutlined /> : <PlusOutlined />}
            style={{ flex: 2 }}
          >
            {isEdit ? "Lưu thay đổi" : "Tạo liên kết"}
          </Button>
        </Flex>
      </Flex>
    );
  };

  // ── Render ────────────────────────────────────────────────

  return (
    <Layout style={{ height: "100vh", overflow: "hidden" }}>
      {/* ── TOOLBAR ─────────────────────────────────────────── */}
      <Flex
        align="center"
        justify="space-between"
        gap={12}
        style={{
          height: 56,
          padding: "0 16px",
          background: "#fff",
          borderBottom: "1px solid #E5E7EB",
          flexShrink: 0,
        }}
      >
        <Flex align="center" gap={10}>
          <Tooltip title={sidebarOpen ? "Ẩn sidebar" : "Mở sidebar"}>
            <Button
              type="text"
              icon={sidebarOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
              onClick={() => setSidebarOpen((v) => !v)}
            />
          </Tooltip>
          <Tag color="purple" icon={<ApartmentOutlined />} style={{ fontSize: 13, padding: "4px 10px" }}>
            Cây Môn Đồ
          </Tag>
        </Flex>

        <Flex align="center" gap={8}>
          <Select
            value={selectedCourse}
            onChange={(val) => {
              setSelectedCourse(val);
              setFocusedNodeId(null);
            }}
            style={{ width: 220 }}
            placeholder="Chọn khóa học"
            options={courses.map((c) => ({ value: c.id, label: c.name }))}
          />
          {focusedNodeId && (
            <Button size="small" type="link" icon={<CloseOutlined />} onClick={() => setFocusedNodeId(null)}>
              Bỏ focus
            </Button>
          )}
        </Flex>

        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreatePanel()}>
            Thêm liên kết
          </Button>
          <Tooltip title="Fit toàn bộ cây">
            <Button icon={<NodeIndexOutlined />} onClick={() => fitView({ padding: 0.15, duration: 500 })} />
          </Tooltip>
        </Space>
      </Flex>

      {/* ── BODY ────────────────────────────────────────────── */}
      <Layout style={{ overflow: "hidden" }}>
        {/* ── LEFT SIDEBAR ──────────────────────────────────── */}
        {sidebarOpen && (
          <Sider
            width={240}
            theme="light"
            style={{
              borderRight: "1px solid #E5E7EB",
              height: "100%",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ padding: 12, borderBottom: "1px solid #F3F4F6", flexShrink: 0 }}>
              <Input
                prefix={<SearchOutlined style={{ color: "#D1D5DB" }} />}
                placeholder="Tìm kiếm thành viên..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
            </div>

            {/* Scrollable member list — fixes clipped content when data is large */}
            <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
              <Flex
                align="center"
                gap={9}
                style={{ padding: "7px 8px", borderRadius: 8, marginBottom: 2, cursor: "pointer" }}
                onClick={() => setFocusedNodeId(null)}
              >
                <Avatar size={30} icon={<CrownOutlined />} style={{ background: "#F3F4F6", color: "#9CA3AF" }} />
                <div>
                  <Text strong style={{ fontSize: 12, display: "block" }}>Đấng Tối Cao</Text>
                  <Text type="secondary" style={{ fontSize: 10 }}>Khởi nguồn</Text>
                </div>
              </Flex>

              <Text
                type="secondary"
                style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", padding: "8px 8px 4px", display: "block" }}
              >
                Người hướng dẫn
              </Text>

              {sidebarMembers.map((m) => {
                const isActive = focusedNodeId === m.id;
                return (
                  <Flex
                    key={m.id}
                    align="center"
                    gap={9}
                    onClick={() => {
                      setFocusedNodeId(m.id);
                      onEyeClick(m.id);
                    }}
                    style={{
                      padding: "7px 8px",
                      borderRadius: 8,
                      cursor: "pointer",
                      background: isActive ? "#F5F3FF" : "transparent",
                      border: isActive ? "1px solid #DDD6FE" : "1px solid transparent",
                      marginBottom: 2,
                    }}
                  >
                    <Avatar size={30} style={{ background: isActive ? "#EDE9FE" : "#F3F4F6", color: isActive ? "#6D28D9" : "#6B7280" }}>
                      {getInitials(m.fullName)}
                    </Avatar>
                    <Flex vertical style={{ minWidth: 0, flex: 1 }}>
                      <Text strong={isActive} style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {m.fullName}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 10 }}>{m.branchName || "—"}</Text>
                    </Flex>
                    {isActive && <EyeOutlined style={{ fontSize: 11, color: "#8B5CF6", flexShrink: 0 }} />}
                  </Flex>
                );
              })}

              {sidebarMembers.length === 0 && (
                <Flex justify="center" style={{ padding: "24px 0" }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Không tìm thấy thành viên</Text>
                </Flex>
              )}
            </div>

            <div style={{ padding: 12, borderTop: "1px solid #F3F4F6", flexShrink: 0 }}>
              <Button type="primary" block icon={<PlusOutlined />} onClick={() => openCreatePanel()}>
                Thêm liên kết mới
              </Button>
            </div>
          </Sider>
        )}

        {/* ── CANVAS ────────────────────────────────────────── */}
        <Content style={{ position: "relative", background: "#F9FAFB", overflow: "hidden" }}>
          {loading && (
            <Flex
              align="center"
              justify="center"
              style={{ position: "absolute", inset: 0, background: "rgba(249,250,251,0.85)", zIndex: 20 }}
            >
              <Space direction="vertical" align="center">
                <Spin size="large" />
                <Text type="secondary" style={{ fontSize: 12 }}>Đang tải cây môn đồ...</Text>
              </Space>
            </Flex>
          )}

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            onConnect={onConnect}
            fitView
            fitViewOptions={{ padding: 0.18 }}
            minZoom={0.08}
            maxZoom={2}
            deleteKeyCode={null}
            style={{ background: "#F9FAFB" }}
          >
            <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#D1D5DB" />
            <Controls style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }} />
            <MiniMap
              style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
              nodeColor={(n) => {
                if (n.id === "root") return "#9CA3AF";
                const lvl = (n.data as any)?.level ?? 0;
                return getPalette(lvl).header;
              }}
            />

            <Panel position="top-left">
              <Card size="small" styles={{ body: { padding: "7px 12px" } }}>
                <Space size={6}>
                  <ApartmentOutlined style={{ color: "#6D28D9" }} />
                  <Text strong style={{ fontSize: 12 }}>
                    {courses.find((c) => c.id === selectedCourse)?.name || "Cây Môn Đồ"}
                  </Text>
                </Space>
                <div>
                  <Text type="secondary" style={{ fontSize: 10 }}>
                    {nodes.filter((n) => n.id !== "root").length} thành viên · {edges.length} liên kết
                  </Text>
                </div>
              </Card>
            </Panel>

            <Panel position="bottom-left">
              <Card size="small" styles={{ body: { padding: "8px 12px" } }}>
                <Text type="secondary" style={{ fontSize: 10, fontWeight: 600, display: "block", marginBottom: 4 }}>
                  CHÚ THÍCH
                </Text>
                <Flex vertical gap={5}>
                  {[
                    { color: "#6D28D9", label: "Mentor cấp 1" },
                    { color: "#2563EB", label: "Mentor cấp 2" },
                    { color: "#0891B2", label: "Mentor cấp 3" },
                    { color: "#6B7280", label: "Môn đồ" },
                  ].map((l) => (
                    <Flex key={l.label} align="center" gap={7}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color, flexShrink: 0 }} />
                      <Text type="secondary" style={{ fontSize: 10 }}>{l.label}</Text>
                    </Flex>
                  ))}
                </Flex>
                <Divider style={{ margin: "6px 0" }} />
                <Text type="secondary" style={{ fontSize: 10 }}>-- Đang đào tạo &nbsp; — Hoàn thành</Text>
              </Card>
            </Panel>
          </ReactFlow>
        </Content>

        {/* ── RIGHT PANEL ───────────────────────────────────── */}
        {rightPanelOpen && (
          <Sider
            width={320}
            theme="light"
            style={{
              borderLeft: "1px solid #E5E7EB",
              height: "100%",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Flex align="center" justify="space-between" style={{ padding: 14, borderBottom: "1px solid #F3F4F6", flexShrink: 0 }}>
              <Space size={8}>
                <Text strong style={{ fontSize: 13 }}>
                  {panelMode === "view" ? "Chi tiết thành viên" : panelMode === "create" ? "Tạo liên kết" : "Chỉnh sửa liên kết"}
                </Text>
                {panelMode === "view" && memberDetail && <Badge count="Đang chọn" color="purple" />}
              </Space>
              <Space size={4}>
                {panelMode === "view" && memberDetail && (
                  <Tooltip title="Tạo liên kết từ thành viên này">
                    <Button size="small" icon={<PlusOutlined />} onClick={() => openCreatePanel(memberDetail.member.id)}>
                      Thêm môn đồ
                    </Button>
                  </Tooltip>
                )}
                <Button type="text" size="small" icon={<CloseOutlined />} onClick={closeRightPanel} />
              </Space>
            </Flex>

            <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              {panelMode === "view" ? renderDetailPanel() : renderFormPanel()}
            </div>
          </Sider>
        )}
      </Layout>
    </Layout>
  );
}

// ─────────────────────────────────────────────────────────────
// EXPORT — wrap with ReactFlowProvider + App (for message API)
// ─────────────────────────────────────────────────────────────

export default function DiscipleshipTree() {
  return (
    <App>
      <ReactFlowProvider>
        <DiagramContent />
      </ReactFlowProvider>
    </App>
  );
}
