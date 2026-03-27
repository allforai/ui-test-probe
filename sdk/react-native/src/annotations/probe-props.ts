import React, { useMemo } from 'react';

/**
 * Probe metadata attached to React Native components.
 * Maps to testID + accessibilityLabel with structured probe data
 * stored in a serialized format accessible to the test collector.
 */
export interface ProbeProps {
  /** Unique semantic identifier (e.g., "order-table") */
  id: string;
  /** Control type classification */
  type: 'data-container' | 'selector' | 'action' | 'display' | 'media' | 'form' | 'page' | 'modal' | 'navigation';
  /** Current element state */
  state?: string;
  /** Data source descriptor */
  source?: { url: string; method: string };
  /** Linkage declarations */
  linkage?: Array<{
    target: string;
    effect: string;
    path: { type: string; url?: string; expression?: string; storeName?: string; route?: string; through?: string };
  }>;
  /** Animation metadata */
  animation?: { name?: string; playing?: boolean };
  /** Session/dirty tracking */
  session?: { isDirty?: boolean; hasUnsavedChanges?: boolean };
  /** Parent probe ID for hierarchy */
  parent?: string;
  /** Child probe ID pattern or list */
  children?: string[];
}

/**
 * Native props generated from probe metadata.
 * Spread these onto a React Native component to make it observable.
 */
export interface NativeProbeProps {
  testID: string;
  accessibilityLabel: string;
  /** Serialized probe metadata stored in accessibility hint for collector access */
  accessibilityHint: string;
}

/**
 * Hook that converts ProbeProps into native React Native props.
 * Maps probe metadata to testID and accessibilityLabel for the
 * collector to discover at test time.
 *
 * @example
 * ```tsx
 * const probeAttrs = useProbe({
 *   id: 'order-table',
 *   type: 'data-container',
 *   state: 'loaded',
 *   source: { url: 'GET /api/orders', method: 'GET' },
 * });
 * return <FlatList {...probeAttrs} data={orders} />;
 * ```
 */
export function useProbe(props: ProbeProps): NativeProbeProps {
  return useMemo(() => {
    const metadata = JSON.stringify({
      type: props.type,
      state: props.state,
      source: props.source,
      linkage: props.linkage,
      animation: props.animation,
      session: props.session,
      parent: props.parent,
      children: props.children,
    });

    return {
      testID: props.id,
      accessibilityLabel: `probe:${props.id}`,
      accessibilityHint: metadata,
    };
  }, [
    props.id,
    props.type,
    props.state,
    props.source,
    props.linkage,
    props.animation,
    props.session,
    props.parent,
    props.children,
  ]);
}

/**
 * HOC that wraps a component with probe annotations.
 * Injects testID, accessibilityLabel, and serialized metadata
 * into the wrapped component's props.
 *
 * @example
 * ```tsx
 * const ProbedFlatList = withProbe(FlatList, {
 *   id: 'order-table',
 *   type: 'data-container',
 * });
 * ```
 */
export function withProbe<P extends Record<string, unknown>>(
  WrappedComponent: React.ComponentType<P>,
  probeProps: ProbeProps,
): React.ComponentType<Omit<P, keyof NativeProbeProps>> {
  const displayName = (WrappedComponent as { displayName?: string }).displayName
    ?? (WrappedComponent as { name?: string }).name
    ?? 'Component';

  const ProbeWrapper = React.forwardRef<unknown, Omit<P, keyof NativeProbeProps>>(
    function ProbeWrapper(props, ref) {
      const nativeProps = useProbe(probeProps);
      const merged = { ...props, ...nativeProps, ref } as P;
      return React.createElement(WrappedComponent, merged);
    },
  );

  (ProbeWrapper as { displayName?: string }).displayName = `withProbe(${displayName})`;
  return ProbeWrapper as unknown as React.ComponentType<Omit<P, keyof NativeProbeProps>>;
}
