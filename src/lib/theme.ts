export const theme = {
    colors: {
        blanc: "#E3CCCD"
    },
  // Classes Tailwind
  glassOverlay: "bg-[#d9d9d9]/20 backdrop-blur-[12px] mix-blend-overlay",

  stroke: "absolute inset-[5px] border border-[#E3CCCD]/30 pointer-events-none rounded-[calc(1rem-5px)]",
  strokeTop: "absolute inset-[5px] border-t border-[#E3CCCD]/30 pointer-events-none",
  strokeRight: "absolute inset-[5px] border-r border-b border-[#E3CCCD]/30 pointer-events-none rounded-br-[calc(5rem-5px)]",
  
  gradientNav: {
    background: "linear-gradient(to bottom, rgba(75, 39, 87, 0.9), rgba(55, 42, 132, 0.9))"
  },
  gradientFooter: {
    background: "linear-gradient(to right, rgba(53, 66, 140, 0.9), rgba(60, 20, 92, 0.9), rgba(67, 85, 165, 0.9))"
  },
  gradientCard: {
    background: "linear-gradient(to bottom, rgba(102, 102, 102, 0) 0%, rgba(55, 42, 132, 0.72) 47%, rgba(36, 27, 89, 0.79) 63%, rgba(18, 13, 47, 1) 100%)"
  },
  gradientTab: {
    background: "linear-gradient(to right, rgba(18, 24, 62, 0.9), rgba(87, 105, 214, 0.9))",
    inactive: "linear-gradient(to right, rgba(18, 24, 62, 0.8), rgba(87, 105, 214, 0.8))"
  }
}