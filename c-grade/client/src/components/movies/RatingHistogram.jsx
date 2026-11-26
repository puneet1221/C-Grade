import { Star } from 'lucide-react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

/**
 * Community Ratings Hub displaying MongoDB-aggregated average score,
 * total ratings count, and an interactive Recharts 5-star breakdown histogram.
 */
export function RatingHistogram({ averageRating = 0, ratingsCount = 0, ratingDistribution = {} }) {
  const chartData = [5, 4, 3, 2, 1].map((star) => ({
    star: `${star}★`,
    count: Number(ratingDistribution?.[star] || 0),
    starNum: star,
  }));

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6">
      <div className="mb-5 flex items-baseline justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <p className="text-xs font-medium text-zinc-400">Community Score</p>
          <div className="mt-1 flex items-center gap-2">
            <Star className="h-6 w-6 fill-amber-400 text-amber-400" aria-hidden="true" />
            <span className="font-mono-tabular text-3xl font-bold text-zinc-50">
              {averageRating > 0 ? averageRating.toFixed(1) : '—'}
            </span>
            <span className="text-sm text-zinc-500">/ 5.0</span>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono-tabular text-lg font-semibold text-zinc-100">{ratingsCount}</p>
          <p className="text-xs text-zinc-400">{ratingsCount === 1 ? 'Review' : 'Reviews'}</p>
        </div>
      </div>

      <div className="h-44 w-full" aria-label="Star rating distribution histogram">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 2, right: 16, left: -16, bottom: 2 }}>
            <XAxis type="number" hide allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="star"
              tick={{ fill: '#A1A1AA', fontSize: 12, fontFamily: 'JetBrains Mono' }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              contentStyle={{
                backgroundColor: '#18181B',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px',
                color: '#FAFAFA',
                fontSize: '12px',
              }}
              formatter={(value) => [`${value} ratings`, 'Count']}
            />
            <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={16}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.star}
                  fill={entry.count > 0 ? '#F59E0B' : 'rgba(255,255,255,0.08)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
