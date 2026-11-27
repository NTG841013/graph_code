
export function HeroNode({ 
  x, 
  y, 
  highlighted = false, 
  dotColor = "var(--border)", 
  dotColor2,
  borderColor,
  fill = "var(--surface)"
}: { 
  x: number, 
  y: number, 
  highlighted?: boolean, 
  dotColor?: string, 
  dotColor2?: string,
  borderColor?: string,
  fill?: string
}) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect 
        width={140} 
        height={80} 
        rx={4} 
        fill={fill} 
        stroke={borderColor || (highlighted ? "var(--accent)" : "var(--border)")} 
        strokeWidth={highlighted || borderColor ? 1.5 : 1} 
        opacity={highlighted || borderColor ? 1 : 0.8}
      />
      {/* Title bar */}
      <rect x={12} y={12} width={50} height={3} rx={1.5} fill="var(--border)" opacity={0.3} />
      
      {/* Code lines */}
      <rect x={12} y={30} width={116} height={2} rx={1} fill="var(--border)" opacity={0.15} />
      
      <g>
        <rect x={20} y={40} width={108} height={2} rx={1} fill="var(--border)" opacity={0.15} />
        <rect x={12} y={40} width={4} height={4} rx={1} fill={dotColor} />
      </g>
      
      <rect x={12} y={50} width={116} height={2} rx={1} fill="var(--border)" opacity={0.15} />
      
      <g>
        <rect x={20} y={60} width={80} height={2} rx={1} fill="var(--border)" opacity={0.15} />
        <rect x={12} y={60} width={4} height={4} rx={1} fill={dotColor2 || "transparent"} />
      </g>
    </g>
  );
}

export function IllustrationHero({ nodeFill }: { nodeFill?: string }) {
  return (
    <svg width={800} height={600} viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg" className="max-w-full h-auto">
      {/* Background depth nodes */}
      <g opacity={0.03}>
        <HeroNode x={120} y={150} fill={nodeFill} />
        <HeroNode x={600} y={120} fill={nodeFill} />
        <HeroNode x={150} y={400} fill={nodeFill} />
        <HeroNode x={580} y={420} fill={nodeFill} />
      </g>

      {/* Smooth Curved Edges */}
      <g opacity={0.5}>
        <path d="M190 140 C 280 140, 320 280, 350 280" stroke="#4ade80" strokeWidth={1.5} />
        <path d="M190 300 C 270 300, 270 300, 350 300" stroke="var(--border)" strokeWidth={1} />
        <path d="M190 460 C 280 460, 320 320, 350 320" stroke="#facc15" strokeWidth={1.5} />
        
        <path d="M490 280 C 520 280, 560 140, 650 140" stroke="#fb923c" strokeWidth={1.5} />
        <path d="M490 300 C 560 300, 580 300, 630 300" stroke="#2dd4bf" strokeWidth={1.5} />
        <path d="M490 320 C 520 320, 560 460, 650 460" stroke="#818cf8" strokeWidth={1.5} />
      </g>

      {/* Staggered Nodes */}
      <HeroNode x={50} y={100} dotColor="#4ade80" fill={nodeFill} />
      <HeroNode x={70} y={260} fill={nodeFill} />
      <HeroNode x={50} y={420} dotColor="#facc15" fill={nodeFill} />

      {/* Center Highlight */}
      <HeroNode x={350} y={240} highlighted dotColor="#a855f7" dotColor2="#3b82f6" fill={nodeFill} />

      {/* Right Staggered Nodes */}
      <HeroNode x={650} y={100} dotColor="#fb923c" borderColor="#fb923c" fill={nodeFill} />
      <HeroNode x={630} y={260} dotColor="#2dd4bf" borderColor="#2dd4bf" fill={nodeFill} />
      <HeroNode x={650} y={420} dotColor="#818cf8" borderColor="#818cf8" fill={nodeFill} />
      
      {/* Cursor */}
      <g transform="translate(460, 360)">
        <path d="M0 0 L14 11 L7 11 L10 18 L7 19 L4 12 L0 15 Z" fill="white" stroke="black" strokeWidth={0.5} />
      </g>
    </svg>
  );
}

export function IllustrationParsing({ nodeFill }: { nodeFill?: string }) {
  return (
    <svg width={800} height={600} viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg" className="max-w-full h-auto text-border">
      {/* Background depth nodes */}
      <g opacity={0.03}>
        <HeroNode x={140} y={120} fill={nodeFill} />
        <HeroNode x={500} y={400} fill={nodeFill} />
      </g>
      
      {/* Scanning lines representing AST walk */}
      <g opacity={0.4}>
        <path d="M240 280 L 300 240 L 360 280" stroke="#4ade80" strokeWidth={1} />
        <path d="M240 300 L 300 300 L 360 300" stroke="#4ade80" strokeWidth={1} />
        <path d="M240 320 L 300 360 L 360 320" stroke="#4ade80" strokeWidth={1} />
      </g>

      {/* Parser middle block */}
      <rect x={380} y={240} width={40} height={120} rx={4} fill="var(--surface)" stroke="var(--border)" strokeDasharray="4 4" />
      <path d="M390 260 L 410 260" stroke="var(--border)" strokeWidth={2} opacity={0.5} />
      <path d="M390 300 L 410 300" stroke="var(--border)" strokeWidth={2} opacity={0.5} />
      <path d="M390 340 L 410 340" stroke="var(--border)" strokeWidth={2} opacity={0.5} />
      
      {/* Connection out of parser */}
      <path d="M420 300 C 480 300, 500 300, 560 300" stroke="#3b82f6" strokeWidth={1.5} />
      
      {/* Node A: Source */}
      <HeroNode x={100} y={260} dotColor="#4ade80" borderColor="#4ade80" fill={nodeFill} />
      
      {/* Node B: Resolved */}
      <HeroNode x={560} y={260} dotColor="#3b82f6" borderColor="#3b82f6" highlighted fill={nodeFill} />
    </svg>
  );
}

