import { createAnimatable as raw } from 'animejs';
import type {
  AnimatableObject,
  AnimatableParams,
  TargetsParam,
} from 'animejs';

const DEFAULT_KEYS = new Set(['duration','delay','loopDelay','ease','easing','composition','autoplay','loop','alternate','reversed','frameRate','onBegin','onUpdate','onComplete','onLoop']);

type SafeTarget = HTMLElement | SVGElement | TargetsParam;

export function createSafeAnimatable<P extends AnimatableParams>(
  target: SafeTarget,
  params: P,
): AnimatableObject {
  const hasAnimatedProp = Object.keys(params).some(k => !DEFAULT_KEYS.has(k) && !k.startsWith('on'));
  if (!hasAnimatedProp && process.env.NODE_ENV !== 'production') console.warn('[animatable] createAnimatable called without animated props (x/y etc) — x() will be undefined', params);
  return raw(target, params);
}
export { raw as createAnimatableRaw };
