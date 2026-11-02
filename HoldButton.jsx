import { useEffect, useId, useRef, useState } from 'react';
import './hold-button.css';

const TAP_MS = 250;
const EASE_OUT = value => 1 - Math.pow(1 - value, 3);

export default function HoldButton({
  children = 'Hold to confirm',
  doneLabel = 'Confirmed',
  icon = null,
  doneIcon = null,
  backgroundColor = '#27272a',
  fillColor = '#5227FF',
  textColor = '#f5f5f5',
  fillTextColor = '#ffffff',
  size = 'md',
  radius = 14,
  fillDirection = 'right',
  holdTime = 2000,
  releaseTime = 200,
  pressScale = 0.97,
  wave = true,
  waveAmplitude = 6,
  glow = true,
  resetAfter = 1200,
  disabled = false,
  onHold,
  onTap,
  className = ''
}) {
  const [phaseState, setPhaseState] = useState('idle');
  const [input, setInput] = useState(null);
  const buttonRef = useRef(null);
  const phaseRef = useRef('idle');
  const inputRef = useRef(null);
  const gestureRef = useRef({ pointerId: null, start: 0 });
  const timersRef = useRef({ complete: 0, reset: 0 });
  const motionRef = useRef({ frame: 0, progress: 0, from: 0, to: 0, start: 0 });
  const hintId = useId();

  const goPhase = (nextPhase, nextInput = null) => {
    phaseRef.current = nextPhase;
    inputRef.current = nextInput;
    setPhaseState(nextPhase);
    setInput(nextInput);
  };

  const clearTimers = () => {
    clearTimeout(timersRef.current.complete);
    clearTimeout(timersRef.current.reset);
  };

  const animateProgress = (target, duration) => {
    const motion = motionRef.current;
    cancelAnimationFrame(motion.frame);
    motion.from = motion.progress;
    motion.to = target;
    motion.start = performance.now();

    const step = now => {
      const elapsed = duration > 0 ? (now - motion.start) / duration : 1;
      const progress = Math.min(1, elapsed);
      motion.progress = motion.from + (motion.to - motion.from) * (target === 1 ? progress : EASE_OUT(progress));
      buttonRef.current?.style.setProperty('--hb-progress', motion.progress.toFixed(4));
      if (progress < 1) {
        motion.frame = requestAnimationFrame(step);
        return;
      }
      motion.frame = 0;
      if (target === 1) completeHold();
    };

    motion.frame = requestAnimationFrame(step);
  };

  const completeHold = () => {
    if (phaseRef.current !== 'holding') return;
    if (performance.now() - gestureRef.current.start < holdTime - 50) return;
    clearTimers();
    goPhase('done', inputRef.current);
    if (resetAfter > 0) {
      timersRef.current.reset = setTimeout(() => {
        goPhase('idle');
        animateProgress(0, releaseTime);
      }, resetAfter);
    }
    onHold?.();
  };

  const begin = kind => {
    if (disabled || phaseRef.current !== 'idle' || !buttonRef.current) return false;
    gestureRef.current.start = performance.now();
    goPhase('holding', kind);
    animateProgress(1, holdTime);
    timersRef.current.complete = setTimeout(completeHold, holdTime + 100);
    return true;
  };

  const release = ({ drifted = false } = {}) => {
    if (phaseRef.current !== 'holding') return;
    clearTimers();
    const held = performance.now() - gestureRef.current.start;
    goPhase('idle');
    animateProgress(0, releaseTime);
    if (!drifted && held < TAP_MS) onTap?.();
  };

  const endPointer = (event, options) => {
    if (event.pointerId !== gestureRef.current.pointerId) return;
    const pointerId = gestureRef.current.pointerId;
    gestureRef.current.pointerId = null;
    if (event.currentTarget.hasPointerCapture(pointerId)) {
      event.currentTarget.releasePointerCapture(pointerId);
    }
    release(options);
  };

  const handlePointerDown = event => {
    if (event.button !== 0 || !event.isPrimary || gestureRef.current.pointerId !== null) return;
    if (!begin('pointer')) return;
    gestureRef.current.pointerId = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = event => {
    if (event.pointerId !== gestureRef.current.pointerId) return;
    const bounds = buttonRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const outside =
      event.clientX < bounds.left - 10 ||
      event.clientX > bounds.right + 10 ||
      event.clientY < bounds.top - 10 ||
      event.clientY > bounds.bottom + 10;
    if (outside) endPointer(event, { drifted: true });
  };

  const handleKeyDown = event => {
    if (event.key === 'Escape') {
      if (inputRef.current === 'key') release({ drifted: true });
      return;
    }
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (!event.repeat) begin('key');
    }
  };

  const handleKeyUp = event => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (inputRef.current === 'key') release();
    }
  };

  useEffect(() => {
    if (phaseState !== 'holding') return undefined;
    const cancelHold = () => release({ drifted: true });
    const onVisibilityChange = () => {
      if (document.hidden) cancelHold();
    };
    window.addEventListener('blur', cancelHold);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('blur', cancelHold);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [phaseState]);

  useEffect(() => () => {
    clearTimeout(timersRef.current.complete);
    clearTimeout(timersRef.current.reset);
    cancelAnimationFrame(motionRef.current.frame);
  }, []);

  const labels = (
    <>
      <span className="hold-button__idle" aria-hidden={phaseState === 'done'}>
        {icon && <span className="hold-button__icon">{icon}</span>}
        {children}
      </span>
      <span className="hold-button__done" aria-hidden={phaseState !== 'done'}>
        {doneIcon && <span className="hold-button__icon">{doneIcon}</span>}
        {doneLabel}
      </span>
    </>
  );

  return (
    <button
      ref={buttonRef}
      type="button"
      disabled={disabled}
      className={`hold-button hold-button--${size}${className ? ` ${className}` : ''}`}
      data-phase={phaseState}
      data-input={input ?? undefined}
      data-direction={fillDirection === 'up' ? 'up' : 'right'}
      data-wave={wave ? 'true' : undefined}
      data-glow={glow ? 'true' : undefined}
      aria-describedby={hintId}
      style={{
        '--hb-radius': `${radius}px`,
        '--hb-bg': backgroundColor,
        '--hb-fill': fillColor,
        '--hb-text': textColor,
        '--hb-fill-text': fillTextColor,
        '--hb-hold': `${holdTime}ms`,
        '--hb-release': `${releaseTime}ms`,
        '--hb-press': pressScale,
        '--hb-wave': `${wave ? waveAmplitude : 0}px`
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={event => endPointer(event)}
      onPointerCancel={event => endPointer(event, { drifted: true })}
      onLostPointerCapture={event => endPointer(event, { drifted: true })}
      onPointerLeave={event => {
        if (event.pointerType !== 'touch') endPointer(event, { drifted: true });
      }}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onContextMenu={event => event.preventDefault()}
    >
      <span className="hold-button__label">{labels}</span>
      <span className="hold-button__fill" aria-hidden="true">
        <span className="hold-button__label">{labels}</span>
      </span>
      <span id={hintId} className="hold-button__sr">
        Press and hold for {Math.round(holdTime / 100) / 10} seconds to confirm
      </span>
    </button>
  );
}