export function IllustrationMap({ nodeFill }: { nodeFill?: string }) {
  return (
    <svg width={800} height={600} viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg" className="max-w-full h-auto text-border">
      {/* Background depth nodes */}
      <g opacity={0.03}>
        <HeroNode x={100} y={100} fill={nodeFill} />
        <HeroNode x={600} y={400} fill={nodeFill} />
        <HeroNode x={400} y={100} fill={nodeFill} />
      </g>

      {/* Complex Graph Edges */}
      <g opacity={0.5}>
        {/* Main highlighted path */}
        <path d="M190 180 C 290 180, 320 300, 350 300" stroke="#4ade80" strokeWidth={1.5} />
        <path d="M490 320 C 590 320, 620 200, 650 180" stroke="#4ade80" strokeWidth={1.5} />
        
        {/* Branching paths */}
        <path d="M190 420 C 290 420, 320 340, 350 340" stroke="#facc15" strokeWidth={1.5} />
        <path d="M490 340 C 590 340, 620 440, 650 460" stroke="#818cf8" strokeWidth={1.5} />
        
        {/* Subtle architectural lines */}
        <path d="M190 180 C 290 180, 320 100, 400 140" stroke="#52525b" strokeWidth={1} opacity={0.5} />
        <path d="M400 140 C 500 180, 550 200, 650 180" stroke="#52525b" strokeWidth={1} opacity={0.5} />
      </g>

      {/* Nodes */}
      <HeroNode x={50} y={140} dotColor="#4ade80" borderColor="#4ade80" fill={nodeFill} />
      <HeroNode x={50} y={380} dotColor="#facc15" borderColor="#facc15" fill={nodeFill} />
      
      <HeroNode x={350} y={280} highlighted dotColor="#4ade80" borderColor="#4ade80" fill={nodeFill} />
      
      <HeroNode x={650} y={140} dotColor="#4ade80" borderColor="#4ade80" fill={nodeFill} />
      <HeroNode x={650} y={420} dotColor="#818cf8" borderColor="#818cf8" fill={nodeFill} />

      {/* Cursor */}
      <g transform="translate(440, 340)">
        <path d="M0 0 L14 11 L7 11 L10 18 L7 19 L4 12 L0 15 Z" fill="white" stroke="black" strokeWidth={0.5} />
      </g>
    </svg>
  );
}

export function IllustrationFrameworks({ nodeFill }: { nodeFill?: string }) {
  return (
    <svg width={800} height={600} viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg" className="max-w-full h-auto text-border">
      {/* Background depth nodes */}
      <g opacity={0.03}>
        <HeroNode x={200} y={100} fill={nodeFill} />
        <HeroNode x={500} y={100} fill={nodeFill} />
      </g>

      {/* Connections between frameworks */}
      <g opacity={0.5}>
        <path d="M240 240 C 370 240, 370 400, 500 400" stroke="#61dafb" strokeWidth={1.5} strokeDasharray="4 4" />
        <path d="M240 400 C 370 400, 370 240, 500 240" stroke="#3178c6" strokeWidth={1.5} strokeDasharray="4 4" />
      </g>

      {/* Node with React style lines */}
      <g transform="translate(100, 200)">
        <HeroNode x={0} y={0} dotColor="#61dafb" borderColor="#61dafb" highlighted fill={nodeFill} />
        <g opacity={0.4}>
          <ellipse cx={70} cy={40} rx={45} ry={15} stroke="#61dafb" strokeWidth={1} transform="rotate(0 70 40)" />
          <ellipse cx={70} cy={40} rx={45} ry={15} stroke="#61dafb" strokeWidth={1} transform="rotate(60 70 40)" />
          <ellipse cx={70} cy={40} rx={45} ry={15} stroke="#61dafb" strokeWidth={1} transform="rotate(-60 70 40)" />
        </g>
      </g>
      
      {/* Node with TS style */}
      <g transform="translate(500, 360)">
        <HeroNode x={0} y={0} dotColor="#3178c6" borderColor="#3178c6" highlighted fill={nodeFill} />
        <text x={105} y={65} fill="#3178c6" fontSize="20" fontWeight="bold" fontFamily="monospace" opacity={0.8}>TS</text>
      </g>

      {/* Node for Next.js */}
      <g transform="translate(500, 120)">
        <HeroNode x={0} y={0} dotColor="var(--foreground)" borderColor="var(--foreground)" highlighted fill={nodeFill} />
        {/* Simple triangle logo representation */}
        <path d="M70 25 L 95 58 L 45 58 Z" stroke="var(--foreground)" strokeWidth={1.5} fill="none" opacity={0.8} />
        <path d="M70 35 L 85 58 L 55 58 Z" fill="var(--foreground)" opacity={0.4} />
      </g>
    </svg>
  );
}
