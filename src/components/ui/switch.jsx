import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import { cn } from '../../lib/utils';

const Switch = React.forwardRef(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    ref={ref}
    className={cn(
      'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-gray-300 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 data-[state=checked]:bg-blue-600',
      className
    )}
    {...props}
  >
    <SwitchPrimitives.Thumb
      className="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 translate-x-0 peer-data-[state=checked]:translate-x-5"
    />
  </SwitchPrimitives.Root>
));

Switch.displayName = 'Switch';
export { Switch };
