import { useEffect, useState, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
}

const CustomCursor = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  
  // Keep track of cursor coordinates for particle spawning
  const mouseRef = useRef({ x: -100, y: -100, lastX: -100, lastY: -100 });
  const particleIdRef = useRef(0);

  // Position of the mouse cursor
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  // Springs for smooth "damping/lag" trailing effect
  const springConfig = { damping: 35, stiffness: 350, mass: 0.35 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  useEffect(() => {
    // Disable on touch devices
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
    if (isTouchDevice) return;

    setIsVisible(true);

    const moveCursor = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      cursorX.set(clientX);
      cursorY.set(clientY);
      
      mouseRef.current.x = clientX;
      mouseRef.current.y = clientY;
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isInteractive = 
        target.tagName === 'A' || 
        target.tagName === 'BUTTON' || 
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.closest('a') !== null || 
        target.closest('button') !== null || 
        target.closest('[role="button"]') !== null ||
        target.closest('.interactive-hover') !== null;
      
      setIsHovered(isInteractive);
    };

    window.addEventListener('mousemove', moveCursor);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mouseover', handleMouseOver);

    // Hide default cursor
    document.body.style.cursor = 'none';

    // Particle spawning loop
    let lastTime = parseFloat(performance.now().toFixed(2));
    let frameId: number;

    const updateLoop = (time: number) => {
      const delta = time - lastTime;
      
      // Calculate speed
      const dx = mouseRef.current.x - mouseRef.current.lastX;
      const dy = mouseRef.current.y - mouseRef.current.lastY;
      const speed = Math.sqrt(dx * dx + dy * dy);

      // Save last coordinates
      mouseRef.current.lastX = mouseRef.current.x;
      mouseRef.current.lastY = mouseRef.current.y;

      // Spawn particle if moving fast enough or periodically
      if (speed > 1.5 && Math.random() < 0.35 && mouseRef.current.x > 0) {
        const pSize = Math.random() * 4 + 2;
        // Randomize color slightly between magenta (#B600A8), purple (#7621B0), and amber (#BE4C00)
        const rand = Math.random();
        const pColor = rand < 0.4 
          ? 'rgba(182, 0, 168, 0.7)' 
          : rand < 0.8 
            ? 'rgba(118, 33, 176, 0.7)' 
            : 'rgba(190, 76, 0, 0.7)';

        const newParticle: Particle = {
          id: particleIdRef.current++,
          x: mouseRef.current.x + (Math.random() - 0.5) * 8,
          y: mouseRef.current.y + (Math.random() - 0.5) * 8,
          size: pSize,
          color: pColor
        };

        setParticles((prev) => [...prev.slice(-15), newParticle]); // Cap at 15 particles
      }

      lastTime = time;
      frameId = requestAnimationFrame(updateLoop);
    };

    frameId = requestAnimationFrame(updateLoop);

    return () => {
      window.removeEventListener('mousemove', moveCursor);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseover', handleMouseOver);
      document.body.style.cursor = 'auto';
      cancelAnimationFrame(frameId);
    };
  }, [cursorX, cursorY]);

  // Handle particle fade-outs
  useEffect(() => {
    if (particles.length === 0) return;
    const timeout = setTimeout(() => {
      setParticles((prev) => prev.slice(1));
    }, 400); // Life span of particles
    return () => clearTimeout(timeout);
  }, [particles]);

  if (!isVisible) return null;

  return (
    <>
      {/* 1. Particle Trail */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="fixed top-0 left-0 rounded-full pointer-events-none z-[9998]"
          style={{
            x: p.x,
            y: p.y,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            translateX: '-50%',
            translateY: '-50%',
            filter: 'blur(0.5px)',
            boxShadow: `0 0 8px ${p.color}`,
          }}
          initial={{ opacity: 0.8, scale: 1 }}
          animate={{ opacity: 0, scale: 0.1, y: p.y + 12 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      ))}

      {/* 2. Outer Ring (2026 Rotating & Glowing Gear Style) */}
      <motion.div
        className="fixed top-0 left-0 rounded-full pointer-events-none z-[9999]"
        style={{
          x: cursorXSpring,
          y: cursorYSpring,
          width: 38,
          height: 38,
          translateX: '-50%',
          translateY: '-50%',
          border: '1px dashed rgba(182, 0, 168, 0.8)',
          boxShadow: isHovered 
            ? '0 0 25px rgba(182, 0, 168, 0.6), inset 0 0 10px rgba(182, 0, 168, 0.3)' 
            : '0 0 10px rgba(182, 0, 168, 0.25)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
        }}
        animate={{
          scale: isClicking ? 0.8 : isHovered ? 1.6 : 1,
          rotate: 360,
          borderColor: isHovered ? '#BE4C00' : '#B600A8',
        }}
        transition={{
          rotate: { repeat: Infinity, duration: 8, ease: 'linear' },
          scale: { type: 'spring', stiffness: 500, damping: 25 },
          borderColor: { duration: 0.2 }
        }}
      />

      {/* 3. Outer Aura Ring (Dilation on Hover) */}
      <motion.div
        className="fixed top-0 left-0 rounded-full pointer-events-none z-[9999]"
        style={{
          x: cursorXSpring,
          y: cursorYSpring,
          width: 44,
          height: 44,
          translateX: '-50%',
          translateY: '-50%',
          border: '1px solid rgba(118, 33, 176, 0.3)',
        }}
        animate={{
          scale: isClicking ? 0.6 : isHovered ? 1.9 : 0.8,
          opacity: isHovered ? 0.9 : 0.2,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      />

      {/* 4. Core Center Dot */}
      <motion.div
        className="fixed top-0 left-0 w-2 h-2 rounded-full pointer-events-none z-[10000]"
        style={{
          x: cursorX,
          y: cursorY,
          translateX: '-50%',
          translateY: '-50%',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 0 12px rgba(255, 255, 255, 1), 0 0 4px rgba(182, 0, 168, 0.8)',
        }}
        animate={{
          scale: isClicking ? 1.6 : isHovered ? 0.6 : 1,
          backgroundColor: isHovered ? '#BE4C00' : '#FFFFFF',
        }}
        transition={{ type: 'spring', stiffness: 600, damping: 28 }}
      />
    </>
  );
};

export default CustomCursor;
