import { Button } from '@react-email/components';
import { emailColors } from './layout';

export interface CtaButtonProps {
  href: string;
  children: string;
}

/**
 * Primary call-to-action button shared by every template. Inline styles so it
 * survives Outlook / Gmail rewrites; do not depend on Tailwind here.
 */
export function CtaButton({ href, children }: CtaButtonProps) {
  return (
    <Button
      href={href}
      style={{
        backgroundColor: emailColors.brand,
        borderRadius: '6px',
        color: '#ffffff',
        display: 'inline-block',
        fontSize: '14px',
        fontWeight: 600,
        padding: '12px 22px',
        textDecoration: 'none',
      }}
    >
      {children}
    </Button>
  );
}
