'use client';

import { Card, CardContent } from '@donkey-ideas/ui';

interface KPIData {
  totalUsers: number;
  newUsers30d: number;
  newUsers7d: number;
  growthRate: number;
}

interface UserKPICardsProps {
  data: KPIData;
  projectCount: number;
}

export function UserKPICards({ data, projectCount }: UserKPICardsProps) {
  const formatNumber = (n: number) =>
    new Intl.NumberFormat('en-US').format(n);

  const cards = [
    {
      label: 'TOTAL USERS',
      value: formatNumber(data.totalUsers),
      subtitle: `Across ${projectCount} projects`,
      color: 'text-white',
    },
    {
      label: 'NEW USERS (30D)',
      value: formatNumber(data.newUsers30d),
      subtitle: `${data.growthRate > 0 ? '+' : ''}${data.growthRate}% growth`,
      color: data.growthRate >= 0 ? 'text-green-400' : 'text-red-400',
    },
    {
      label: 'NEW USERS (7D)',
      value: formatNumber(data.newUsers7d),
      subtitle: 'Last 7 days',
      color: 'text-blue-400',
    },
    {
      label: 'GROWTH RATE',
      value: `${data.growthRate > 0 ? '+' : ''}${data.growthRate}%`,
      subtitle: 'Monthly growth',
      color: data.growthRate >= 5 ? 'text-green-400' : data.growthRate >= 0 ? 'text-yellow-400' : 'text-red-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <Card key={card.label} className="bg-gray-800/50 border-gray-700 [.light_&]:bg-white [.light_&]:border-gray-200">
          <CardContent className="p-3">
            <p className="text-[10px] font-medium text-gray-400 [.light_&]:text-gray-500 tracking-wider">
              {card.label}
            </p>
            <p className={`text-2xl font-bold mt-1 ${card.color} [.light_&]:text-gray-900`}>
              {card.value}
            </p>
            <p className={`text-xs mt-0.5 ${card.color === 'text-white' ? 'text-gray-400' : card.color}`}>
              {card.subtitle}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
