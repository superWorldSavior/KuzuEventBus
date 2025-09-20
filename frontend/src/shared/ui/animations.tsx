import { ReactNode, useEffect, useState } from "react";
import { cn } from "@/shared/lib";

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export function FadeIn({ children, delay = 0, duration = 300, className }: FadeInProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={cn(
        "transition-opacity ease-in-out",
        isVisible ? "opacity-100" : "opacity-0",
        className
      )}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
}

interface SlideInProps {
  children: ReactNode;
  direction?: "up" | "down" | "left" | "right";
  delay?: number;
  duration?: number;
  distance?: number;
  className?: string;
}

export function SlideIn({
  children,
  direction = "up",
  delay = 0,
  duration = 300,
  distance = 20,
  className,
}: SlideInProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const getTransform = () => {
    if (isVisible) return "translate3d(0, 0, 0)";
    
    switch (direction) {
      case "up":
        return `translate3d(0, ${distance}px, 0)`;
      case "down":
        return `translate3d(0, -${distance}px, 0)`;
      case "left":
        return `translate3d(${distance}px, 0, 0)`;
      case "right":
        return `translate3d(-${distance}px, 0, 0)`;
      default:
        return `translate3d(0, ${distance}px, 0)`;
    }
  };

  return (
    <div
      className={cn(
        "transition-all ease-out",
        isVisible ? "opacity-100" : "opacity-0",
        className
      )}
      style={{
        transform: getTransform(),
        transitionDuration: `${duration}ms`,
      }}
    >
      {children}
    </div>
  );
}

interface ScaleInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  initialScale?: number;
  className?: string;
}

export function ScaleIn({
  children,
  delay = 0,
  duration = 300,
  initialScale = 0.95,
  className,
}: ScaleInProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={cn(
        "transition-all ease-out",
        isVisible ? "opacity-100" : "opacity-0",
        className
      )}
      style={{
        transform: `scale(${isVisible ? 1 : initialScale})`,
        transitionDuration: `${duration}ms`,
      }}
    >
      {children}
    </div>
  );
}

interface StaggeredAnimationProps {
  children: ReactNode[];
  delay?: number;
  stagger?: number;
  animation?: "fade" | "slide" | "scale";
  className?: string;
}

export function StaggeredAnimation({
  children,
  delay = 0,
  stagger = 100,
  animation = "fade",
  className,
}: StaggeredAnimationProps) {
  return (
    <div className={className}>
      {children.map((child, index) => {
        const AnimationComponent = {
          fade: FadeIn,
          slide: SlideIn,
          scale: ScaleIn,
        }[animation];

        return (
          <AnimationComponent
            key={index}
            delay={delay + index * stagger}
          >
            {child}
          </AnimationComponent>
        );
      })}
    </div>
  );
}

interface PulseProps {
  children: ReactNode;
  intensity?: "subtle" | "normal" | "strong";
  duration?: number;
  className?: string;
}

export function Pulse({
  children,
  intensity = "normal",
  duration = 1000,
  className,
}: PulseProps) {
  const intensityClasses = {
    subtle: "animate-pulse",
    normal: "animate-pulse",
    strong: "animate-pulse",
  };

  const customStyles = {
    subtle: { animationDuration: `${duration * 1.5}ms` },
    normal: { animationDuration: `${duration}ms` },
    strong: { animationDuration: `${duration * 0.7}ms` },
  };

  return (
    <div
      className={cn(intensityClasses[intensity], className)}
      style={customStyles[intensity]}
    >
      {children}
    </div>
  );
}

interface BouncyEnterProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function BouncyEnter({ children, delay = 0, className }: BouncyEnterProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={cn(
        "transition-all duration-500 ease-out",
        isVisible
          ? "opacity-100 scale-100 animate-bounce-in"
          : "opacity-0 scale-75",
        className
      )}
    >
      {children}
    </div>
  );
}

interface MicroInteractionProps {
  children: ReactNode;
  hover?: boolean;
  focus?: boolean;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}

export function MicroInteraction({
  children,
  hover = true,
  focus = true,
  active = true,
  disabled = false,
  className,
}: MicroInteractionProps) {
  return (
    <div
      className={cn(
        "transition-all duration-200 ease-in-out",
        !disabled && hover && "hover:scale-[1.02] hover:shadow-md",
        !disabled && focus && "focus-within:scale-[1.01] focus-within:shadow-lg",
        !disabled && active && "active:scale-[0.98]",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {children}
    </div>
  );
}