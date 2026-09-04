'use client';

import { ResponsivePie } from '@nivo/pie';
import { useEffect, useState, useRef } from 'react';

const CompositionChart = ({ data, size = 200, onSegmentHover, onSegmentLeave, parentRef }) => {
  const containerRef = useRef(null);
  const [chartSize, setChartSize] = useState(size);

  useEffect(() => {
    const updateSize = () => {
      // Use the parent composition section to calculate size
      const targetElement = parentRef?.current || containerRef.current;
      
      if (targetElement) {
        const containerHeight = targetElement.clientHeight;
        const containerWidth = targetElement.clientWidth;
        
        // Account for padding (p-5 = 20px on each side = 40px total)
        // Account for tabs/header space (~60px)
        // Account for margins in chart (40px total)
        const verticalSpace = containerHeight - 60 - 40; // header + margins
        const horizontalSpace = containerWidth - 40 - 40; // padding + margins
        
        // Use the smaller dimension to ensure chart fits and is as large as possible
        const availableSize = Math.min(verticalSpace, horizontalSpace);
        
        // Scale to fit available space, with a minimum size of 150px
        const newSize = Math.max(availableSize, 150);
        setChartSize(newSize);
      }
    };

    // Initial update with a small delay to ensure DOM is ready
    const timeoutId = setTimeout(updateSize, 100);
    
    // Use ResizeObserver for accurate sizing when container changes
    const resizeObserver = new ResizeObserver(updateSize);
    
    const targetElement = parentRef?.current || containerRef.current;
    if (targetElement) {
      resizeObserver.observe(targetElement);
    }

    // Also listen to window resize as fallback
    window.addEventListener('resize', updateSize);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateSize);
      resizeObserver.disconnect();
    };
  }, [parentRef]);

  if (!data || data.length === 0) return null;

  return (
    <div 
      ref={containerRef}
      className="flex items-center justify-center relative w-full h-full"
    >
      <div style={{ height: `${chartSize}px`, width: `${chartSize}px`, margin: 'auto' }}>
        <ResponsivePie
          data={data}
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          innerRadius={0.65}
          padAngle={1.5}
          cornerRadius={2}
          activeOuterRadiusOffset={8}
          colors={{ datum: 'data.color' }}
          borderWidth={0}
          enableArcLinkLabels={false}
          enableArcLabels={false}
          onMouseEnter={(datum, event) => {
            if (onSegmentHover) {
              onSegmentHover(datum.id);
            }
          }}
          onMouseLeave={(datum, event) => {
            if (onSegmentLeave) {
              onSegmentLeave();
            }
          }}
          tooltip={({ datum }) => (
            <div className="bg-surface/98 backdrop-blur-md border border-line rounded-md px-3 py-2 shadow-lg">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: datum.color }}
                />
                <span className="text-sm text-fg">{datum.label}</span>
              </div>
              <div className="text-xs text-muted mt-1 ml-[1.125rem]">
                {datum.value.toFixed(2)}%
              </div>
            </div>
          )}
          theme={{
            background: 'transparent',
            text: {
              fontFamily: 'inherit',
              fontSize: 12,
              fill: '#b7bdc5'
            },
            tooltip: {
              container: {
                background: 'transparent',
                padding: 0
              }
            }
          }}
          legends={[]}
          isInteractive={true}
          animate={true}
          motionConfig={{
            mass: 1,
            tension: 280,
            friction: 60
          }}
          transitionMode="centerRadius"
        />
      </div>
    </div>
  );
};

export default CompositionChart;

