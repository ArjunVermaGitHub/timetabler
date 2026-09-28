import styles from './Loader.module.scss';

export default function Loader({ size = 'medium', text = 'Loading...' }) {
  return (
    <div className={styles.loader}>
      <div className={`${styles.spinner} ${styles[size]}`}></div>
      {text && <p className={styles.text}>{text}</p>}
    </div>
  );
}




