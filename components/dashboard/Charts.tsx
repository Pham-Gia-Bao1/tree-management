// 'use client';

// import { Card } from 'antd';
// import { PIE_DATA, BAR_DATA, LINE_DATA } from '@/lib/trainingDemoData';
// import { useMemo } from 'react';

// // ── Pie Chart ────────────────────────────────────────────────────────────────
// export function PieChartCard() {
//     const total = PIE_DATA.reduce((s, d) => s + d.count, 0);
//     const SIZE = 180;
//     const CX = SIZE / 2;
//     const CY = SIZE / 2;
//     const R = 70;
//     const IR = 42;

//     const slices = useMemo(() => {
//         let start = -Math.PI / 2;
//         return PIE_DATA.map(d => {
//             const angle = (d.count / total) * 2 * Math.PI;
//             const end = start + angle;
//             const x1 = CX + R * Math.cos(start);
//             const y1 = CY + R * Math.sin(start);
//             const x2 = CX + R * Math.cos(end);
//             const y2 = CY + R * Math.sin(end);
//             const ix1 = CX + IR * Math.cos(start);
//             const iy1 = CY + IR * Math.sin(start);
//             const ix2 = CX + IR * Math.cos(end);
//             const iy2 = CY + IR * Math.sin(end);
//             const large = angle > Math.PI ? 1 : 0;
//             const path = `M ${ix1} ${iy1} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${IR} ${IR} 0 ${large} 0 ${ix1} ${iy1} Z`;
//             const slice = { path, color: d.color, subject: d.subject, count: d.count, percent: Math.round(d.count / total * 100) };
//             start = end;
//             return slice;
//         });
//     }, [CX, CY, R, IR, PIE_DATA, total]);

//     return (
//         <Card
//             title="Training Distribution By Subject"
//             style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.06)', border: 'none', height: '100%' }}
//         >
//             <div className="flex flex-col sm:flex-row items-center gap-4">
//                 <svg width={SIZE} height={SIZE} className="flex-shrink-0">
//                     {slices.map((s, i) => (
//                         <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth={2}>
//                             <title>{s.subject}: {s.count}</title>
//                         </path>
//                     ))}
//                     <text x={CX} y={CY - 6} textAnchor="middle" fontSize={12} fill="#8C8C8C">Total</text>
//                     <text x={CX} y={CY + 10} textAnchor="middle" fontSize={16} fontWeight="700" fill="#1F1F1F">{total.toLocaleString()}</text>
//                 </svg>
//                 <div className="flex flex-col gap-2 w-full">
//                     {PIE_DATA.map((d, i) => (
//                         <div key={i} className="flex items-center justify-between text-sm">
//                             <div className="flex items-center gap-2">
//                                 <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: d.color }} />
//                                 <span className="text-gray-600 truncate max-w-[140px]">{d.subject}</span>
//                             </div>
//                             <span className="font-semibold text-gray-800">{Math.round(d.count / total * 100)}%</span>
//                         </div>
//                     ))}
//                 </div>
//             </div>
//         </Card>
//     );
// }

// // ── Bar Chart ─────────────────────────────────────────────────────────────────
// export function BarChartCard() {
//     const max = Math.max(...BAR_DATA.map(d => d.count));
//     const W = 320;
//     const H = 160;
//     const PAD = { top: 16, right: 16, bottom: 32, left: 40 };
//     const plotW = W - PAD.left - PAD.right;
//     const plotH = H - PAD.top - PAD.bottom;
//     const barW = plotW / BAR_DATA.length;
//     const TICKS = [0, 200, 400, 600, 800, 1000];

//     return (
//         <Card
//             title="Participation By Branch"
//             style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.06)', border: 'none', height: '100%' }}
//         >
//             <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
//                 {TICKS.map(t => {
//                     const y = PAD.top + plotH - (t / max) * plotH;
//                     return (
//                         <g key={t}>
//                             <line x1={PAD.left} x2={PAD.left + plotW} y1={y} y2={y} stroke="#F0F0F0" />
//                             <text x={PAD.left - 6} y={y + 4} fontSize={9} fill="#8C8C8C" textAnchor="end">{t}</text>
//                         </g>
//                     );
//                 })}
//                 {BAR_DATA.map((d, i) => {
//                     const bH = (d.count / max) * plotH;
//                     const x = PAD.left + i * barW + barW * 0.2;
//                     const y = PAD.top + plotH - bH;
//                     const bw = barW * 0.6;
//                     return (
//                         <g key={i}>
//                             <rect x={x} y={y} width={bw} height={bH} fill="#1677FF" rx={4} opacity={0.85}>
//                                 <title>{d.branch}: {d.count}</title>
//                             </rect>
//                             <text x={x + bw / 2} y={H - PAD.bottom + 14} fontSize={9} fill="#8C8C8C" textAnchor="middle">{d.branch}</text>
//                         </g>
//                     );
//                 })}
//             </svg>
//         </Card>
//     );
// }

// // ── Line Chart ────────────────────────────────────────────────────────────────
// export function LineChartCard() {
//     const max = Math.max(...LINE_DATA.map(d => d.count)) + 50;
//     const min = Math.min(...LINE_DATA.map(d => d.count)) - 50;
//     const W = 680;
//     const H = 180;
//     const PAD = { top: 16, right: 24, bottom: 32, left: 44 };
//     const plotW = W - PAD.left - PAD.right;
//     const plotH = H - PAD.top - PAD.bottom;

//     const points = LINE_DATA.map((d, i) => {
//         const x = PAD.left + (i / (LINE_DATA.length - 1)) * plotW;
//         const y = PAD.top + plotH - ((d.count - min) / (max - min)) * plotH;
//         return { x, y, ...d };
//     });

//     const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
//     const area = `M ${points[0].x} ${PAD.top + plotH} ` +
//         points.map(p => `L ${p.x} ${p.y}`).join(' ') +
//         ` L ${points[points.length - 1].x} ${PAD.top + plotH} Z`;

//     const TICKS = [300, 450, 600, 750];

//     return (
//         <Card
//             title="Monthly Training Completion"
//             style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.06)', border: 'none' }}
//         >
//             <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
//                 <defs>
//                     <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
//                         <stop offset="0%" stopColor="#1677FF" stopOpacity={0.25} />
//                         <stop offset="100%" stopColor="#1677FF" stopOpacity={0.02} />
//                     </linearGradient>
//                 </defs>
//                 {TICKS.map(t => {
//                     const y = PAD.top + plotH - ((t - min) / (max - min)) * plotH;
//                     return (
//                         <g key={t}>
//                             <line x1={PAD.left} x2={PAD.left + plotW} y1={y} y2={y} stroke="#F0F0F0" />
//                             <text x={PAD.left - 6} y={y + 4} fontSize={10} fill="#8C8C8C" textAnchor="end">{t}</text>
//                         </g>
//                     );
//                 })}
//                 <path d={area} fill="url(#areaGrad)" />
//                 <polyline points={polyline} fill="none" stroke="#1677FF" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
//                 {points.map((p, i) => (
//                     <g key={i}>
//                         <circle cx={p.x} cy={p.y} r={4} fill="white" stroke="#1677FF" strokeWidth={2} />
//                         <text x={p.x} y={H - PAD.bottom + 14} fontSize={9} fill="#8C8C8C" textAnchor="middle">{p.month}</text>
//                     </g>
//                 ))}
//             </svg>
//         </Card>
//     );
// }
