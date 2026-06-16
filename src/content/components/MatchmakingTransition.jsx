import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function MatchmakingTransition() {
  const [isActive, setIsActive] = useState(false);
  const [personalNode, setPersonalNode] = useState(null);
  const elementsRef = useRef([]);

  useEffect(() => {
    const handleClick = (e) => {
      const target = e.target.closest('[onclick*="SearchGameButton"], #playerpanel .ready__btn, .btn');
      
      if (target) {
        const onclickAttr = target.getAttribute('onclick') || '';
        const isSearchGame = onclickAttr.includes('SearchGameButton');
        
        if (!isSearchGame && !target.matches('#playerpanel .ready__btn')) {
          return;
        }

        const text = target.textContent.toLowerCase();
        if (text.includes('cancel') || text.includes('stop') || text.includes('salir')) {
          return;
        }

        if (!isActive) {
          e.preventDefault();
          e.stopPropagation();

          const card = document.querySelector('.personal');
          if (card) {
            setPersonalNode(card);
            setIsActive(true);
            
            // Phase 1: Elements fall down (0ms to 800ms)
            // Trigger search when they are hidden at the bottom
            setTimeout(() => {
              window.postMessage({ type: 'L4D2_EXECUTE_SEARCH' }, '*');
            }, 900);

            // Phase 2: Elements spring back up (1000ms to 1800ms)
            setTimeout(() => {
              elementsRef.current.forEach(el => {
                if (!el || !document.body.contains(el)) return;
                el.style.transition = 'transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.5s ease-in';
                el.style.transform = 'translateY(0) rotate(0deg)';
                el.style.opacity = '1';
              });
            }, 1000);

            // Phase 3: Settle down and unmount (2200ms)
            setTimeout(() => {
              setIsActive(false);
              setPersonalNode(null);
            }, 2200); 
          }
        }
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [isActive]);

  // Apply the falling transition
  useEffect(() => {
    if (isActive && personalNode) {
      const elements = Array.from(personalNode.querySelectorAll('img, button, span, a, div[class*="name"], div[class*="mmr"], svg, [class*="badge"]'))
        .filter(el => !el.closest('.lego-portal-overlay'));
      
      elementsRef.current = elements;
      
      const origOverflow = personalNode.style.overflow;
      personalNode.style.overflow = 'hidden';

      // Force a reflow before applying transitions
      void personalNode.offsetWidth;

      elements.forEach((el) => {
        if (window.getComputedStyle(el).display === 'none') return;

        const rot = (Math.random() - 0.5) * 120;
        
        el.style.display = 'inline-block';
        el.style.transition = 'transform 0.8s cubic-bezier(0.55, 0.085, 0.68, 0.53), opacity 0.7s ease-out';
        
        // Trigger the fall in the next frame so the transition applies
        requestAnimationFrame(() => {
          el.style.transform = `translateY(200px) rotate(${rot}deg)`;
          el.style.opacity = '0';
        });
      });

      return () => {
        if (personalNode) {
          personalNode.style.overflow = origOverflow;
        }
        
        // Final cleanup: Wipe all inline styles so it perfectly resets
        elementsRef.current.forEach(el => {
          if (!el) return;
          el.style.removeProperty('transform');
          el.style.removeProperty('display');
          el.style.removeProperty('opacity');
          el.style.removeProperty('transition');
        });
        
        elementsRef.current = [];
      };
    }
  }, [isActive, personalNode]);

  if (!isActive || !personalNode) return null;

  return createPortal(
    <div className="lego-portal-overlay absolute inset-0 z-[50] pointer-events-none flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-inherit opacity-0 animate-[fade-in-out_2.2s_ease-in-out_forwards]">
      <style>{`
        @keyframes fade-in-out {
          0% { opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { opacity: 0; }
        }
        
        @keyframes lego-build {
          0% { transform: translateY(-50px) scale(0); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        
        .lego-block {
          box-shadow: inset 0 2px 0 rgba(255,255,255,0.3), inset 0 -2px 0 rgba(0,0,0,0.3), 0 5px 10px rgba(0,0,0,0.5);
        }
        .lego-stud {
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(0,0,0,0.2);
        }
      `}</style>

      <div className="relative flex gap-1">
        {['C', 'a', 'r', 'g', 'a', 'n', 'd', 'o', '.', '.', '.'].map((letter, i) => (
          <div 
            key={i} 
            className="lego-block relative w-8 h-10 bg-blue-600 flex items-center justify-center rounded-sm font-bold text-white opacity-0"
            style={{ 
              animation: `lego-build 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.2 + (i * 0.05)}s forwards, pulse 1s infinite alternate ${0.8 + (i * 0.1)}s` 
            }}
          >
            <div className="lego-stud absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-1.5 bg-blue-600 rounded-[1px]" />
            {letter}
          </div>
        ))}
      </div>
    </div>,
    personalNode
  );
}

