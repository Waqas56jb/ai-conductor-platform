import { useInView } from './useInView'

/** Fades and lifts its content in when it enters the viewport. `delay` is in ms. */
export function Reveal({ as: Tag = 'div', className = '', delay = 0, style, children, ...rest }) {
  const [ref, inView] = useInView()
  return (
    <Tag
      ref={ref}
      className={`reveal${inView ? ' is-visible' : ''}${className ? ` ${className}` : ''}`}
      style={delay ? { '--reveal-delay': `${delay}ms`, ...style } : style}
      {...rest}
    >
      {children}
    </Tag>
  )
}
