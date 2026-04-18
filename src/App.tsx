import React, { useMemo, useRef, useState } from "react";
import { ConfigProvider, theme, Tabs } from "antd";
import ScenarioV2 from "./ScenarioV2";
import {
  Briefcase,
  CalendarDays,
  ChevronRight,
  DollarSign,
  Factory,
  PackageCheck,
  Plus,
  Users,
  Wrench,
  LucideIcon,
} from "lucide-react";

type ScenarioKey = "job_shop" | "laser_house" | "aerospace";
type MachineType = "CNC Mill" | "Laser Cutter" | "Gundrill";
type ChipTone = "slate" | "green" | "amber" | "blue" | "red";

interface QueueItem {
  orderId: string;
  opIndex: number;
}

interface Machine {
  id: string;
  type: MachineType;
  name: string;
  queue: QueueItem[];
}

interface Worker {
  id: string;
  name: string;
  assignedMachineId: string | null;
}

interface Order {
  id: string;
  customer: string;
  name: string;
  ops: string[];
  opIndex: number;
  dueDay: number;
  quote: number;
  latePenaltyPerDay: number;
  status: string;
  acceptedDay: number | null;
  completedDay: number | null;
  finalPayout?: number;
  lateDays?: number;
}

interface GameState {
  scenarioKey: ScenarioKey;
  day: number;
  cash: number;
  reputation: number;
  machines: Machine[];
  workers: Worker[];
  incomingOrders: Order[];
  acceptedOrders: Order[];
  completedOrders: Order[];
  log: string[];
  counters: {
    machine: number;
    worker: number;
    order: number;
  };
}

const MACHINE_CATALOG: Record<MachineType, { cost: number; dailyMaintenance: number; blurb: string }> = {
  "CNC Mill": {
    cost: 95000,
    dailyMaintenance: 900,
    blurb: "Flexible workhorse for most machined parts.",
  },
  "Laser Cutter": {
    cost: 125000,
    dailyMaintenance: 1200,
    blurb: "Fast sheet cutting that unlocks hybrid jobs.",
  },
  Gundrill: {
    cost: 160000,
    dailyMaintenance: 1450,
    blurb: "High-value deep-hole work for aerospace-style parts.",
  },
};

const ORDER_TEMPLATES = [
  {
    name: "Mounting Plate",
    ops: ["Laser Cutter", "CNC Mill"],
    baseQuote: 24000,
    baseDue: 3,
    weights: { job_shop: 4, laser_house: 6, aerospace: 2 },
  },
  {
    name: "Hydraulic Manifold",
    ops: ["CNC Mill", "CNC Mill"],
    baseQuote: 33000,
    baseDue: 4,
    weights: { job_shop: 6, laser_house: 2, aerospace: 4 },
  },
  {
    name: "Fuel Injector Body",
    ops: ["Gundrill", "CNC Mill"],
    baseQuote: 46000,
    baseDue: 4,
    weights: { job_shop: 1, laser_house: 1, aerospace: 7 },
  },
  {
    name: "Sensor Bracket",
    ops: ["Laser Cutter"],
    baseQuote: 14000,
    baseDue: 2,
    weights: { job_shop: 3, laser_house: 7, aerospace: 2 },
  },
  {
    name: "Actuator Housing",
    ops: ["CNC Mill"],
    baseQuote: 18000,
    baseDue: 2,
    weights: { job_shop: 7, laser_house: 2, aerospace: 3 },
  },
  {
    name: "Cryogenic Feed Tube",
    ops: ["Gundrill"],
    baseQuote: 29000,
    baseDue: 3,
    weights: { job_shop: 1, laser_house: 1, aerospace: 6 },
  },
  {
    name: "Engine Test Fixture",
    ops: ["Laser Cutter", "CNC Mill", "CNC Mill"],
    baseQuote: 52000,
    baseDue: 5,
    weights: { job_shop: 2, laser_house: 3, aerospace: 5 },
  },
];

const CUSTOMERS = [
  "Atlas Space",
  "Skyforge Systems",
  "Northstar Defense",
  "Helio Motion",
  "Apex Robotics",
  "Frontier Launch",
  "Beacon Medical",
];

