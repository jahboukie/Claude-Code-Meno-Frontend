import React from 'react';

interface DashboardCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const DashboardCard = ({ title, children, className }: DashboardCardProps) => (
  <div className={`bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl ${className}`}>
    <h2 className="text-2xl font-bold text-slate-800 mb-4">{title}</h2>
    {children}
  </div>
);
