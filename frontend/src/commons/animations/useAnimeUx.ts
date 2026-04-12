import { animate, stagger, type JSAnimation } from "animejs";
import { type RefObject, useEffect } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

type PrimitiveDependency = string | number | boolean | null | undefined;

type AnimeRevealOptions = {
  selector?: string;
  dependencyKey?: PrimitiveDependency;
  delayStep?: number;
  startDelay?: number;
  duration?: number;
  translateY?: number;
  startScale?: number;
};

type AnimePressableOptions = {
  selector?: string;
  dependencyKey?: PrimitiveDependency;
  hoverScale?: number;
  liftY?: number;
};

type AnimeMagneticOptions = {
  selector?: string;
  dependencyKey?: PrimitiveDependency;
  maxTilt?: number;
  maxLift?: number;
  enterDuration?: number;
  moveDuration?: number;
  leaveDuration?: number;
};

type AnimeHoverSheenOptions = {
  selector?: string;
  sheenSelector?: string;
  dependencyKey?: PrimitiveDependency;
  duration?: number;
};

type AnimeLoopOptions = {
  selector?: string;
  dependencyKey?: PrimitiveDependency;
  enabled?: boolean;
  duration?: number;
  delayStep?: number;
  startDelay?: number;
  scale?: [number, number];
  translateY?: [number, number];
  translateX?: [number, number];
  rotate?: [number, number];
  opacity?: [number, number];
  ease?: string;
};

export const shouldSkipAnimation = (): boolean => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return true;
  }

  if (typeof window.requestAnimationFrame !== "function") {
    return true;
  }

  if (typeof navigator !== "undefined" && navigator.userAgent.toLowerCase().includes("jsdom")) {
    return true;
  }

  if (typeof window.matchMedia === "function" && window.matchMedia(REDUCED_MOTION_QUERY).matches) {
    return true;
  }

  return false;
};

const defaultPressableSelector = ".anime-pressable, [data-anime='pressable']";

export function useAnimeReveal<T extends HTMLElement>(
  rootRef: RefObject<T>,
  {
    selector = "[data-anime='reveal']",
    dependencyKey,
    delayStep = 80,
    startDelay = 0,
    duration = 560,
    translateY = 14,
    startScale = 0.992,
  }: AnimeRevealOptions = {}
) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || shouldSkipAnimation()) {
      return;
    }

    const targets = Array.from(root.querySelectorAll<HTMLElement>(selector));
    if (targets.length === 0) {
      return;
    }

    targets.forEach((target) => {
      target.style.willChange = "opacity, transform";
    });

    const entrance = animate(targets, {
      opacity: [0, 1],
      translateY: [translateY, 0],
      scale: [startScale, 1],
      delay: stagger(delayStep, { start: startDelay }),
      duration,
      ease: "outQuart",
    });

    void entrance.then(() => {
      targets.forEach((target) => {
        target.style.willChange = "";
      });
    });

    return () => {
      entrance.revert();
      targets.forEach((target) => {
        target.style.willChange = "";
      });
    };
  }, [dependencyKey, delayStep, duration, rootRef, selector, startDelay, startScale, translateY]);
}

