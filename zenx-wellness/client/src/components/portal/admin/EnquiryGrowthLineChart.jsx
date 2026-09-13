import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CHART } from '@/lib/chartColors';

const TOOLTIP_STYLE = {
  background: '#FFFFFF',
  border: '1px solid #E5EAF2',
  borderRadius: 10,
  boxShadow: '0 12px 32px rgba(27,43,66,0.12)',
  fontSize: 12,
  color: '#1B2B42',
};

export function EnquiryGrowthLineChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis dataKey="label" stroke={CHART.axis} fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke={CHART.axis} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: CHART.grid }} />
        <Legend wrapperStyle={{ fontSize: 11, color: '#6B7A90' }} />
        <Line type="monotone" dataKey="enquiries" name="Enquiries" stroke={CHART.accent} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="converted" name="Converted" stroke={CHART.positive} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="lost" name="Lost" stroke={CHART.danger} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
