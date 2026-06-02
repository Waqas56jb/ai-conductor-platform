import { motion } from 'framer-motion'

/**
 * Conteneur d'animation au défilement réutilisable.
 * Anime l'apparition des éléments lorsqu'ils entrent dans la fenêtre.
 */
export default function Reveal({
  children,
  delay = 0,
  y = 28,
  className = '',
  once = true,
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-80px' }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
