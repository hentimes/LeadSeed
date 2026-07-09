import { SelectHTMLAttributes, forwardRef, ReactNode } from 'react';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', label, error, icon, id, children, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-0.5">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              {icon}
            </div>
          )}
          <select
            ref={ref}
            id={id}
            className={[
              'appearance-none w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl text-sm transition-all duration-200',
              'focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none',
              'hover:border-gray-300 dark:hover:border-gray-600',
              'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
              icon ? 'pl-10' : 'pl-4',
              'pr-10 py-2.5',
              error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : '',
              className
            ].join(' ')}
            {...props}
          >
            {children}
          </select>
          {/* Custom dropdown arrow */}
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && <p className="mt-1.5 text-xs text-red-500 ml-0.5">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
export default Select;
