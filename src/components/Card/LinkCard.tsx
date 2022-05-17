import React from 'react';
import { Card, CardProps } from './GlassCard';
import Link from 'next/link';

export const LinkCard: React.FC<CardProps & { href: string }> = (props) => (
  <Link href={props.href} passHref={true}>
    <a>
      <Card {...props}>{props.children}</Card>
    </a>
  </Link>
);
