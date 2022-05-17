import styles from './GlassCard.module.scss';

export type CardProps = {
  children: any;
  className?: string;
  label?: JSX.Element;
};

export const Card: React.FC<CardProps> = ({ children, className, label }) => {
  return (
    <div className={styles.cardContainer}>
      {label && <div className={styles.label}>{label}</div>}
      <div className={styles.card + ' ' + className}>{children}</div>
    </div>
  );
};
