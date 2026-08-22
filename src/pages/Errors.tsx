import { Component, type ErrorInfo, type ReactNode, useEffect, useRef } from "react";
import { Ban, Fingerprint, RefreshCw, SearchX, ServerCrash, Box } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../utils/cn";

// 3D Floating Particles
function FloatingParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Particle system
    const particles: { x: number; y: number; size: number; speedX: number; speedY: number; color: string }[] = [];
    const particleCount = 50;

    // Create particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1,
        speedX: Math.random() * 0.5 - 0.25,
        speedY: Math.random() * 0.5 - 0.25,
        color: `hsl(${Math.random() * 60 + 200}, 70%, ${Math.random() * 30 + 50}%)`,
      });
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(10, 20, 40, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        // Update position
        p.x += p.speedX;
        p.y += p.speedY;

        // Bounce off edges
        if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
        if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }

      requestAnimationFrame(animate);
    };

    animate();
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 -z-10" />;
}

// 3D Cube Element
function Cube3D() {
  return (
    <div className="relative h-24 w-24 perspective-1000">
      <div className="absolute inset-0 animate-cube-rotate transform-style-preserve-3d">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={cn(
              "absolute h-full w-full rounded-lg border border-white/10 bg-gradient-to-br from-blue-500/20 to-blue-700/20 backdrop-blur-sm",
              i === 0 && "rotate-y-0",
              i === 1 && "rotate-y-90",
              i === 2 && "rotate-y-180",
              i === 3 && "rotate-y-270",
              i === 4 && "rotate-x-90",
              i === 5 && "rotate-x-270"
            )}
          >
            <div className="flex h-full w-full items-center justify-center text-blue-200/50">
              <Box size={32} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Glassmorphism Error Card
function ErrorCard({ code, title, desc, icon, children }: { code: string; title: string; desc: string; icon: ReactNode; children?: ReactNode }) {
  return (
    <div className="relative z-10 mx-auto max-w-md rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/10 p-8 shadow-2xl shadow-black/30 backdrop-blur-lg">
      <div className="absolute -left-4 -top-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/10 text-blue-400">
        {icon}
      </div>
      <div className="mt-8">
        <p className="text-[13px] font-bold tracking-widest text-blue-300/80">{code}</p>
        <h1 className="mt-3 text-2xl font-bold text-slate-50">{title}</h1>
        <p className="mx-auto mt-4 text-[13px] leading-7 text-slate-300/80">{desc}</p>
      </div>
      <div className="mt-8 flex flex-col items-center gap-4">
        {children}
      </div>
    </div>
  );
}

// Modern Error Page Layout
function ErrorPage({ code, title, desc, icon }: { code: string; title: string; desc: string; icon: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 to-blue-900/50 text-slate-50">
      <FloatingParticles />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-900/20 to-slate-900/80" />
      
      {/* 3D Elements */}
      <div className="absolute top-1/4 opacity-20 animate-float-slow">
        <Cube3D />
      </div>
      <div className="absolute bottom-1/4 right-1/4 opacity-15 animate-float">
        <Cube3D />
      </div>
      <div className="absolute top-1/3 right-1/3 opacity-10 animate-float-delayed">
        <Cube3D />
      </div>
      
      {/* Main Error Card */}
      <ErrorCard code={code} title={title} desc={desc} icon={icon}>
        <Link
          to="/"
          className="flex items-center gap-2 rounded-xl bg-blue-600/80 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500/90 hover:shadow-blue-500/40"
        >
          بازگشت به صفحه اصلی
        </Link>
        <ResetBoundaryButton />
      </ErrorCard>
    </div>
  );
}

// Error Page Components
export function NotFound() {
  return (
    <ErrorPage
      code="404"
      title="صفحه یافت نشد"
      desc="آدرسی که به دنبال آن هستید وجود ندارد یا به مکان دیگری منتقل شده است."
      icon={<SearchX size={34} />}
    />
  );
}

export function Forbidden() {
  return (
    <ErrorPage
      code="403"
      title="دسترسی محدود"
      desc="حساب کاربری شما مجوز مشاهده این بخش را ندارد. این صفحه فقط برای نقش‌های مجاز قابل دسترسی است."
      icon={<Ban size={34} />}
    />
  );
}

export function ServerError() {
  return (
    <ErrorPage
      code="500"
      title="خطای سرور"
      desc="مشکلی در پردازش درخواست شما پیش آمد. لطفاً دوباره تلاش کنید یا با پشتیبانی تماس بگیرید."
      icon={<ServerCrash size={34} />}
    />
  );
}

// Error Boundary
interface BoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    void error;
    void info;
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorPage
          code="500"
          title="خطای غیرمنتظره"
          desc="مشکلی در نمایش این صفحه رخ داد. لطفاً صفحه را بارگذاری مجدد کنید."
          icon={<Fingerprint size={34} />}
        />
      );
    }
    return this.props.children;
  }
}

export function ResetBoundaryButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-300 transition-all hover:bg-white/5"
    >
      <RefreshCw size={14} /> بارگذاری مجدد
    </button>
  );
}

// Add CSS animations
const styles = `
  @keyframes float {
    0%, 100% { transform: translateY(0px) rotateY(0deg); }
    50% { transform: translateY(-10px) rotateY(180deg); }
  }
  @keyframes float-slow {
    0%, 100% { transform: translateY(0px) rotateY(0deg); }
    50% { transform: translateY(-15px) rotateY(90deg); }
  }
  @keyframes float-delayed {
    0%, 100% { transform: translateY(0px) rotateY(0deg); }
    50% { transform: translateY(-8px) rotateY(270deg); }
  }
  @keyframes cube-rotate {
    0% { transform: rotateX(0deg) rotateY(0deg); }
    100% { transform: rotateX(360deg) rotateY(360deg); }
  }
  .animate-float {
    animation: float 6s ease-in-out infinite;
  }
  .animate-float-slow {
    animation: float-slow 8s ease-in-out infinite;
  }
  .animate-float-delayed {
    animation: float 7s ease-in-out 2s infinite;
  }
  .animate-cube-rotate {
    animation: cube-rotate 15s linear infinite;
  }
  .perspective-1000 {
    perspective: 1000px;
  }
  .transform-style-preserve-3d {
    transform-style: preserve-3d;
  }
`;

// Inject styles
const styleElement = document.createElement('style');
styleElement.innerHTML = styles;
document.head.appendChild(styleElement);
