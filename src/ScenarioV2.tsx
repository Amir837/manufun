import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Layout,
  Card,
  Button,
  Typography,
  Row,
  Col,
  Modal,
  Table,
  Tag,
  Space,
  Tooltip,
  Empty,
  Collapse,
  Result,
} from "antd";
import {
  PlusOutlined,
  MessageOutlined,
  DollarOutlined,
  ToolOutlined,
  ScheduleOutlined,
  ThunderboltOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CaretRightOutlined,
  PauseOutlined,
} from "@ant-design/icons";
import {
  WorkCenter,
  WorkOrder,
  ScheduledBlock,
  Operation,
  Scenario,
  WORK_CENTER_TYPES,
  SCENARIOS,
  BLOCK_COLORS,
  formatDate,
  dayToWeekLabel,
} from "./scenarios";
import { useScenarioController } from "./useScenarioController";

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;

/* ------------------------------------------------------------------ */
/*  Gantt Chart Component                                              */
/* ------------------------------------------------------------------ */

function GanttChart({
  blocks,
  workCenters,
  workOrders,
  totalDays,
  onBlockDrag,
  highlight,
  currentDay,
  isExecuting,
  onExecute,
  onPause,
}: {
  blocks: ScheduledBlock[];
  workCenters: WorkCenter[];
  workOrders: WorkOrder[];
  totalDays: number;
  onBlockDrag: (blockId: string, newStart: number) => void;
  highlight: boolean;
  currentDay: number;
  isExecuting: boolean;
  onExecute: () => void;
  onPause: () => void;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{ blockId: string; offsetX: number } | null>(null);

  const installedCenters = workCenters.filter((wc) => wc.type !== null);

  const numWeeks = Math.ceil(totalDays / 7);
  const colWidth = 100 / numWeeks;

  const handleMouseDown = (e: React.MouseEvent, blockId: string) => {
    if (isExecuting) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragging({ blockId, offsetX: e.clientX - rect.left });
    e.preventDefault();
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging || !timelineRef.current) return;
      const chartRect = timelineRef.current.getBoundingClientRect();
      const relativeX = e.clientX - chartRect.left - dragging.offsetX;
      const chartWidth = chartRect.width;
      const newStartDay = Math.max(0, Math.round((relativeX / chartWidth) * totalDays));
      onBlockDrag(dragging.blockId, newStartDay);
    },
    [dragging, totalDays, onBlockDrag]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (isExecuting && chartRef.current) {
      const playheadPct = currentDay / totalDays;
      const scrollTarget = chartRef.current.scrollWidth * playheadPct - chartRef.current.clientWidth / 2;
      chartRef.current.scrollTo({ left: Math.max(0, scrollTarget), behavior: "smooth" });
    }
  }, [currentDay, isExecuting, totalDays]);

  if (installedCenters.length === 0) {
    return <Empty description="Install work centers to see the schedule" />;
  }

  const dayPct = 100 / totalDays;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Space>
          {!isExecuting ? (
            <Button
              type="primary"
              danger
              icon={<CaretRightOutlined />}
              disabled={blocks.length === 0}
              onClick={onExecute}
            >
              Execute
            </Button>
          ) : (
            <Button icon={<PauseOutlined />} onClick={onPause}>
              Pause
            </Button>
          )}
          {currentDay > 0 && (
            <Tag color="red" style={{ fontSize: 13 }}>
              📅 {formatDate(currentDay)} (Day {currentDay})
            </Tag>
          )}
        </Space>
      </div>

      <div
        ref={chartRef}
        style={{
          border: highlight ? "2px solid #1668dc" : "1px solid #303030",
          borderRadius: 8,
          background: "#141414",
          boxShadow: highlight ? "0 0 16px rgba(22,104,220,0.3)" : undefined,
          transition: "box-shadow 0.3s, border-color 0.3s",
          overflowX: "auto",
          overflowY: "hidden",
        }}
      >
        <div style={{ minWidth: numWeeks * 80 + 120 }}>
          <div style={{ display: "flex", borderBottom: "1px solid #303030", background: "#1f1f1f" }}>
            <div style={{ width: 120, minWidth: 120, padding: "8px 12px", fontWeight: 600, fontSize: 13, color: "#ffffffd9" }}>
              Machine Schedule
            </div>
            <div style={{ flex: 1, display: "flex", position: "relative" }} ref={timelineRef}>
              {Array.from({ length: numWeeks }, (_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    padding: "8px 0",
                    fontSize: 11,
                    color: "#ffffff73",
                    borderLeft: "1px solid #303030",
                    minWidth: 80,
                  }}
                >
                  {dayToWeekLabel(i * 7)}
                </div>
              ))}
            </div>
          </div>

          {installedCenters.map((wc) => {
            const rowBlocks = blocks.filter((b) => b.workCenterId === wc.id);
            return (
              <div key={wc.id} style={{ display: "flex", borderBottom: "1px solid #303030", minHeight: 44 }}>
                <div
                  style={{
                    width: 120,
                    minWidth: 120,
                    padding: "10px 12px",
                    fontSize: 13,
                    color: "#ffffffd9",
                    background: "#1a1a1a",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {wc.type!.icon} <span style={{ marginLeft: 6 }}>{wc.type!.label}</span>
                </div>
                <div style={{ flex: 1, position: "relative", minHeight: 40 }}>
                  {Array.from({ length: numWeeks }, (_, i) => (
                    <div
                      key={i}
                      style={{
                        position: "absolute",
                        left: `${i * colWidth}%`,
                        top: 0,
                        bottom: 0,
                        width: 1,
                        background: "#303030",
                      }}
                    />
                  ))}
                  {currentDay > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        left: `${currentDay * dayPct}%`,
                        top: 0,
                        bottom: 0,
                        width: 2,
                        background: "#ff4d4f",
                        zIndex: 10,
                        pointerEvents: "none",
                      }}
                    />
                  )}
                  {rowBlocks.map((block) => {
                    const wo = workOrders.find((w) => w.id === block.workOrderId);
                    const isPast = currentDay > 0 && block.startDay + block.durationDays <= currentDay;
                    const isActive = currentDay > 0 && block.startDay <= currentDay && block.startDay + block.durationDays > currentDay;
                    return (
                      <div
                        key={block.id}
                        onMouseDown={(e) => handleMouseDown(e, block.id)}
                        style={{
                          position: "absolute",
                          left: `${block.startDay * dayPct}%`,
                          width: `${block.durationDays * dayPct}%`,
                          top: 4,
                          bottom: 4,
                          background: isPast ? "#ffffff20" : block.color,
                          borderRadius: 6,
                          cursor: isExecuting ? "default" : "grab",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          fontWeight: 600,
                          color: isPast ? "#ffffff60" : "#fff",
                          userSelect: "none",
                          boxShadow: isActive ? `0 0 8px ${block.color}` : "0 2px 4px rgba(0,0,0,0.3)",
                          border: isActive ? "1px solid #ff4d4f" : "none",
                          opacity: dragging?.blockId === block.id ? 0.7 : 1,
                          transition: dragging ? "none" : "left 0.15s ease, opacity 0.15s",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          padding: "0 6px",
                        }}
                      >
                        {wo?.partName || block.workOrderId}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Scenario Wrapper                                                   */
/* ------------------------------------------------------------------ */

export default function ScenarioV2() {
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const scenario = scenarioId ? SCENARIOS.find((s) => s.id === scenarioId) || null : null;

  if (!scenario) {
    return (
      <Layout style={{ background: "#0a0a0a", minHeight: "100vh", padding: 24 }}>
        <Content style={{ maxWidth: 900, margin: "0 auto", width: "100%" }}>
          <div style={{ textAlign: "center", marginBottom: 32, marginTop: 24 }}>
            <Title level={2} style={{ color: "#ffffffd9", marginBottom: 4 }}>
              🏭 Manufacturing Simulator
            </Title>
            <Text type="secondary" style={{ fontSize: 16 }}>Choose a scenario to begin</Text>
          </div>
          <Row gutter={[20, 20]} justify="center">
            {SCENARIOS.map((s) => {
              const diffColor = s.difficulty === "Easy" ? "#52c41a" : s.difficulty === "Medium" ? "#faad14" : "#ff4d4f";
              return (
                <Col key={s.id} xs={24} sm={12} md={8}>
                  <Card
                    hoverable
                    onClick={() => setScenarioId(s.id)}
                    style={{
                      background: "#141414",
                      border: `2px solid ${diffColor}44`,
                      borderRadius: 12,
                      height: "100%",
                      transition: "border-color 0.3s, box-shadow 0.3s",
                    }}
                    styles={{ body: { padding: 20 } }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = diffColor;
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${diffColor}33`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = `${diffColor}44`;
                      (e.currentTarget as HTMLElement).style.boxShadow = "none";
                    }}
                  >
                    <Title level={4} style={{ color: "#ffffffd9", margin: "0 0 8px 0" }}>
                      {s.name}
                    </Title>
                    <Text type="secondary" style={{ fontSize: 13, display: "block", marginBottom: 16, minHeight: 40 }}>
                      {s.description}
                    </Text>
                    <Space direction="vertical" size={4} style={{ width: "100%" }}>
                      <Text style={{ color: "#ffffffa6", fontSize: 12 }}>
                        💰 Starting cash: <Text strong style={{ color: "#52c41a" }}>${s.initialCash.toLocaleString()}</Text>
                      </Text>
                      <Text style={{ color: "#ffffffa6", fontSize: 12 }}>
                        📋 Monthly cost: <Text strong style={{ color: "#faad14" }}>${s.monthlyExpense.toLocaleString()}</Text>
                      </Text>
                      <Text style={{ color: "#ffffffa6", fontSize: 12 }}>
                        📦 Work orders: <Text strong style={{ color: "#1890ff" }}>{s.workOrders.length}</Text>
                      </Text>
                    </Space>
                    <Button
                      type="primary"
                      block
                      style={{ marginTop: 16, fontWeight: 600, background: diffColor, borderColor: diffColor }}
                    >
                      {s.difficulty}
                    </Button>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </Content>
      </Layout>
    );
  }

  return (
    <ScenarioGame
      key={scenarioId!}
      scenario={scenario}
      scenarioId={scenarioId!}
      onChangeScenario={(id) => setScenarioId(id || null)}
      onBackToMenu={() => setScenarioId(null)}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Game Component                                                     */
/* ------------------------------------------------------------------ */

function ScenarioGame({
  scenario,
  scenarioId,
  onChangeScenario,
  onBackToMenu,
}: {
  scenario: Scenario;
  scenarioId: string;
  onChangeScenario: (id: string) => void;
  onBackToMenu: () => void;
}) {
  const ctrl = useScenarioController(scenario);

  const opColumns = [
    {
      title: "Seq",
      dataIndex: "seq",
      key: "seq",
      width: 60,
      render: (v: number) => <Text strong>{v}</Text>,
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
    },
    {
      title: "",
      key: "status",
      width: 40,
      render: (_: unknown, record: Operation) => {
        const needed = !ctrl.installedTypes.has(record.workCenterType);
        return needed ? (
          <Tooltip title="Missing work center for this operation">
            <WarningOutlined style={{ color: "#d89614" }} />
          </Tooltip>
        ) : (
          <CheckCircleOutlined style={{ color: "#389e0d" }} />
        );
      },
    },
    {
      title: "Work Center",
      dataIndex: "workCenterType",
      key: "workCenterType",
      render: (key: string) => {
        const type = WORK_CENTER_TYPES.find((t) => t.key === key);
        return (
          <Tag color={type?.color || "default"}>
            {type?.icon} {type?.label || key}
          </Tag>
        );
      },
    },
  ];

  return (
    <Layout style={{ background: "#0a0a0a", minHeight: "100vh", padding: 24 }}>
      <Content style={{ maxWidth: 1400, margin: "0 auto", width: "100%" }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <Title level={3} style={{ margin: 0, color: "#ffffffd9" }}>
                🏭 {scenario.name}
              </Title>
              <Space style={{ marginTop: 4 }}>
                <Button type="link" size="small" onClick={onBackToMenu} style={{ padding: 0, color: "#ffffff73" }}>
                  ← Back to scenarios
                </Button>
              </Space>
            </div>
            <Space size="middle">
              <Tag color="volcano" style={{ fontSize: 13, padding: "2px 10px" }}>
                📋 ${scenario.monthlyExpense.toLocaleString()}/mo
              </Tag>
              <Tag icon={<DollarOutlined />} color={ctrl.cash < 0 ? "red" : "green"} style={{ fontSize: 16, padding: "4px 12px" }}>
                ${ctrl.cash.toLocaleString()}
              </Tag>
              {ctrl.earnedRevenue > 0 && (
                <Tag color="gold" style={{ fontSize: 14, padding: "4px 12px" }}>
                  Earned: ${ctrl.earnedRevenue.toLocaleString()}
                </Tag>
              )}
            </Space>
          </div>

          {/* Intro Modal */}
          <Modal
            title={
              <Space>
                <MessageOutlined style={{ color: "#1668dc" }} />
                <span>{scenario.introTitle}</span>
              </Space>
            }
            open={ctrl.showIntro}
            onOk={ctrl.handleDismissMessage}
            onCancel={ctrl.handleDismissMessage}
            cancelButtonProps={{ style: { display: "none" } }}
            okText="Let's Build"
            width={600}
            className="dark-modal"
          >
            <Paragraph style={{ color: "#ffffffd9", fontSize: 14, marginBottom: 12 }}>
              <Text strong>What to do:</Text>
            </Paragraph>
            <ol style={{ paddingLeft: 20, fontSize: 14, marginBottom: 20 }}>
              <li style={{ marginBottom: 6, color: "#ffffffd9" }}>📦 Review available POs at <Text strong style={{ color: "#4096ff" }}>"Available Purchase Orders"</Text></li>
              <li style={{ marginBottom: 6, color: "#ffffffd9" }}>🛒 Buy equipment at <Text strong style={{ color: "#ff7a45" }}>"Shop Floor"</Text></li>
              <li style={{ marginBottom: 6, color: "#ffffffd9" }}>✅ Accept work orders → they appear in <Text strong style={{ color: "#73d13d" }}>"Committed Work"</Text></li>
              <li style={{ marginBottom: 6, color: "#ffffffd9" }}>📅 Compute greedy schedule and optimize with drag and drop at <Text strong style={{ color: "#ffc53d" }}>"Production Planning"</Text></li>
              <li style={{ marginBottom: 6, color: "#ffffffd9" }}>▶️ Hit <Text strong style={{ color: "#9254de" }}>Execute</Text> and watch your shop run</li>
              <li style={{ marginBottom: 6, color: "#ffffffd9" }}>💰 Get paid — don't go bankrupt! Check the <Text strong style={{ color: "#36cfc9" }}>"Activity Log"</Text></li>
            </ol>
            <Collapse
              ghost
              size="small"
              expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} style={{ color: "#ffffff73", fontSize: 11 }} />}
              items={[
                {
                  key: "details",
                  label: <Text style={{ color: "#d89614", fontSize: 14, fontStyle: "italic" }}>📖 Who likes to read...</Text>,
                  children: (
                    <div>
                      {scenario.introParagraphs.map((p, i) => (
                        <Paragraph key={i} style={{ color: "#ffffffa6", fontSize: 13, marginBottom: 12 }}>
                          {p}
                        </Paragraph>
                      ))}
                      <Paragraph style={{ color: "#ffffffa6", fontSize: 13, marginBottom: 6 }}>
                        <Text strong style={{ color: "#ffffffd9", fontSize: 13 }}>Here's your plan:</Text>
                      </Paragraph>
                      <ol style={{ color: "#ffffffa6", paddingLeft: 20, fontSize: 13 }}>
                        {scenario.introSteps.map((step, i) => (
                          <li key={i} style={{ marginBottom: 4 }}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  ),
                },
              ]}
              style={{ padding: 0 }}
            />
          </Modal>

          {/* Top row: Committed Work (left) + Shop Floor 3x2 (right) */}
          <Row gutter={24}>
            <Col xs={24} lg={14}>
              <Card
                title={
                  <Space>
                    <ScheduleOutlined style={{ color: "#73d13d" }} />
                    <span style={{ color: "#73d13d" }}>Committed Work</span>
                    {ctrl.acceptedOrders.length > 0 && <Tag color="blue">{ctrl.acceptedOrders.length}</Tag>}
                  </Space>
                }
                style={{ background: "#141414", border: "1px solid #303030", borderRadius: 12, height: "100%" }}
                styles={{ header: { borderBottom: "1px solid #303030", color: "#ffffffd9" }, body: { padding: 12 } }}
              >
                {ctrl.acceptedOrders.length === 0 ? (
                  <Empty description={<Text type="secondary">Accept an order to see it here</Text>} />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {ctrl.acceptedOrders.map((wo, woIdx) => {
                      const isDone = ctrl.completedOrderIds.has(wo.id);
                      const woColor = BLOCK_COLORS[woIdx % BLOCK_COLORS.length];
                      return (
                        <Collapse
                          key={wo.id}
                          ghost
                          size="small"
                          expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} style={{ color: "#ffffff73", fontSize: 11 }} />}
                          items={[
                            {
                              key: wo.id,
                              label: (
                                <Space size="small" style={{ flexWrap: "wrap" }}>
                                  <Text strong style={{ color: isDone ? "#389e0d" : "#ffffffd9", fontSize: 14 }}>
                                    {wo.id}: {wo.partName}
                                  </Text>
                                  <Tag color="blue" style={{ margin: 0 }}>{wo.customer}</Tag>
                                  <Tag color="orange" style={{ margin: 0 }}>Qty: {wo.quantity}</Tag>
                                  <Tag icon={<ClockCircleOutlined />} style={{ margin: 0 }}>Due: {formatDate(wo.dueDay)}</Tag>
                                  <Tag color="green" icon={<DollarOutlined />} style={{ margin: 0 }}>${wo.revenue.toLocaleString()}</Tag>
                                  {isDone && <Tag color="success" icon={<CheckCircleOutlined />} style={{ margin: 0 }}>Complete</Tag>}
                                </Space>
                              ),
                              children: (
                                <Table
                                  dataSource={wo.operations}
                                  columns={opColumns}
                                  rowKey="seq"
                                  pagination={false}
                                  size="small"
                                  style={{ background: "transparent" }}
                                />
                              ),
                            },
                          ]}
                          style={{
                            background: isDone ? "#1a2a1a" : "#1a1a1a",
                            border: `1px solid ${isDone ? "#389e0d44" : woColor}`,
                            borderRadius: 8,
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </Card>
            </Col>

            <Col xs={24} lg={10}>
              <Card
                title={
                  <Space>
                    <ToolOutlined style={{ color: "#ff7a45" }} />
                    <span style={{ color: "#ff7a45" }}>Shop Floor</span>
                  </Space>
                }
                style={{ background: "#141414", border: "1px solid #303030", borderRadius: 12, height: "100%" }}
                styles={{ header: { borderBottom: "1px solid #303030", color: "#ffffffd9" }, body: { padding: 12 } }}
              >
                <Row gutter={[12, 12]}>
                  {ctrl.workCenters.map((wc) => (
                    <Col key={wc.id} span={8}>
                      {wc.type ? (
                        <Card
                          size="small"
                          className={ctrl.activeWorkCenterIds.has(wc.id) ? "wc-active" : undefined}
                          style={{
                            background: ctrl.activeWorkCenterIds.has(wc.id) ? "#1a2a1a" : "#1a1a1a",
                            border: `1px solid ${ctrl.activeWorkCenterIds.has(wc.id) ? wc.type.color : wc.type.color + "44"}`,
                            borderRadius: 8,
                            textAlign: "center",
                            minHeight: 110,
                          }}
                          styles={{ body: { padding: 12 } }}
                        >
                          <div style={{ fontSize: 28, marginBottom: 4 }}>{wc.type.icon}</div>
                          <Text strong style={{ color: "#ffffffd9", display: "block", fontSize: 12 }}>
                            {wc.type.label}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 10 }}>Bay {wc.id}</Text>
                        </Card>
                      ) : (
                        <Card
                          size="small"
                          hoverable
                          onClick={() => ctrl.setShowBuyModal(wc.id)}
                          style={{
                            background: "#1a1a1a",
                            border: "2px dashed #303030",
                            borderRadius: 8,
                            textAlign: "center",
                            minHeight: 110,
                            cursor: "pointer",
                          }}
                          styles={{ body: { padding: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" } }}
                        >
                          <PlusOutlined style={{ fontSize: 28, color: "#ffffff45" }} />
                          <Text type="secondary" style={{ marginTop: 4, fontSize: 11 }}>Bay {wc.id}</Text>
                        </Card>
                      )}
                    </Col>
                  ))}
                </Row>
              </Card>
            </Col>
          </Row>

          {/* Available Purchase Orders */}
          {ctrl.pendingOrders.length > 0 && (
            <Card
              title={
                <Space>
                  <ScheduleOutlined style={{ color: "#4096ff" }} />
                  <span style={{ color: "#4096ff" }}>Available Purchase Orders</span>
                </Space>
              }
              style={{ background: "#141414", border: "1px solid #303030", borderRadius: 12 }}
              styles={{ header: { borderBottom: "1px solid #303030", color: "#ffffffd9" } }}
            >
              {ctrl.pendingOrders.map((wo) => {
                const canAccept = ctrl.canAcceptOrder(wo);
                return (
                  <Card
                    key={wo.id}
                    size="small"
                    style={{ background: "#1a1a1a", border: "1px solid #303030", borderRadius: 8, marginBottom: 12 }}
                    styles={{ body: { padding: 12 } }}
                  >
                    <Collapse
                      ghost
                      size="small"
                      expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} style={{ color: "#ffffff73", fontSize: 11 }} />}
                      items={[
                        {
                          key: wo.id,
                          label: (
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                              <Space size="small" style={{ flexWrap: "wrap" }}>
                                <Text strong style={{ color: "#ffffffd9", fontSize: 14 }}>
                                  {wo.id}: {wo.partName}
                                </Text>
                                <Tag color="blue" style={{ margin: 0 }}>{wo.customer}</Tag>
                                <Tag color="orange" style={{ margin: 0 }}>Qty: {wo.quantity}</Tag>
                                <Tag icon={<ClockCircleOutlined />} style={{ margin: 0 }}>Due: {formatDate(wo.dueDay)}</Tag>
                                <Tag color="green" icon={<DollarOutlined />} style={{ margin: 0 }}>${wo.revenue.toLocaleString()}</Tag>
                              </Space>
                              <Button
                                type="primary"
                                size="small"
                                disabled={!canAccept}
                                onClick={(e) => { e.stopPropagation(); ctrl.handleAcceptOrder(wo.id); }}
                              >
                                {canAccept ? "Accept" : "Missing Equipment"}
                              </Button>
                            </div>
                          ),
                          children: (
                            <Table
                              dataSource={wo.operations}
                              columns={opColumns}
                              rowKey="seq"
                              pagination={false}
                              size="small"
                              style={{ background: "transparent" }}
                            />
                          ),
                        },
                      ]}
                    />
                  </Card>
                );
              })}
            </Card>
          )}

          {/* Planning / Gantt */}
          <Card
            title={
              <Space>
                <ScheduleOutlined style={{ color: "#ffc53d" }} />
                <span style={{ color: "#ffc53d" }}>Production Planning</span>
              </Space>
            }
            extra={
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                disabled={!ctrl.hasAccepted}
                onClick={ctrl.handleGreedySchedule}
              >
                Greedy Schedule
              </Button>
            }
            style={{ background: "#141414", border: "1px solid #303030", borderRadius: 12 }}
            styles={{ header: { borderBottom: "1px solid #303030", color: "#ffffffd9" } }}
          >
            {!ctrl.hasAccepted ? (
              <Empty description={<Text type="secondary">Accept a work order to start planning</Text>} />
            ) : (
              <GanttChart
                blocks={ctrl.scheduledBlocks}
                workCenters={ctrl.workCenters}
                workOrders={ctrl.workOrders}
                totalDays={scenario.totalDays}
                onBlockDrag={ctrl.handleBlockDrag}
                highlight={false}
                currentDay={ctrl.currentDay}
                isExecuting={ctrl.isExecuting}
                onExecute={ctrl.handleExecute}
                onPause={ctrl.handlePause}
              />
            )}
          </Card>

          {/* Activity Log */}
          {ctrl.log.length > 0 && (
            <Card
              title={
                <Space>
                  <ClockCircleOutlined style={{ color: "#36cfc9" }} />
                  <span style={{ color: "#36cfc9" }}>Activity Log</span>
                  <Tag>{ctrl.log.length}</Tag>
                </Space>
              }
              style={{ background: "#141414", border: "1px solid #303030", borderRadius: 12 }}
              styles={{ header: { borderBottom: "1px solid #303030", color: "#ffffffd9" }, body: { padding: "12px 16px", maxHeight: 260, overflowY: "auto" } }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {[...ctrl.log].reverse().map((entry, i) => {
                  const colorMap: Record<string, string> = {
                    purchase: "#1668dc",
                    accept: "#13a8a8",
                    complete: "#389e0d",
                    late: "#d89614",
                    expense: "#d46b08",
                    bankrupt: "#a61d24",
                    info: "#ffffff73",
                  };
                  const iconMap: Record<string, string> = {
                    purchase: "🛒",
                    accept: "📋",
                    complete: "✅",
                    late: "⚠️",
                    expense: "💸",
                    bankrupt: "💀",
                    info: "ℹ️",
                  };
                  const sectionColors: Record<string, string> = {
                    "Available Purchase Orders": "#4096ff",
                    "Shop Floor": "#ff7a45",
                    "Committed Work": "#73d13d",
                    "Production Planning": "#ffc53d",
                    "Activity Log": "#36cfc9",
                  };
                  const colorizeMessage = (msg: string) => {
                    const parts: React.ReactNode[] = [];
                    let remaining = msg;
                    let key = 0;
                    while (remaining.length > 0) {
                      const match = remaining.match(/"([^"]+)"/);
                      if (match && match.index !== undefined) {
                        const before = remaining.slice(0, match.index);
                        const quoted = match[1];
                        if (before) parts.push(before);
                        const color = sectionColors[quoted];
                        parts.push(
                          <strong key={key++} style={{ color: color || "#ffffffd9" }}>"{quoted}"</strong>
                        );
                        remaining = remaining.slice(match.index + match[0].length);
                      } else {
                        parts.push(remaining);
                        break;
                      }
                    }
                    return parts;
                  };
                  return (
                    <div key={i} style={{ display: "flex", gap: 8, fontSize: 12, color: colorMap[entry.type] || "#ffffff73" }}>
                      <Text type="secondary" style={{ minWidth: 65, fontSize: 12 }}>
                        Day {entry.day}
                      </Text>
                      <span>{iconMap[entry.type] || "•"}</span>
                      <span style={{ whiteSpace: "pre-wrap" }}>{colorizeMessage(entry.message)}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </Space>
      </Content>

      {/* Game Over Modal */}
      <Modal
        open={ctrl.isBankrupt}
        closable={false}
        footer={[
          <Button key="restart" type="primary" onClick={() => onChangeScenario(scenarioId)}>
            Try Again
          </Button>,
          <Button key="pick" onClick={onBackToMenu}>
            Pick Another Scenario
          </Button>,
        ]}
        width={500}
        className="dark-modal"
      >
        <Result
          status="error"
          title={<span style={{ color: "#ffffffd9" }}>BANKRUPT</span>}
          subTitle={
            <span style={{ color: "#ffffffa6" }}>
              Your cash dropped below $0 on Day {ctrl.currentDay} ({formatDate(ctrl.currentDay)}).
              Monthly expenses and late penalties drained your accounts.
            </span>
          }
        />
      </Modal>

      {/* Buy Work Center Modal */}
      <Modal
        title="Purchase Work Center"
        open={ctrl.showBuyModal !== null}
        onCancel={() => ctrl.setShowBuyModal(null)}
        footer={null}
        width={600}
        className="dark-modal"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {WORK_CENTER_TYPES.map((type) => {
            const alreadyOwned = ctrl.workCenters.some((wc) => wc.type?.key === type.key);
            const needed = ctrl.allRequiredTypes.has(type.key) && !ctrl.installedTypes.has(type.key);
            const canAfford = ctrl.cash >= type.cost;
            return (
              <Card
                key={type.key}
                size="small"
                hoverable={canAfford && !alreadyOwned}
                onClick={() => {
                  if (canAfford && !alreadyOwned && ctrl.showBuyModal !== null) {
                    ctrl.handleBuyWorkCenter(ctrl.showBuyModal, type);
                  }
                }}
                style={{
                  background: alreadyOwned ? "#1a2a1a" : "#1a1a1a",
                  border: needed ? `1px solid ${type.color}` : "1px solid #303030",
                  borderRadius: 8,
                  cursor: canAfford && !alreadyOwned ? "pointer" : "not-allowed",
                  opacity: !canAfford && !alreadyOwned ? 0.5 : 1,
                }}
                styles={{ body: { padding: "12px 16px" } }}
              >
                <Row justify="space-between" align="middle">
                  <Col>
                    <Space>
                      <span style={{ fontSize: 24 }}>{type.icon}</span>
                      <div>
                        <Text strong style={{ color: "#ffffffd9" }}>
                          {type.label}
                        </Text>
                        {needed && (
                          <Tag color="warning" style={{ marginLeft: 8 }}>
                            Needed for order
                          </Tag>
                        )}
                        {alreadyOwned && (
                          <Tag color="success" style={{ marginLeft: 8 }}>
                            Installed
                          </Tag>
                        )}
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {type.description}
                        </Text>
                      </div>
                    </Space>
                  </Col>
                  <Col>
                    <Text strong style={{ color: canAfford ? "#389e0d" : "#a61d24", fontSize: 16 }}>
                      ${type.cost.toLocaleString()}
                    </Text>
                  </Col>
                </Row>
              </Card>
            );
          })}
        </div>
      </Modal>
    </Layout>
  );
}