export function useAnimePressables<T extends HTMLElement>(
  rootRef: RefObject<T>,
  { selector = defaultPressableSelector, dependencyKey, hoverScale = 1.02, liftY = -2 }: AnimePressableOptions = {}
) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || shouldSkipAnimation()) {
      return;
    }

    const pressables = Array.from(root.querySelectorAll<HTMLElement>(selector));
    if (pressables.length === 0) {
      return;
    }

    const detach = pressables.map((node) => {
      const animateTo = (scale: number, translateY: number, duration: number) => {
        return animate(node, {
          scale,
          translateY,
          duration,
          ease: "outQuad",
        });
      };

      const onEnter = () => {
        node.dataset.animeHover = "1";
        animateTo(hoverScale, liftY, 180);
      };

      const onLeave = () => {
        node.dataset.animeHover = "0";
        animateTo(1, 0, 210);
      };

      const onDown = () => {
        animateTo(0.985, 0, 120);
      };

      const onUp = () => {
        const isHovered = node.dataset.animeHover === "1";
        animateTo(isHovered ? hoverScale : 1, isHovered ? liftY : 0, 140);
      };

      node.addEventListener("pointerenter", onEnter);
      node.addEventListener("pointerleave", onLeave);
      node.addEventListener("pointerdown", onDown);
      node.addEventListener("pointerup", onUp);
      node.addEventListener("pointercancel", onUp);

      return () => {
        node.removeEventListener("pointerenter", onEnter);
        node.removeEventListener("pointerleave", onLeave);
        node.removeEventListener("pointerdown", onDown);
        node.removeEventListener("pointerup", onUp);
        node.removeEventListener("pointercancel", onUp);
      };
    });

    return () => {
      detach.forEach((cleanup) => cleanup());
    };
  }, [dependencyKey, hoverScale, liftY, rootRef, selector]);
}

export function useAnimeMagnetic<T extends HTMLElement>(
  rootRef: RefObject<T>,
  {
    selector = "[data-anime='magnetic']",
    dependencyKey,
    maxTilt = 2.2,
    maxLift = 3,
    enterDuration = 220,
    moveDuration = 180,
    leaveDuration = 300,
  }: AnimeMagneticOptions = {}
) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || shouldSkipAnimation()) {
      return;
    }

    const cards = Array.from(root.querySelectorAll<HTMLElement>(selector));
    if (cards.length === 0) {
      return;
    }

    const detach = cards.map((card) => {
      card.style.transformStyle = "preserve-3d";
      card.style.willChange = "transform";

      const onEnter = () => {
        animate(card, {
          translateY: -maxLift,
          duration: enterDuration,
          ease: "outQuart",
        });
      };

      const onMove = (event: PointerEvent) => {
        if (event.pointerType === "touch") {
          return;
        }

        const rect = card.getBoundingClientRect();
        const px = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const py = ((event.clientY - rect.top) / rect.height) * 2 - 1;

        animate(card, {
          rotateY: px * maxTilt,
          rotateX: -py * maxTilt,
          translateY: -maxLift,
          duration: moveDuration,
          ease: "outQuad",
        });
      };

      const onLeave = () => {
        animate(card, {
          rotateX: 0,
          rotateY: 0,
          translateY: 0,
          duration: leaveDuration,
          ease: "outQuart",
        });
      };

      card.addEventListener("pointerenter", onEnter);
      card.addEventListener("pointermove", onMove);
      card.addEventListener("pointerleave", onLeave);

      return () => {
        card.removeEventListener("pointerenter", onEnter);
        card.removeEventListener("pointermove", onMove);
        card.removeEventListener("pointerleave", onLeave);
        card.style.transformStyle = "";
        card.style.willChange = "";
      };
    });

    return () => {
      detach.forEach((cleanup) => cleanup());
    };
  }, [dependencyKey, enterDuration, leaveDuration, maxLift, maxTilt, moveDuration, rootRef, selector]);
}

export function useAnimeHoverSheen<T extends HTMLElement>(
  rootRef: RefObject<T>,
  {
    selector = "[data-anime='sheen-target']",
    sheenSelector = "[data-anime='sheen']",
    dependencyKey,
    duration = 620,
  }: AnimeHoverSheenOptions = {}
) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || shouldSkipAnimation()) {
      return;
    }

    const targets = Array.from(root.querySelectorAll<HTMLElement>(selector));
    if (targets.length === 0) {
      return;
    }

    const detach = targets.map((target) => {
      const sheen = target.querySelector<HTMLElement>(sheenSelector);
      if (!sheen) {
        return () => undefined;
      }

      sheen.style.willChange = "opacity, transform";

      const onEnter = () => {
        animate(sheen, {
          translateX: [-170, 280],
          opacity: [0, 0.55, 0],
          duration,
          ease: "outQuart",
        });
      };

      const onLeave = () => {
        animate(sheen, {
          opacity: 0,
          duration: 150,
          ease: "outQuad",
        });
      };

      target.addEventListener("pointerenter", onEnter);
      target.addEventListener("pointerleave", onLeave);

      return () => {
        target.removeEventListener("pointerenter", onEnter);
        target.removeEventListener("pointerleave", onLeave);
        sheen.style.willChange = "";
      };
    });

    return () => {
      detach.forEach((cleanup) => cleanup());
    };
  }, [dependencyKey, duration, rootRef, selector, sheenSelector]);
}

