import { expect, test } from '@playwright/test';

/**
 * Requires:
 * - App running (see playwright.config webServer, or start `pnpm dev` yourself)
 * - Authenticated browser state (log in once, or inject storage state in CI)
 * - `E2E_DIRECTORY_CONTACT_URL` = full URL to a directory contact detail page where the
 *   user can edit assignments, **Study linked** completeness is not satisfied (no study links),
 *   and at least two studies are not yet linked.
 */
test.describe('Directory contact — add assignment', () => {
  test('unified dialog: link two studies and see assignments table', async ({ page }) => {
    const contactUrl = process.env.E2E_DIRECTORY_CONTACT_URL;
    test.skip(
      !contactUrl,
      'Set E2E_DIRECTORY_CONTACT_URL to a /protected/directory/contacts/<id> URL (with session).',
    );

    await page.goto(contactUrl!);

    const studyCompletenessBtn = page.getByTestId('directory-completeness-study');
    test.skip(!(await studyCompletenessBtn.isVisible()), 'Study completeness row not found.');
    const studyAria = await studyCompletenessBtn.getAttribute('aria-label');
    test.skip(
      !studyAria?.includes('Open add assignment'),
      'Study linked already complete; use a contact with no study assignments.',
    );
    await studyCompletenessBtn.click();
    await expect(page.getByTestId('add-assignment-dialog')).toBeVisible();

    const linkableRows = page
      .locator('[data-testid="add-assignment-study-row"]')
      .filter({ has: page.getByRole('checkbox', { disabled: false }) });
    const n = await linkableRows.count();
    test.skip(n < 2, 'Need at least two studies not already linked for this contact.');

    const table = page.locator('#contact-study-assignments');
    await expect(table).toBeVisible();
    const rowsBefore = await table.locator('tbody tr').count();

    await linkableRows.nth(0).getByRole('checkbox').click();
    await linkableRows.nth(1).getByRole('checkbox').click();

    await page.getByRole('tab', { name: 'Review' }).click();
    await page.getByTestId('add-assignment-submit').click();

    await expect(page.getByText('Assignments updated')).toBeVisible({ timeout: 30_000 });

    await expect.poll(async () => table.locator('tbody tr').count()).toBeGreaterThanOrEqual(rowsBefore + 2);
  });
});
