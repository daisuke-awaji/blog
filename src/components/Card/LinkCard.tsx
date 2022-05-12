import React from 'react';
import { Card } from './GlassCard';
import Link from 'next/link';

export const LinkCard: React.FC<{ children: any; href: string; className?: string }> = ({
  children,
  href,
  className,
}) => (
  <Link href={href} passHref={true}>
    <a>
      <Card className={className}>{children}</Card>
    </a>
  </Link>
);
