import React, { useState } from 'react';
import { Button } from '../Button';

export function Form({ onSubmit, children, className = '' }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.(e);
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      {children}
    </form>
  );
}

Form.displayName = 'Form';

export function FormField({ label, error, required, children, hint }) {
  return (
    <div className="space-y-2">
      {label && (
        <FormLabel required={required}>{label}</FormLabel>
      )}
      {children}
      {hint && !error && (
        <FormHint>{hint}</FormHint>
      )}
      {error && (
        <FormError>{error}</FormError>
      )}
    </div>
  );
}

FormField.displayName = 'FormField';

export function FormLabel({ children, required }) {
  return (
    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}

FormLabel.displayName = 'FormLabel';

export function FormHint({ children }) {
  return (
    <p className="text-sm text-gray-500 dark:text-gray-400">{children}</p>
  );
}

FormHint.displayName = 'FormHint';

export function FormError({ children }) {
  return (
    <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
      <span>⚠️</span>
      {children}
    </p>
  );
}

FormError.displayName = 'FormError';

export function Input({
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled,
  icon,
  className = '',
  ...props
}) {
  return (
    <div className="relative">
      {icon && (
        <InputIcon icon={icon} />
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`
          w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600
          bg-white dark:bg-gray-800 text-gray-900 dark:text-white
          placeholder-gray-400 dark:placeholder-gray-500
          focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10
          disabled:bg-gray-100 disabled:cursor-not-allowed
          transition-all duration-200
          ${icon ? 'pl-11' : ''}
          ${className}
        `}
        {...props}
      />
    </div>
  );
}

Input.displayName = 'Input';

function InputIcon({ icon }) {
  return (
    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
      {icon}
    </span>
  );
}

InputIcon.displayName = 'InputIcon';

export function TextArea({
  placeholder,
  value,
  onChange,
  rows = 4,
  disabled,
  className = '',
  ...props
}) {
  return (
    <textarea
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      rows={rows}
      disabled={disabled}
      className={`
        w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600
        bg-white dark:bg-gray-800 text-gray-900 dark:text-white
        placeholder-gray-400 dark:placeholder-gray-500
        focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10
        disabled:bg-gray-100 disabled:cursor-not-allowed
        transition-all duration-200 resize-none
        ${className}
      `}
      {...props}
    />
  );
}

TextArea.displayName = 'TextArea';

export function Select({ options, value, onChange, placeholder, disabled, className = '' }) {
  return (
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`
        w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600
        bg-white dark:bg-gray-800 text-gray-900 dark:text-white
        focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10
        disabled:bg-gray-100 disabled:cursor-not-allowed
        transition-all duration-200 cursor-pointer
        ${className}
      `}
    >
      {placeholder && (
        <option value="" disabled>{placeholder}</option>
      )}
      {options.map((option) => (
        <SelectOption key={option.value} option={option} />
      ))}
    </select>
  );
}

Select.displayName = 'Select';

function SelectOption({ option }) {
  return (
    <option value={option.value}>{option.label}</option>
  );
}

SelectOption.displayName = 'SelectOption';

export function Checkbox({ label, checked, onChange, disabled }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <CheckboxInput checked={checked} onChange={onChange} disabled={disabled} />
      <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
        {label}
      </span>
    </label>
  );
}

Checkbox.displayName = 'Checkbox';

function CheckboxInput({ checked, onChange, disabled }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className="w-5 h-5 rounded-md border-2 border-gray-300 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer transition-all"
    />
  );
}

CheckboxInput.displayName = 'CheckboxInput';
