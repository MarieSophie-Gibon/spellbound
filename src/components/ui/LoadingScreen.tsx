export function LoadingScreen() {
  return (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center"
      style={{
        background:
          "radial-gradient(ellipse at 50% 40%, #2d1a4a 0%, #150d2e 50%, #0a0714 100%)",
      }}
    >
      {/* Glassmorphism card */}
      <div
        className="flex items-center justify-center"
      >
        <img
          src="/logo-circle.svg"
          alt="Spellbound"
          className="sm:w-30 sm:h-30 md:w-40 md:h-40 lg:w-60 lg:h-60 animate-pulse"
          style={{
            filter:
              "drop-shadow(0 0 12px rgba(200,150,255,0.9)) drop-shadow(0 0 32px rgba(160,80,255,0.6)) brightness(1.3)",
          }}
        />
      </div>
    </div>
  );
}
