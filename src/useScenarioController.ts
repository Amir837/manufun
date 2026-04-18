import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  Scenario,
  WorkCenter,
  WorkCenterType,
  WorkOrder,
  ScheduledBlock,
  LogEntry,
  BLOCK_COLORS,
  daysToCover,
  formatDate,
} from "./scenarios";

export function useScenarioController(scenario: Scenario) {
  const [cash, setCash] = useState(scenario.initialCash);
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>(
    Array.from({ length: 6 }, (_, i) => ({ id: i + 1, type: null }))
  );
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(
    () => scenario.workOrders.map((wo) => ({ ...wo }))
  );
  const [scheduledBlocks, setScheduledBlocks] = useState<ScheduledBlock[]>([]);
  const [showBuyModal, setShowBuyModal] = useState<number | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [currentDay, setCurrentDay] = useState(0);
  const [isExecuting, setIsExecuting] = useState(false);
  const [earnedRevenue, setEarnedRevenue] = useState(0);
  const [completedOrderIds, setCompletedOrderIds] = useState<Set<string>>(new Set());
  const [log, setLog] = useState<LogEntry[]>([
    { day: 0, type: "info", message: '📦 Review POs at "Available Purchase Orders"\n🛒 Buy equipment at "Shop Floor"\n✅ Accept orders → "Committed Work"\n📅 Schedule & optimize at "Production Planning"\n▶️ Hit Execute and watch your shop run\n💰 Get paid — don\'t go bankrupt!' },
  ]);
  const [isBankrupt, setIsBankrupt] = useState(false);
  const [lastMonthCharged, setLastMonthCharged] = useState(0);
  const executionTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const addLog = useCallback((entry: Omit<LogEntry, "day">, day?: number) => {
    setLog((prev) => [...prev, { ...entry, day: day ?? 0 } as LogEntry]);
  }, []);

  // Last day of all scheduled blocks
  const maxScheduledDay = useMemo(() => {
    if (scheduledBlocks.length === 0) return 0;
    return Math.max(...scheduledBlocks.map((b) => b.startDay + b.durationDays));
  }, [scheduledBlocks]);

  // Execution: advance red line day by day (500ms per day)
  useEffect(() => {
    if (isExecuting && !isBankrupt) {
      executionTimer.current = setInterval(() => {
        setCurrentDay((d) => {
          const next = d + 1;
          if (next >= scenario.totalDays) {
            setIsExecuting(false);
            return scenario.totalDays;
          }
          return next;
        });
      }, 500);
      return () => {
        if (executionTimer.current) clearInterval(executionTimer.current);
      };
    }
  }, [isExecuting, isBankrupt, scenario.totalDays]);

  // Monthly expense charge
  useEffect(() => {
    if (currentDay === 0 || isBankrupt) return;
    const currentMonth = Math.floor(currentDay / 30);
    if (currentMonth > lastMonthCharged) {
      setLastMonthCharged(currentMonth);
      const amount = scenario.monthlyExpense;
      setCash((c) => {
        const next = c - amount;
        return next;
      });
      setLog((prev) => [
        ...prev,
        {
          day: currentDay,
          type: "expense" as const,
          message: `Monthly rent & salaries: -$${amount.toLocaleString()}`,
        },
      ]);
    }
  }, [currentDay, lastMonthCharged, scenario.monthlyExpense, isBankrupt]);

  // Detect completed work orders + late penalty during execution
  useEffect(() => {
    if (currentDay === 0 || scheduledBlocks.length === 0 || isBankrupt) return;
    workOrders
      .filter((wo) => wo.accepted && !completedOrderIds.has(wo.id))
      .forEach((wo) => {
        const woBlocks = scheduledBlocks.filter((b) => b.workOrderId === wo.id);
        if (woBlocks.length === 0) return;
        const lastEnd = Math.max(...woBlocks.map((b) => b.startDay + b.durationDays));
        if (currentDay >= lastEnd) {
          setCompletedOrderIds((prev) => {
            const next = new Set(prev);
            next.add(wo.id);
            return next;
          });

          const isLate = lastEnd > wo.dueDay;
          const payout = isLate ? Math.floor(wo.revenue * 0.5) : wo.revenue;

          setCash((c) => c + payout);
          setEarnedRevenue((r) => r + payout);

          if (isLate) {
            setLog((prev) => [
              ...prev,
              {
                day: currentDay,
                type: "late" as const,
                message: `${wo.id} delivered LATE (due ${formatDate(wo.dueDay)}) — 50% penalty: +$${payout.toLocaleString()} instead of $${wo.revenue.toLocaleString()}`,
              },
            ]);
          } else {
            setLog((prev) => [
              ...prev,
              {
                day: currentDay,
                type: "complete" as const,
                message: `${wo.id} delivered on time — +$${payout.toLocaleString()}`,
              },
            ]);
          }
        }
      });
  }, [currentDay, scheduledBlocks, workOrders, completedOrderIds, isBankrupt]);

  // Bankruptcy detection
  useEffect(() => {
    if (cash < 0 && !isBankrupt) {
      setIsBankrupt(true);
      setIsExecuting(false);
      if (executionTimer.current) clearInterval(executionTimer.current);
      setLog((prev) => [
        ...prev,
        {
          day: currentDay,
          type: "bankrupt" as const,
          message: `BANKRUPT! Cash dropped to $${cash.toLocaleString()}. Game over.`,
        },
      ]);
    }
  }, [cash, isBankrupt, currentDay]);

  // Stop execution when all scheduled work is done
  useEffect(() => {
    if (
      isExecuting &&
      !isBankrupt &&
      currentDay > 0 &&
      maxScheduledDay > 0 &&
      currentDay >= maxScheduledDay
    ) {
      const accepted = workOrders.filter((wo) => wo.accepted);
      const allDone = accepted.length > 0 && accepted.every((wo) => completedOrderIds.has(wo.id));
      if (allDone) {
        setIsExecuting(false);
        if (executionTimer.current) clearInterval(executionTimer.current);
      }
    }
  }, [isExecuting, isBankrupt, currentDay, maxScheduledDay, workOrders, completedOrderIds]);

  const handleExecute = () => {
    if (isBankrupt) return;
    if (currentDay === 0) setCurrentDay(0);
    setIsExecuting(true);
  };

  const handlePause = () => {
    setIsExecuting(false);
    if (executionTimer.current) clearInterval(executionTimer.current);
  };

  const installedTypes = useMemo(
    () => new Set(workCenters.filter((wc) => wc.type).map((wc) => wc.type!.key)),
    [workCenters]
  );

  const canAcceptOrder = useCallback(
    (wo: WorkOrder) => wo.operations.every((op) => installedTypes.has(op.workCenterType)),
    [installedTypes]
  );

  const allRequiredTypes = useMemo(
    () => new Set(workOrders.flatMap((wo) => wo.operations.map((op) => op.workCenterType))),
    [workOrders]
  );

  const handleBuyWorkCenter = (slotId: number, type: WorkCenterType) => {
    if (cash < type.cost) return;
    setCash((c) => c - type.cost);
    setWorkCenters((prev) =>
      prev.map((wc) => (wc.id === slotId ? { ...wc, type } : wc))
    );
    setShowBuyModal(null);
    setLog((prev) => [
      ...prev,
      { day: currentDay, type: "purchase" as const, message: `Purchased ${type.label} for Bay ${slotId} — -$${type.cost.toLocaleString()}` },
    ]);
  };

  const handleAcceptOrder = (orderId: string) => {
    setWorkOrders((prev) =>
      prev.map((wo) => (wo.id === orderId ? { ...wo, accepted: true } : wo))
    );
    const wo = workOrders.find((w) => w.id === orderId);
    if (wo) {
      setLog((prev) => [
        ...prev,
        { day: currentDay, type: "accept" as const, message: `Accepted ${wo.id}: ${wo.partName} for ${wo.customer} — due ${formatDate(wo.dueDay)}` },
      ]);
    }
  };

  const handleGreedySchedule = () => {
    const accepted = workOrders.filter((wo) => wo.accepted);
    if (accepted.length === 0) return;

    const newBlocks: ScheduledBlock[] = [];
    const centerFreeAt: Record<number, number> = {};
    workCenters.forEach((wc) => {
      if (wc.type) centerFreeAt[wc.id] = 0;
    });

    const orderOpReady: Record<string, number> = {};

    accepted.forEach((wo, woIdx) => {
      orderOpReady[wo.id] = 0;

      wo.operations.forEach((op) => {
        const candidates = workCenters.filter((wc) => wc.type?.key === op.workCenterType);
        if (candidates.length === 0) return;

        const best = candidates.reduce((a, b) =>
          (centerFreeAt[a.id] || 0) < (centerFreeAt[b.id] || 0) ? a : b
        );

        const duration = daysToCover(op.estimatedHours);
        const earliest = Math.max(centerFreeAt[best.id] || 0, orderOpReady[wo.id] || 0);

        newBlocks.push({
          id: `${wo.id}-op${op.seq}`,
          workOrderId: wo.id,
          operationSeq: op.seq,
          workCenterId: best.id,
          startDay: earliest,
          durationDays: duration,
          color: BLOCK_COLORS[woIdx % BLOCK_COLORS.length],
        });

        centerFreeAt[best.id] = earliest + duration;
        orderOpReady[wo.id] = earliest + duration;
      });
    });

    setScheduledBlocks(newBlocks);
    setCurrentDay(0);
    setIsExecuting(false);
    setEarnedRevenue(0);
    setCompletedOrderIds(new Set());
    setLastMonthCharged(0);
    setLog((prev) => [
      ...prev,
      { day: 0, type: "info" as const, message: "Greedy schedule generated — review before executing" },
    ]);
  };

  const handleBlockDrag = useCallback(
    (blockId: string, newStart: number) => {
      setScheduledBlocks((prev) => {
        const block = prev.find((b) => b.id === blockId);
        if (!block) return prev;

        // Respect operation order: can't start before previous op finishes
        const woBlocks = prev
          .filter((b) => b.workOrderId === block.workOrderId)
          .sort((a, b) => a.operationSeq - b.operationSeq);
        const idx = woBlocks.findIndex((b) => b.id === blockId);
        const prevBlock = idx > 0 ? woBlocks[idx - 1] : null;
        const minStart = prevBlock ? prevBlock.startDay + prevBlock.durationDays : 0;

        const clamped = Math.max(minStart, Math.min(newStart, scenario.totalDays - block.durationDays));

        // Build mutable copy with the dragged block at its new position
        const blocks = prev.map((b) =>
          b.id === blockId ? { ...b, startDay: clamped } : { ...b }
        );

        // Push-right cascade: resolve all overlaps iteratively
        const MAX_ITER = 100;
        for (let iter = 0; iter < MAX_ITER; iter++) {
          let changed = false;

          // 1. Fix work-center overlaps: push later blocks right
          type MBlock = typeof blocks[number];
          const byWc = new Map<number, MBlock[]>();
          for (const b of blocks) {
            if (!byWc.has(b.workCenterId)) byWc.set(b.workCenterId, []);
            byWc.get(b.workCenterId)!.push(b);
          }
          for (const wcBlocks of Array.from(byWc.values())) {
            // Dragged block wins ties — it keeps its position, others get pushed
            wcBlocks.sort((a: MBlock, b: MBlock) =>
              a.startDay !== b.startDay
                ? a.startDay - b.startDay
                : (a.id === blockId ? -1 : b.id === blockId ? 1 : 0)
            );
            for (let i = 1; i < wcBlocks.length; i++) {
              const prevEnd = wcBlocks[i - 1].startDay + wcBlocks[i - 1].durationDays;
              if (wcBlocks[i].startDay < prevEnd) {
                wcBlocks[i].startDay = prevEnd;
                changed = true;
              }
            }
          }

          // 2. Fix operation-order constraints: later ops must start after earlier ops finish
          const byWo = new Map<string, MBlock[]>();
          for (const b of blocks) {
            if (!byWo.has(b.workOrderId)) byWo.set(b.workOrderId, []);
            byWo.get(b.workOrderId)!.push(b);
          }
          for (const wBlocks of Array.from(byWo.values())) {
            wBlocks.sort((a: MBlock, b: MBlock) => a.operationSeq - b.operationSeq);
            for (let i = 1; i < wBlocks.length; i++) {
              const prevEnd = wBlocks[i - 1].startDay + wBlocks[i - 1].durationDays;
              if (wBlocks[i].startDay < prevEnd) {
                wBlocks[i].startDay = prevEnd;
                changed = true;
              }
            }
          }

          if (!changed) break;
        }

        return blocks;
      });
    },
    [scenario.totalDays]
  );

  const handleDismissMessage = () => {
    setShowIntro(false);
  };

  const activeWorkCenterIds = useMemo(() => {
    if (!isExecuting || currentDay === 0) return new Set<number>();
    return new Set(
      scheduledBlocks
        .filter((b) => b.startDay <= currentDay && b.startDay + b.durationDays > currentDay)
        .map((b) => b.workCenterId)
    );
  }, [isExecuting, currentDay, scheduledBlocks]);

  const acceptedOrders = workOrders.filter((wo) => wo.accepted);
  const pendingOrders = workOrders.filter((wo) => !wo.accepted);
  const hasAccepted = acceptedOrders.length > 0;

  return {
    cash,
    workCenters,
    workOrders,
    scheduledBlocks,
    currentDay,
    isExecuting,
    earnedRevenue,
    completedOrderIds,
    showBuyModal,
    showIntro,
    activeWorkCenterIds,
    acceptedOrders,
    pendingOrders,
    hasAccepted,
    installedTypes,
    allRequiredTypes,
    log,
    isBankrupt,
    canAcceptOrder,
    handleBuyWorkCenter,
    handleAcceptOrder,
    handleGreedySchedule,
    handleBlockDrag,
    handleExecute,
    handlePause,
    handleDismissMessage,
    setShowBuyModal,
  };
}
