interface CardProps {
  title?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Card({ title, headerAction, children, className = '' }: CardProps) {
  return (
    <div className={`bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5 ${className}`}>
      {title && (
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-heading text-base tracking-wide">{title}</h3>
          {headerAction}
        </div>
      )}
      {children}
    </div>
  );
}
