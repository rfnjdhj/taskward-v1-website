import { SvgPropsType } from '.'

export default function Image({
  width = '24',
  height = '24',
  className = '',
  onClick
}: SvgPropsType): JSX.Element {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      onClick={onClick}
    >
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle
        cx="8.5"
        cy="8.5"
        r="1.5"
        fill="currentColor"
      />
      <path
        d="M21 15L16 10L5 21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
