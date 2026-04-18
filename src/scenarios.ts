/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface WorkCenterType {
  key: string;
  label: string;
  icon: string;
  cost: number;
  description: string;
  color: string;
}

export interface WorkCenter {
  id: number;
  type: WorkCenterType | null;
}

export interface Operation {
  seq: number;
  description: string;
  workCenterType: string;
  estimatedHours: number;
}

export interface WorkOrder {
  id: string;
  partName: string;
  customer: string;
  quantity: number;
  operations: Operation[];
  dueDay: number;
  revenue: number;
  accepted: boolean;
}

export interface ScheduledBlock {
  id: string;
  workOrderId: string;
  operationSeq: number;
  workCenterId: number;
  startDay: number;
  durationDays: number;
  color: string;
}

export interface LogEntry {
  day: number;
  type: "purchase" | "accept" | "complete" | "late" | "expense" | "bankrupt" | "info";
  message: string;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard";
  initialCash: number;
  totalDays: number;
  monthlyExpense: number;
  workOrders: WorkOrder[];
  introTitle: string;
  introParagraphs: string[];
  introSteps: string[];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

export const WORK_CENTER_TYPES: WorkCenterType[] = [
  { key: "cnc_mill", label: "CNC Mill", icon: "🏭", cost: 95000, description: "3-axis vertical mill for general machining", color: "#1668dc" },
  { key: "cnc_lathe", label: "CNC Lathe", icon: "🔩", cost: 85000, description: "Turning center for cylindrical parts", color: "#1677ff" },
  { key: "laser", label: "Laser Cutter", icon: "⚡", cost: 125000, description: "Fiber laser for sheet cutting", color: "#d89614" },
  { key: "gundrill", label: "Gundrill", icon: "🔧", cost: 160000, description: "Deep-hole drilling for aerospace parts", color: "#642ab5" },
  { key: "assembly", label: "Assembly Station", icon: "🔨", cost: 25000, description: "Manual assembly and fitting", color: "#13a8a8" },
  { key: "deburr", label: "Deburr / Finish", icon: "✨", cost: 18000, description: "Deburring, polishing, surface finish", color: "#d46b08" },
  { key: "inspect", label: "Inspection", icon: "🔍", cost: 45000, description: "CMM and quality inspection station", color: "#389e0d" },
];

export const BLOCK_COLORS = ["#4096ff", "#ff7a45", "#73d13d", "#ffc53d", "#9254de", "#36cfc9"];

export const START_DATE = new Date(2026, 0, 1);

export function dayToDate(dayOffset: number): Date {
  const d = new Date(START_DATE);
  d.setDate(d.getDate() + dayOffset);
  return d;
}

export function formatDate(dayOffset: number): string {
  const d = dayToDate(dayOffset);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function dayToWeekLabel(dayOffset: number): string {
  return formatDate(dayOffset);
}

export function daysToCover(hours: number): number {
  return Math.max(1, Math.ceil(hours / 8));
}

/* ------------------------------------------------------------------ */
/*  Scenarios                                                          */
/* ------------------------------------------------------------------ */

export const SCENARIOS: Scenario[] = [
  {
    id: "first-contract",
    name: "The First Contract",
    description: "A single high-value order — learn the ropes of shop management.",
    difficulty: "Easy",
    initialCash: 400000,
    totalDays: 90,
    monthlyExpense: 12000,
    workOrders: [
      {
        id: "WO-1001",
        partName: "Hydraulic Manifold Block",
        customer: "Orion Dynamics",
        quantity: 54,
        dueDay: 70,
        revenue: 86000,
        accepted: false,
        operations: [
          { seq: 10, description: "Rough Mill Block Faces", workCenterType: "cnc_mill", estimatedHours: 48 },
          { seq: 20, description: "Turn Bore & Ports", workCenterType: "cnc_lathe", estimatedHours: 36 },
          { seq: 30, description: "Assemble Bushings", workCenterType: "assembly", estimatedHours: 16 },
          { seq: 40, description: "Finish Machine Installed Bushings", workCenterType: "cnc_mill", estimatedHours: 24 },
          { seq: 50, description: "Deburr Machined Bushings", workCenterType: "deburr", estimatedHours: 12 },
          { seq: 60, description: "Final Outgoing Inspection", workCenterType: "inspect", estimatedHours: 8 },
        ],
      },
    ],
    introTitle: "Welcome, Entrepreneur!",
    introParagraphs: [
      "You've just signed the lease on a small manufacturing space — 6 empty bays waiting to become work centers. You've got $400,000 in startup capital. Rent and salaries cost $12,000/month.",
      "Your first potential customer, Orion Dynamics, has sent a purchase order: 54 Hydraulic Manifold Blocks. The routing needs milling, turning, assembly, deburring, and inspection. Deliver late and you only get 50% of the revenue.",
    ],
    introSteps: [
      "Click + on empty bays to invest in work centers",
      "Accept the purchase order once you have the right equipment",
      "Plan production on the Gantt chart — drag blocks or use Greedy Schedule",
    ],
  },
  {
    id: "job-shop-hustle",
    name: "Job Shop Hustle",
    description: "Three customers, tight deadlines, thin margins — one late order can sink you.",
    difficulty: "Medium",
    initialCash: 400000,
    totalDays: 90,
    monthlyExpense: 30000,
    workOrders: [
      {
        id: "WO-2001",
        partName: "Titanium Bracket Set",
        customer: "Pinnacle Robotics",
        quantity: 120,
        dueDay: 25,
        revenue: 32000,
        accepted: false,
        operations: [
          { seq: 10, description: "Laser Cut Blanks", workCenterType: "laser", estimatedHours: 40 },
          { seq: 20, description: "Mill Mounting Features", workCenterType: "cnc_mill", estimatedHours: 96 },
          { seq: 30, description: "Deburr Edges", workCenterType: "deburr", estimatedHours: 16 },
          { seq: 40, description: "Dimensional Inspection", workCenterType: "inspect", estimatedHours: 12 },
        ],
      },
      {
        id: "WO-2002",
        partName: "Precision Gear Housing",
        customer: "Vortex Motors",
        quantity: 36,
        dueDay: 34,
        revenue: 44000,
        accepted: false,
        operations: [
          { seq: 10, description: "Mill Housing Cavity", workCenterType: "cnc_mill", estimatedHours: 80 },
          { seq: 20, description: "Turn Bearing Seats", workCenterType: "cnc_lathe", estimatedHours: 56 },
          { seq: 30, description: "Press-Fit Bearings", workCenterType: "assembly", estimatedHours: 20 },
          { seq: 40, description: "Final QC Inspection", workCenterType: "inspect", estimatedHours: 16 },
        ],
      },
      {
        id: "WO-2003",
        partName: "Coolant Distribution Plate",
        customer: "Ember Thermal",
        quantity: 80,
        dueDay: 50,
        revenue: 26000,
        accepted: false,
        operations: [
          { seq: 10, description: "Laser Cut Plate Profile", workCenterType: "laser", estimatedHours: 32 },
          { seq: 20, description: "Mill Channel Grooves", workCenterType: "cnc_mill", estimatedHours: 64 },
          { seq: 30, description: "Deburr Channels", workCenterType: "deburr", estimatedHours: 20 },
          { seq: 40, description: "Leak Test & Inspect", workCenterType: "inspect", estimatedHours: 12 },
        ],
      },
    ],
    introTitle: "The Hustle Begins!",
    introParagraphs: [
      "You've opened your doors with $400,000 and 6 empty bays. Three customers are waiting — but buying all the equipment eats almost everything, and rent + salaries run $30,000/month.",
      "The CNC mill is your bottleneck — every single order needs it. Pinnacle Robotics wants brackets by Day 25, Vortex Motors needs gear housings by Day 34, Ember Thermal needs coolant plates by Day 50. Late deliveries pay only 50%.",
    ],
    introSteps: [
      "The mill is shared across all orders — scheduling order matters hugely",
      "Greedy scheduling processes orders top-to-bottom, which may not be optimal",
      "Consider which orders to accept, or manually reorder the Gantt to prioritize urgent work",
    ],
  },
  {
    id: "deep-hole-challenge",
    name: "Deep Hole Challenge",
    description: "Expensive equipment, crushing deadlines — one mistake and you're done.",
    difficulty: "Hard",
    initialCash: 435000,
    totalDays: 90,
    monthlyExpense: 25000,
    workOrders: [
      {
        id: "WO-3001",
        partName: "Fuel Injector Body",
        customer: "Apex Propulsion",
        quantity: 200,
        dueDay: 28,
        revenue: 110000,
        accepted: false,
        operations: [
          { seq: 10, description: "Turn Outer Profile", workCenterType: "cnc_lathe", estimatedHours: 64 },
          { seq: 20, description: "Gundrill Fuel Passages", workCenterType: "gundrill", estimatedHours: 112 },
          { seq: 30, description: "Mill Mounting Flange", workCenterType: "cnc_mill", estimatedHours: 32 },
          { seq: 40, description: "Deburr Internal Passages", workCenterType: "deburr", estimatedHours: 24 },
          { seq: 50, description: "Pressure Test & Inspect", workCenterType: "inspect", estimatedHours: 16 },
        ],
      },
      {
        id: "WO-3002",
        partName: "Hydraulic Valve Spool",
        customer: "Ironclad Heavy Industries",
        quantity: 80,
        dueDay: 32,
        revenue: 68000,
        accepted: false,
        operations: [
          { seq: 10, description: "Turn Spool Lands", workCenterType: "cnc_lathe", estimatedHours: 40 },
          { seq: 20, description: "Gundrill Cross Ports", workCenterType: "gundrill", estimatedHours: 72 },
          { seq: 30, description: "Assemble Seals & Springs", workCenterType: "assembly", estimatedHours: 16 },
          { seq: 40, description: "Function Test & Inspect", workCenterType: "inspect", estimatedHours: 12 },
        ],
      },
    ],
    introTitle: "High Stakes Manufacturing",
    introParagraphs: [
      "You've secured $435,000 for a specialty deep-hole drilling shop. Two aerospace clients are waiting — but gundrilling equipment alone costs $160,000 and monthly overhead is $25,000.",
      "Apex Propulsion needs 200 Fuel Injector Bodies by Day 28 — the gundrill alone needs 14 days. Ironclad Heavy Industries wants 80 Hydraulic Valve Spools by Day 32. Both orders fight for the same gundrill. Late deliveries pay only 50%.",
    ],
    introSteps: [
      "After buying equipment you'll have almost no cash — revenue must arrive before rent day",
      "Greedy scheduling processes WO-3001 first, but WO-3002 is faster and pays sooner",
      "Manually drag WO-3002 to the gundrill first to get revenue before the Day 30 rent hits",
    ],
  },
];
