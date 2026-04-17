'use client';

export function SoundWaveAnimation() {
  return (
    <div className="flex items-center justify-center gap-1 h-24">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="w-1.5 bg-foreground rounded-full animate-sound-wave"
          style={{
            height: '40%',
            animationDelay: `${i * 0.1}s`,
            animationDuration: '1s',
          }}
        />
      ))}
      <style jsx>{`
        @keyframes soundWave {
          0%, 100% {
            height: 40%;
          }
          50% {
            height: 80%;
          }
        }
        .animate-sound-wave {
          animation: soundWave 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
