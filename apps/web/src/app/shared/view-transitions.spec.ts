import type { ViewTransitionInfo } from '@angular/router';
import { onViewTransitionCreated, routineTransitionName } from './view-transitions';

describe('view transitions', () => {
  function run(reduce: boolean) {
    const skipTransition = vi.fn();
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: reduce && query.includes('reduce'),
    }));
    onViewTransitionCreated({ transition: { skipTransition } } as unknown as ViewTransitionInfo);
    vi.unstubAllGlobals();
    return skipTransition;
  }

  it('plays when motion is fine', () => {
    expect(run(false)).not.toHaveBeenCalled();
  });

  it('is skipped when the device asks for reduced motion', () => {
    expect(run(true)).toHaveBeenCalledOnce();
  });

  it('gives a routine one name, shared by its Today card and its Run screen', () => {
    expect(routineTransitionName('abc-123')).toBe('routine-abc-123');
  });
});
