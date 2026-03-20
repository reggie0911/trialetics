import React from 'react';

export interface InviteEmailProps {
  firstName: string;
  lastName: string;
  inviteLink: string;
}

export function InviteEmail({ firstName, lastName, inviteLink }: InviteEmailProps) {
  const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'there';

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto', padding: '24px' }}>
      <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#374151' }}>
        Hi {displayName},
      </p>
      <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#374151' }}>
        You&apos;ve been invited to join Trialetics to collaborate on clinical trial activities.
      </p>
      <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#374151' }}>
        Please click the link below to set up your account and get started:
      </p>
      <p style={{ margin: '24px 0' }}>
        <a
          href={inviteLink}
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            textDecoration: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: '600',
          }}
        >
          Accept Invitation
        </a>
      </p>
      <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#6b7280' }}>
        Once logged in, you can access assigned studies and track progress.
      </p>
      <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#374151', marginTop: '24px' }}>
        Welcome to the team!
      </p>
      <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '24px' }}>
        Kind regards,<br />
        Trialetics.io
      </p>
    </div>
  );
}
