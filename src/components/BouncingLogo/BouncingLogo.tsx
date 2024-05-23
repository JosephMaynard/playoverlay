import React, { useEffect, useState, useRef } from 'react';

// @ts-ignore
import logo from '../../assets/playoverlay-logo.svg';

const BouncingLogo: React.FC = () => {
  const [position, setPosition] = useState({ top: 50, left: 50 });
  const [velocity, setVelocity] = useState({ x: 2, y: 2 });
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const moveLogo = () => {
      setPosition((prev) => {
        const newTop = prev.top + velocity.y;
        const newLeft = prev.left + velocity.x;
        const newVelocity = { ...velocity };

        if (
          newTop <= 0 ||
          newTop + logoRef.current!.offsetHeight >=
            containerRef.current!.offsetHeight
        ) {
          newVelocity.y *= -1;
        }
        if (
          newLeft <= 0 ||
          newLeft + logoRef.current!.offsetWidth >=
            containerRef.current!.offsetWidth
        ) {
          newVelocity.x *= -1;
        }

        setVelocity(newVelocity);

        return { top: newTop, left: newLeft };
      });
    };

    const interval = setInterval(moveLogo, 30);

    return () => clearInterval(interval);
  }, [velocity]);

  return (
    <div className="absolute left-0 top-0 h-full w-full" ref={containerRef}>
      <div
        ref={logoRef}
        style={{
          position: 'absolute',
          top: position.top,
          left: position.left,
          height: '25cqw',
          width: '25cqw',
          backgroundColor: 'black',
          borderRadius: '50%',
        }}
      >
        <img
          src={logo}
          alt="PlayOverlay Logo"
          style={{ height: '25cqw', width: '25cqw' }}
          id="bouncing-logo"
        />
      </div>
    </div>
  );
};

export default BouncingLogo;
