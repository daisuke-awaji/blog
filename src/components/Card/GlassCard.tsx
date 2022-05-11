import styles from './GlassCard.module.scss';

export const Card: React.FC<{ children: any; className?: string }> = ({ children, className }) => {
  return <div className={styles.card + ' ' + className}>{children}</div>;
};
