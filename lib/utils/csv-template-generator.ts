// =============================================
// CSV Template Generator for Contacts & Organizations
// =============================================

export type TemplateType = 'organizations' | 'contacts';

function escapeCSVValue(value: string): string {
  if (value === '') return '';
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  const escaped = String(value).replace(/"/g, '""');
  if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
    return `"${escaped}"`;
  }
  return escaped;
}

export function generateOrganizationCSVTemplate(): string {
  const headers = [
    'name',
    'organization_type',
    'phone',
    'email',
    'website',
    'notes',
    'site_id',
    'street_1',
    'street_2',
    'city',
    'state',
    'postal_code',
    'country',
  ];

  // Example organization row
  const orgExample = [
    'Acme Clinical Research Site',  // name
    'site',                          // organization_type
    '+1 (555) 123-4567',            // phone
    'contact@acme-research.com',    // email
    'https://www.acme-research.com', // website
    'Primary research site',         // notes
    'SITE-001',                      // site_id
    '123 Main Street',               // street_1
    'Suite 100',                     // street_2
    'Boston',                        // city
    'MA',                            // state
    '02101',                         // postal_code
    'United States',                 // country
  ];

  const csvRows = [
    headers.join(','),
    orgExample.map(escapeCSVValue).join(','),
  ];

  return csvRows.join('\n');
}

export function generateContactCSVTemplate(): string {
  const headers = [
    'first_name',
    'last_name',
    'email',
    'phone',
    'title',
    'credentials',
    'license_number',
    'notes',
    'organization_name',
    'organization_site_id',
    'contact_role',
    'street_1',
    'street_2',
    'city',
    'state',
    'postal_code',
    'country',
  ];

  // Example contact row
  const contactExample = [
    'John',                          // first_name
    'Doe',                           // last_name
    'john.doe@example.com',         // email (required)
    '+1 (555) 987-6543',            // phone
    'Principal Investigator',        // title
    'MD, PhD',                       // credentials
    'MA123456',                      // license_number
    'Principal Investigator',       // notes
    'Acme Clinical Research Site',  // organization_name
    'SITE-001',                      // organization_site_id
    'principal_investigator',       // contact_role
    '456 Oak Avenue',                // street_1
    '',                              // street_2
    'Cambridge',                     // city
    'MA',                            // state
    '02139',                         // postal_code
    'United States',                 // country
  ];

  const csvRows = [
    headers.join(','),
    contactExample.map(escapeCSVValue).join(','),
  ];

  return csvRows.join('\n');
}