const SCENARIOS = {
  job_shop: {
    label: "Job Shop Rescue",
    description:
      "Start with one CNC and a tiny team. Win by taking the right jobs and avoiding cash crunches.",
    cash: 180000,
    machines: ["CNC Mill"],
    workers: 1,
    reputation: 55,
  },
  laser_house: {
    label: "Laser House Expansion",
    description:
      "Strong sheet-metal pipeline and good cash, but you need machining to capture full-value jobs.",
    cash: 240000,
    machines: ["Laser Cutter"],
    workers: 1,
    reputation: 60,
  },
  aerospace: {
    label: "Aerospace Supplier",
    description:
      "High-margin parts, tighter deadlines, and more complex routings. Quality and sequencing matter.",
    cash: 320000,
    machines: ["CNC Mill", "Gundrill"],
    workers: 2,
    reputation: 65,
  },
};

const DAILY_WAGE = 325;
const STARTING_INCOMING = 4;
const LOG_LIMIT = 14;

function pickWeightedTemplate(scenarioKey: ScenarioKey) {
  const expanded = ORDER_TEMPLATES.flatMap((template) =>
    Array.from({ length: template.weights[scenarioKey] || 1 }, () => template)
  );
  return expanded[Math.floor(Math.random() * expanded.length)];
}

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeOrder(id: string, day: number, scenarioKey: ScenarioKey): Order {
  const template = pickWeightedTemplate(scenarioKey);
  const quote = template.baseQuote + randomBetween(-2500, 6500);
  const dueDay = day + Math.max(2, template.baseDue + randomBetween(-1, 1));
  const penalty = Math.round(quote * 0.12);
  return {
    id,
    customer: CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)],
    name: template.name,
    ops: template.ops,
    opIndex: 0,
    dueDay,
    quote,
    latePenaltyPerDay: penalty,
    status: "incoming",
    acceptedDay: null,
    completedDay: null,
  };
}

function makeMachine(id: string, type: MachineType): Machine {
  return {
    id,
    type,
    name: `${type} #${id.split("-").pop()}`,
    queue: [],
  };
}

function makeWorker(id: string): Worker {
  return {
    id,
    name: `Operator ${id.split("-").pop()}`,
    assignedMachineId: null,
  };
}

function formatMoney(value: number) {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString()}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function buildInitialState(scenarioKey: ScenarioKey): GameState {
  const scenario = SCENARIOS[scenarioKey];
  let machineCounter = 1;
  let workerCounter = 1;
  let orderCounter = 1;

  const machines = (scenario.machines as MachineType[]).map((type) => makeMachine(`machine-${machineCounter++}`, type));
  const workers = Array.from({ length: scenario.workers }, () => makeWorker(`worker-${workerCounter++}`)).map(
    (worker, index) => ({
      ...worker,
      assignedMachineId: machines[index]?.id || null,
    })
  );

  const incomingOrders = Array.from({ length: STARTING_INCOMING }, () =>
    makeOrder(`order-${orderCounter++}`, 1, scenarioKey)
  );

  return {
    scenarioKey,
    day: 1,
    cash: scenario.cash,
    reputation: scenario.reputation,
    machines,
    workers,
    incomingOrders,
    acceptedOrders: [] as Order[],
    completedOrders: [] as Order[],
    log: [
      `Opened ${scenario.label}. Your shop is live with ${machines.length} machine${machines.length > 1 ? "s" : ""}.`,
    ],
    counters: {
      machine: machineCounter,
      worker: workerCounter,
      order: orderCounter,
    },
  };
}

function StatCard({ icon: Icon, label, value, subvalue }: { icon: LucideIcon; label: string; value: string | number; subvalue?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-slate-500">
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-2xl font-semibold text-slate-900">{value}</div>
      {subvalue ? <div className="mt-1 text-sm text-slate-500">{subvalue}</div> : null}
    </div>
  );
}

