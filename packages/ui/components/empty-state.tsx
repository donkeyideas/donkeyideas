import * as React from 'react';
import { cn } from '../lib/utils';
import { Button, ButtonProps } from './button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      {icon && (
        <div className="mb-4 text-white/40 [.light_&]:text-slate-400 text-4xl">{icon}</div>
      )}
      <h3 className="text-lg font-semibold mb-2 text-white [.light_&]:text-slate-900">{title}</h3>
      <p className="text-white/60 [.light_&]:text-slate-600 mb-6 max-w-sm">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}