export function useAnimeLoop<T extends HTMLElement>(
  rootRef: RefObject<T>,
  {
    selector = "[data-anime='loop']",
    dependencyKey,
    enabled = true,
    duration = 1600,
    delayStep = 0,
    startDelay = 0,
    scale,
    translateY,
    translateX,
    rotate,
    opacity,
    ease = "inOutSine",
  }: AnimeLoopOptions = {}
) {
  const scaleKey = scale ? `${scale[0]}:${scale[1]}` : "";
  const translateYKey = translateY ? `${translateY[0]}:${translateY[1]}` : "";
  const translateXKey = translateX ? `${translateX[0]}:${translateX[1]}` : "";
  const rotateKey = rotate ? `${rotate[0]}:${rotate[1]}` : "";
  const opacityKey = opacity ? `${opacity[0]}:${opacity[1]}` : "";

  useEffect(() => {
    const root = rootRef.current;
    if (!enabled || !root || shouldSkipAnimation()) {
      return;
    }

    const targets = Array.from(root.querySelectorAll<HTMLElement>(selector));
    if (targets.length === 0) {
      return;
    }

    targets.forEach((target) => {
      target.style.willChange = "opacity, transform";
    });

    const params = {
      duration,
      loop: true,
      direction: "alternate",
      ease,
      delay: stagger(delayStep, { start: startDelay }),
    } as Parameters<typeof animate>[1];

    if (scale) {
      (params as Record<string, unknown>).scale = scale;
    }
    if (translateY) {
      (params as Record<string, unknown>).translateY = translateY;
    }
    if (translateX) {
      (params as Record<string, unknown>).translateX = translateX;
    }
    if (rotate) {
      (params as Record<string, unknown>).rotate = rotate;
    }
    if (opacity) {
      (params as Record<string, unknown>).opacity = opacity;
    }

    const hasLoopMotion = Boolean(scale || translateY || translateX || rotate || opacity);
    if (!hasLoopMotion) {
      return;
    }

    const loopAnimation = animate(targets, params);

    return () => {
      loopAnimation.revert();
      targets.forEach((target) => {
        target.style.willChange = "";
      });
    };
  }, [
    delayStep,
    dependencyKey,
    duration,
    ease,
    enabled,
    opacityKey,
    rootRef,
    rotateKey,
    scaleKey,
    selector,
    startDelay,
    translateXKey,
    translateYKey,
  ]);
}

export function useAnimeModal(
  isOpen: boolean,
  overlayRef: RefObject<HTMLElement>,
  panelRef: RefObject<HTMLElement>,
  dependencyKey?: PrimitiveDependency
) {
  useEffect(() => {
    if (!isOpen || shouldSkipAnimation()) {
      return;
    }

    const overlay = overlayRef.current;
    const panel = panelRef.current;
    if (!overlay || !panel) {
      return;
    }

    const animations: JSAnimation[] = [];

    animations.push(
      animate(overlay, {
        opacity: [0, 1],
        duration: 180,
        ease: "outQuad",
      })
    );

    animations.push(
      animate(panel, {
        opacity: [0, 1],
        translateY: [18, 0],
        scale: [0.985, 1],
        duration: 260,
        ease: "outQuart",
      })
    );

    return () => {
      animations.forEach((instance) => instance.revert());
    };
  }, [dependencyKey, isOpen, overlayRef, panelRef]);
}
