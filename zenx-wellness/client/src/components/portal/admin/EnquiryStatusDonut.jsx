import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Link } from 'react-router-dom';
import { CHART } from '@/lib/chartColors';

const STAGE_COLOR = {
  new: '#3478D8',
  contacted: '#7C5CE1',
  'follow-up': '#F59E42',
  converted: '#22A06B',
  closed: '#E85D5D',
};

const STAGE_LABEL = {
  new: 'New Enquiry',
  contacted: 'Contacted',
  'follow-up': 'Follow-up',
  converted: 'Converted',
  closed: 'Lost',
};

const ORDER = ['new', 'contacted', 'follow-up', 'converted', 'closed'];

const TOOLTIP_STYLE = {
  background: '#FFFFFF',
  border: '1px solid #E5EAF2',
  borderRadius: 10,
  boxShadow: '0 12px 32px rgba(27,43,66,0.12)',
  fontSize: 12,
  color: '#1B2B42',
};

export function EnquiryStatusDonut({ counts, companySlug }) {
  const data = ORDER.map((status) => ({
    status,
    name: STAGE_LABEL[status],
    value: counts[status] ?? 0,
  }));
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return <p className="py-12 text-center text-sm text-dim">No enquiries yet.</p>;
  }

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative h-[190px] w-[190px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={62}
              outerRadius={90}
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((d) => (
                <Cell key={d.status} fill={STAGE_COLOR[d.status]} />
              ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-[28px] leading-none text-forest">{total}</span>
          <span className="mt-1 text-[10px] tracking-widest text-dim uppercase">Total</span>
        </div>
      </div>

      <ul className="flex w-full flex-1 flex-col gap-1">
        {data.map((d) => (
          <li key={d.status}>
            <Link
              to={`/${companySlug}/app/enquiries`}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-cream"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: STAGE_COLOR[d.status] }}
                aria-hidden="true"
              />
              <span className="flex-1 truncate text-sm text-muted-foreground">{d.name}</span>
              <span className="text-sm font-semibold text-forest">{d.value}</span>
              <span className="w-10 text-right text-xs text-dim">
                {total ? Math.round((d.value / total) * 100) : 0}%
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
