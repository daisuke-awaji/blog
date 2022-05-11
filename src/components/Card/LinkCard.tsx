import React from 'react';
import { Card } from './GlassCard';
import Link from 'next/link';

export const LinkCard: React.FC<{ children: any; href: string }> = ({ children, href }) => (
  <Link href={href} passHref={true}>
    <a>
      <Card>{children}</Card>
    </a>
  </Link>
);
