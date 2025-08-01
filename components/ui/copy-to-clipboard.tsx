'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface CopyToClipboardProps extends React.HTMLAttributes<HTMLButtonElement> {
  text: string;
  label?: string;
  variant?: 'ghost' | 'outline' | 'default' | 'secondary' | 'destructive' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function CopyToClipboard({
  text,
  label = 'Copy',
  variant = 'ghost',
  size = 'icon',
  className,
  ...props
}: CopyToClipboardProps) {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={copyToClipboard}
      className={cn('transition-all', className)}
      {...props}
    >
      {isCopied ? (
        <Check className="h-4 w-4" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
      {label && size !== 'icon' && (
        <span className="ml-2">{isCopied ? 'Copied!' : label}</span>
      )}
    </Button>
  );
}