function Section({ title, subtitle, children, right }: { title: string; subtitle: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function Chip({ children, tone = "slate" }: { children: React.ReactNode; tone?: ChipTone }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
    red: "bg-rose-100 text-rose-700",
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

function OperationFlow({ ops, currentIndex, complete }: { ops: string[]; currentIndex: number; complete?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {ops.map((op, index) => {
        const isDone = index < currentIndex || complete;
        const isCurrent = index === currentIndex && !complete;
        return (
          <React.Fragment key={`${op}-${index}`}>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                isDone
                  ? "bg-emerald-100 text-emerald-700"
                  : isCurrent
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {op}
            </span>
            {index < ops.length - 1 ? <ChevronRight className="h-4 w-4 text-slate-400" /> : null}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function MachineShopV1() {
  const [state, setState] = useState(() => buildInitialState("job_shop"));
  const idRef = useRef(1);

  const nextLocalId = (prefix: string) => `${prefix}-${Date.now()}-${idRef.current++}`;

  const staffedMachineIds = useMemo(
    () => new Set(state.workers.filter((worker) => worker.assignedMachineId).map((worker) => worker.assignedMachineId)),
    [state.workers]
  );

  const unassignedWorkers = state.workers.filter((worker) => !worker.assignedMachineId);

  const completedRevenue = state.completedOrders.reduce((sum, order) => sum + (order.finalPayout || 0), 0);
  const onTimeRate =
    state.completedOrders.length === 0
      ? 100
      : Math.round(
          (state.completedOrders.filter((order) => (order.completedDay || 0) <= order.dueDay).length /
            state.completedOrders.length) *
            100
        );

  const machineUtilization =
    state.machines.length === 0
      ? 0
      : Math.round((state.machines.filter((machine) => machine.queue.length > 0).length / state.machines.length) * 100);

  const resetScenario = (scenarioKey: ScenarioKey) => {
    setState(buildInitialState(scenarioKey));
  };

  const pushLog = (messages: string[]) => {
    setState((current) => ({
      ...current,
      log: [...messages, ...current.log].slice(0, LOG_LIMIT),
    }));
  };

  const acceptOrder = (orderId: string) => {
    setState((current) => {
      const target = current.incomingOrders.find((order) => order.id === orderId);
      if (!target) return current;
      return {
        ...current,
        incomingOrders: current.incomingOrders.filter((order) => order.id !== orderId),
        acceptedOrders: [
          ...current.acceptedOrders,
          {
            ...target,
            status: "accepted",
            acceptedDay: current.day,
          },
        ],
        log: [`Accepted ${target.name} for ${target.customer}.`, ...current.log].slice(0, LOG_LIMIT),
      };
    });
  };

  const rejectOrder = (orderId: string) => {
    setState((current) => {
      const target = current.incomingOrders.find((order) => order.id === orderId);
      if (!target) return current;
      return {
        ...current,
        incomingOrders: current.incomingOrders.filter((order) => order.id !== orderId),
        reputation: clamp(current.reputation - 1, 0, 100),
        log: [`Passed on ${target.name}. Reputation -1 for saying no too often.`, ...current.log].slice(0, LOG_LIMIT),
      };
    });
  };

  const scheduleOrderOnMachine = (orderId: string, machineId: string) => {
    setState((current) => {
      const order = current.acceptedOrders.find((item) => item.id === orderId);
      const machine = current.machines.find((item) => item.id === machineId);
      if (!order || !machine) return current;

      const isAlreadyQueued = current.machines.some((item) =>
        item.queue.some((queued) => queued.orderId === orderId && queued.opIndex === order.opIndex)
      );
      if (isAlreadyQueued) return current;
      if (machine.type !== order.ops[order.opIndex]) return current;

      return {
        ...current,
        machines: current.machines.map((item) =>
          item.id === machineId
            ? {
                ...item,
                queue: [...item.queue, { orderId, opIndex: order.opIndex }],
              }
            : item
        ),
        log: [`Queued ${order.name} on ${machine.name}.`, ...current.log].slice(0, LOG_LIMIT),
      };
    });
  };

  const assignWorker = (machineId: string, workerId: string | null) => {
    setState((current) => ({
      ...current,
      workers: current.workers.map((worker) => {
        if (worker.id === workerId) {
          return { ...worker, assignedMachineId: machineId || null };
        }
        if (worker.assignedMachineId === machineId && worker.id !== workerId) {
          return { ...worker, assignedMachineId: null };
        }
        return worker;
      }),
      log: [
        workerId
          ? `Assigned ${current.workers.find((worker) => worker.id === workerId)?.name || "operator"} to ${
              current.machines.find((machine) => machine.id === machineId)?.name || "machine"
            }.`
          : `Unassigned operator from ${current.machines.find((machine) => machine.id === machineId)?.name || "machine"}.`,
        ...current.log,
      ].slice(0, LOG_LIMIT),
    }));
  };

  const hireWorker = () => {
    setState((current) => {
      const hiringCost = 2500;
      if (current.cash < hiringCost) return current;
      const newWorker = makeWorker(`worker-${current.counters.worker}`);
      return {
        ...current,
        cash: current.cash - hiringCost,
        workers: [...current.workers, newWorker],
        counters: {
          ...current.counters,
          worker: current.counters.worker + 1,
        },
        log: [`Hired ${newWorker.name}. Recruiting cost ${formatMoney(hiringCost)}.`, ...current.log].slice(0, LOG_LIMIT),
      };
    });
  };

  const buyMachine = (type: MachineType) => {
    setState((current) => {
      const spec = MACHINE_CATALOG[type];
      if (!spec || current.cash < spec.cost) return current;
      const newMachine = makeMachine(`machine-${current.counters.machine}`, type);
      return {
        ...current,
        cash: current.cash - spec.cost,
        machines: [...current.machines, newMachine],
        counters: {
          ...current.counters,
          machine: current.counters.machine + 1,
        },
        log: [`Purchased ${newMachine.name} for ${formatMoney(spec.cost)}.`, ...current.log].slice(0, LOG_LIMIT),
      };
    });
  };

  const replenishOrders = (currentState: GameState, nextDay: number) => {
    const deficit = Math.max(0, STARTING_INCOMING - currentState.incomingOrders.length);
    if (deficit === 0) return { incomingOrders: currentState.incomingOrders, orderCounter: currentState.counters.order };

    let orderCounter = currentState.counters.order;
    const freshOrders = Array.from({ length: deficit }, () => {
      const order = makeOrder(`order-${orderCounter}`, nextDay, currentState.scenarioKey);
      orderCounter += 1;
      return order;
    });

    return {
      incomingOrders: [...currentState.incomingOrders, ...freshOrders],
      orderCounter,
    };
  };

  const advanceDay = () => {
    setState((current) => {
      const nextDay = current.day + 1;
      const logs = [];
      const workerCost = current.workers.length * DAILY_WAGE;
      const maintenanceCost = current.machines.reduce(
        (sum, machine) => sum + MACHINE_CATALOG[machine.type].dailyMaintenance,
        0
      );

      const ordersById = new Map(current.acceptedOrders.map((order) => [order.id, { ...order }]));
      const completedToday: Order[] = [];
      let payoutToday = 0;
      let reputationDelta = 0;

      const updatedMachines = current.machines.map((machine) => {
        const staffed = current.workers.some((worker) => worker.assignedMachineId === machine.id);
        const updatedQueue = [...machine.queue];

        if (!staffed || updatedQueue.length === 0) {
          return { ...machine, queue: updatedQueue };
        }

        const job = updatedQueue.shift()!;
        const order = ordersById.get(job.orderId);

        if (!order) {
          logs.push(`${machine.name} found a stale queue item and cleared it.`);
          return { ...machine, queue: updatedQueue };
        }

        if (order.opIndex !== job.opIndex || order.ops[order.opIndex] !== machine.type) {
          logs.push(`${machine.name} skipped an outdated queue item for ${order.name}.`);
          return { ...machine, queue: updatedQueue };
        }

        order.opIndex += 1;

        if (order.opIndex >= order.ops.length) {
          order.completedDay = nextDay;
          order.status = "complete";
          const lateDays = Math.max(0, nextDay - order.dueDay);
          const payout = Math.max(0, order.quote - lateDays * order.latePenaltyPerDay);
          order.finalPayout = payout;
          order.lateDays = lateDays;
          payoutToday += payout;
          reputationDelta += lateDays === 0 ? 2 : -Math.min(8, lateDays * 2);
          completedToday.push(order);
          logs.push(
            `${order.name} shipped ${lateDays === 0 ? "on time" : `${lateDays} day(s) late`} for ${formatMoney(
              payout
            )}.`
          );
        } else {
          logs.push(`${machine.name} completed one operation on ${order.name}.`);
        }

        ordersById.set(order.id, order);
        return { ...machine, queue: updatedQueue };
      });

      const overdueOrders = Array.from(ordersById.values()).filter(
        (order) => order.status === "accepted" && nextDay > order.dueDay
      );
      if (overdueOrders.length > 0) {
        reputationDelta -= overdueOrders.length;
        logs.push(`${overdueOrders.length} active job${overdueOrders.length > 1 ? "s are" : " is"} now overdue.`);
      }

      const nextAcceptedOrders = Array.from(ordersById.values()).filter((order) => order.status === "accepted");
      const nextCompletedOrders = [...completedToday, ...current.completedOrders].slice(0, 50);
      const replenished = replenishOrders(
        {
          ...current,
          incomingOrders: current.incomingOrders,
          counters: current.counters,
        },
        nextDay
      );

      const cashDelta = payoutToday - workerCost - maintenanceCost;
      const nextCash = current.cash + cashDelta;
      const nextReputation = clamp(current.reputation + reputationDelta, 0, 100);

      logs.unshift(
        `Day ${nextDay}: payroll ${formatMoney(workerCost)}, maintenance ${formatMoney(
          maintenanceCost
        )}, net ${formatMoney(cashDelta)}.`
      );

      if (nextCash < 0) {
        logs.unshift("Cash dropped below zero. In a future version this should trigger debt and loan pressure.");
      }

      return {
        ...current,
        day: nextDay,
        cash: nextCash,
        reputation: nextReputation,
        machines: updatedMachines,
        acceptedOrders: nextAcceptedOrders,
        completedOrders: nextCompletedOrders,
        incomingOrders: replenished.incomingOrders,
        counters: {
          ...current.counters,
          order: replenished.orderCounter,
        },
        log: [...logs, ...current.log].slice(0, LOG_LIMIT),
      };
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-6 text-white shadow-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-slate-100">
                <Factory className="h-4 w-4" />
                Machine Shop Prototype
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">Factory flow + business pressure in a browser</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
                This build tests the core loop: accept the right jobs, buy machines, hire operators, queue work in the
                right sequence, and survive daily payroll before you dream about becoming a Boeing or rocket supplier.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {Object.entries(SCENARIOS).map(([key, scenario]) => (
                <button
                  key={key}
                  onClick={() => resetScenario(key as ScenarioKey)}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    state.scenarioKey === key
                      ? "border-white bg-white text-slate-900"
                      : "border-white/20 bg-white/5 text-white hover:bg-white/10"
                  }`}
                >
                  <div className="text-sm font-semibold">{scenario.label}</div>
                  <div className={`mt-1 text-xs ${state.scenarioKey === key ? "text-slate-500" : "text-slate-300"}`}>
                    {scenario.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard icon={CalendarDays} label="Day" value={state.day} subvalue={SCENARIOS[state.scenarioKey].label} />
          <StatCard icon={DollarSign} label="Cash" value={formatMoney(state.cash)} subvalue={`Lifetime revenue ${formatMoney(completedRevenue)}`} />
          <StatCard icon={Users} label="Operators" value={state.workers.length} subvalue={`${unassignedWorkers.length} unassigned`} />
          <StatCard icon={Briefcase} label="Reputation" value={`${state.reputation}/100`} subvalue={`${onTimeRate}% on-time delivery`} />
          <StatCard icon={Wrench} label="Utilization" value={`${machineUtilization}%`} subvalue={`${state.machines.length} active asset${state.machines.length > 1 ? "s" : ""}`} />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={advanceDay}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            <CalendarDays className="h-4 w-4" />
            Advance 1 Day
          </button>
          <button
            onClick={hireWorker}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400"
          >
            <Users className="h-4 w-4" />
            Hire Operator ({formatMoney(2500)})
          </button>
          <div className="inline-flex items-center rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500">
            Next obvious step after feedback: quotes, setup time, tool wear, and QA escapes.
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
          <div className="space-y-6">
            <Section
              title="Incoming quote requests"
              subtitle="Base mechanic #1: choose what work to accept before your shop gets overloaded."
              right={<Chip tone="blue">{state.incomingOrders.length} opportunities</Chip>}
            >
              <div className="grid gap-4 lg:grid-cols-2">
                {state.incomingOrders.map((order) => (
                  <div key={order.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold text-slate-900">{order.name}</div>
                        <div className="mt-1 text-sm text-slate-500">{order.customer}</div>
                      </div>
                      <Chip tone="green">{formatMoney(order.quote)}</Chip>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Chip tone="amber">Due day {order.dueDay}</Chip>
                      <Chip tone="red">Late fee {formatMoney(order.latePenaltyPerDay)}/day</Chip>
                    </div>
                    <div className="mt-3">
                      <OperationFlow ops={order.ops} currentIndex={-1} complete={false} />
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => acceptOrder(order.id)}
                        className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => rejectOrder(order.id)}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400"
                      >
                        Pass
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <Section
              title="Active work orders"
              subtitle="Base mechanic #2: every order has a routing. You decide which machine handles the next operation."
              right={<Chip tone="slate">{state.acceptedOrders.length} live jobs</Chip>}
            >
              {state.acceptedOrders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                  Accept a few jobs, then queue them to machines below. The tension should come from late jobs,
                  staffing gaps, and choosing when to expand.
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {state.acceptedOrders.map((order) => {
                    const currentOp = order.ops[order.opIndex];
                    const compatibleMachines = state.machines.filter((machine) => machine.type === currentOp);
                    const queuedMachine = state.machines.find((machine) =>
                      machine.queue.some((job) => job.orderId === order.id && job.opIndex === order.opIndex)
                    );
                    const isLate = state.day > order.dueDay;

                    return (
                      <div key={order.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-base font-semibold text-slate-900">{order.name}</div>
                            <div className="mt-1 text-sm text-slate-500">{order.customer}</div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Chip tone={isLate ? "red" : "amber"}>Due day {order.dueDay}</Chip>
                            {queuedMachine ? <Chip tone="blue">Queued on {queuedMachine.name}</Chip> : null}
                          </div>
                        </div>

                        <div className="mt-3">
                          <OperationFlow ops={order.ops} currentIndex={order.opIndex} />
                        </div>

                        <div className="mt-3 text-sm text-slate-600">
                          Next operation: <span className="font-semibold text-slate-900">{currentOp}</span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {compatibleMachines.map((machine) => {
                            const staffed = staffedMachineIds.has(machine.id);
                            const disabled = Boolean(queuedMachine) || !staffed;
                            return (
                              <button
                                key={machine.id}
                                onClick={() => scheduleOrderOnMachine(order.id, machine.id)}
                                disabled={disabled}
                                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                                  disabled
                                    ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                                    : "border border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                                }`}
                              >
                                Queue on {machine.name} {!staffed ? "(needs operator)" : ""}
                              </button>
                            );
                          })}
                          {compatibleMachines.length === 0 ? (
                            <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                              You need to buy a {currentOp} to run this job.
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>

            <Section
              title="Shop floor"
              subtitle="Base mechanic #3: a machine only works if it has both a queue and an assigned operator."
              right={<Chip tone="green">{state.machines.filter((machine) => staffedMachineIds.has(machine.id)).length} staffed</Chip>}
            >
              <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {state.machines.map((machine) => {
                  const assignedWorker = state.workers.find((worker) => worker.assignedMachineId === machine.id);
                  const availableWorkers = state.workers.filter(
                    (worker) => !worker.assignedMachineId || worker.assignedMachineId === machine.id
                  );
                  return (
                    <div key={machine.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-base font-semibold text-slate-900">{machine.name}</div>
                          <div className="mt-1 text-sm text-slate-500">{MACHINE_CATALOG[machine.type].blurb}</div>
                        </div>
                        <Chip tone={assignedWorker ? "green" : "red"}>{assignedWorker ? "Staffed" : "Idle"}</Chip>
                      </div>

                      <div className="mt-4 text-sm text-slate-600">
                        Maintenance: {formatMoney(MACHINE_CATALOG[machine.type].dailyMaintenance)}/day
                      </div>

                      <div className="mt-4 space-y-2">
                        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Assigned operator</label>
                        <select
                          value={assignedWorker?.id || ""}
                          onChange={(event) => assignWorker(machine.id, event.target.value || null)}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-500"
                        >
                          <option value="">No operator</option>
                          {availableWorkers.map((worker) => (
                            <option key={worker.id} value={worker.id}>
                              {worker.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="mt-4">
                        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Queue</div>
                        <div className="space-y-2">
                          {machine.queue.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500">
                              No jobs queued.
                            </div>
                          ) : (
                            machine.queue.map((job, index) => {
                              const order = state.acceptedOrders.find((item) => item.id === job.orderId);
                              if (!order) return null;
                              return (
                                <div key={`${job.orderId}-${index}`} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
                                  <div className="font-medium text-slate-800">{order.name}</div>
                                  <div className="mt-1 text-slate-500">
                                    Operation {job.opIndex + 1} of {order.ops.length}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          </div>

          <div className="space-y-6">
            <Section
              title="Growth actions"
              subtitle="Buy capacity when bottlenecks are hurting more than the cash burn."
            >
              <div className="space-y-3">
                {(Object.entries(MACHINE_CATALOG) as [MachineType, { cost: number; dailyMaintenance: number; blurb: string }][]).map(([type, spec]) => (
                  <div key={type} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold text-slate-900">{type}</div>
                        <div className="mt-1 text-sm text-slate-500">{spec.blurb}</div>
                      </div>
                      <Chip tone="blue">{formatMoney(spec.cost)}</Chip>
                    </div>
                    <div className="mt-3 text-sm text-slate-600">
                      Maintenance: {formatMoney(spec.dailyMaintenance)}/day
                    </div>
                    <button
                      onClick={() => buyMachine(type)}
                      disabled={state.cash < spec.cost}
                      className={`mt-4 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                        state.cash < spec.cost
                          ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                          : "border border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                      }`}
                    >
                      <Plus className="h-4 w-4" />
                      Buy {type}
                    </button>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Completed jobs" subtitle="The payoff loop: did your plan convert into cash and delivery performance?">
              <div className="space-y-3">
                {state.completedOrders.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                    Nothing shipped yet. Queue jobs and advance a few days to see the system breathe.
                  </div>
                ) : (
                  state.completedOrders.slice(0, 6).map((order) => (
                    <div key={order.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-base font-semibold text-slate-900">{order.name}</div>
                          <div className="mt-1 text-sm text-slate-500">{order.customer}</div>
                        </div>
                        <Chip tone={(order.lateDays ?? 0) > 0 ? "red" : "green"}>
                          {(order.lateDays ?? 0) > 0 ? `${order.lateDays} day(s) late` : "On time"}
                        </Chip>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Chip tone="green">Paid {formatMoney(order.finalPayout || 0)}</Chip>
                        <Chip tone="slate">Completed day {order.completedDay}</Chip>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Section>

            <Section title="Event log" subtitle="Use this panel during playtests to see whether players understand the consequences of their choices.">
              <div className="space-y-2">
                {state.log.map((entry, index) => (
                  <div key={`${entry}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                    {entry}
                  </div>
                ))}
              </div>
            </Section>

            <Section title="What this prototype is testing" subtitle="A tight scope for quick GitHub deployment and fast feedback.">
              <div className="space-y-3 text-sm leading-6 text-slate-600">
                <p>
                  <span className="font-semibold text-slate-900">What should feel good:</span> buying the right machine,
                  spotting a bottleneck, and turning late jobs into clean flow.
                </p>
                <p>
                  <span className="font-semibold text-slate-900">What should feel stressful:</span> payroll, idle assets,
                  understaffed equipment, and accepting work you cannot route.
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Next likely iteration:</span> quoting strategy, setup time,
                  part batching, skill levels, maintenance failures, and customer relationships.
                </p>
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorBgContainer: "#141414",
          borderRadius: 8,
        },
      }}
    >
      <div style={{ background: "#0a0a0a", minHeight: "100vh" }}>
        <Tabs
          defaultActiveKey="v2"
          centered
          size="large"
          style={{ padding: "12px 24px 0" }}
          items={[
            {
              key: "v2",
              label: "🏭 Scenario Mode",
              children: <ScenarioV2 />,
            },
            {
              key: "v1",
              label: "⚙️ Sandbox (V1)",
              children: <MachineShopV1 />,
            },
          ]}
        />
      </div>
    </ConfigProvider>
  );
}
