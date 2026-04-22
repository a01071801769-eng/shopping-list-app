const { test, expect } = require('@playwright/test');
const path = require('path');

const FILE_URL = 'file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');

test.beforeEach(async ({ page }) => {
  await page.goto(FILE_URL);
  // localStorage 초기화 후 리로드
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

// ── 아이템 추가 ──────────────────────────────────────────────
test('버튼 클릭으로 아이템 추가', async ({ page }) => {
  await page.fill('#itemInput', '사과');
  await page.click('button:has-text("추가")');

  await expect(page.locator('.item-name')).toHaveText('사과');
  await expect(page.locator('li')).toHaveCount(1);
});

test('Enter 키로 아이템 추가', async ({ page }) => {
  await page.fill('#itemInput', '바나나');
  await page.press('#itemInput', 'Enter');

  await expect(page.locator('.item-name')).toHaveText('바나나');
});

test('빈 입력으로 추가 시 아이템 생성 안 됨', async ({ page }) => {
  await page.click('button:has-text("추가")');
  await expect(page.locator('li')).toHaveCount(0);
});

test('여러 아이템 추가', async ({ page }) => {
  for (const name of ['우유', '계란', '빵']) {
    await page.fill('#itemInput', name);
    await page.press('#itemInput', 'Enter');
  }
  await expect(page.locator('li')).toHaveCount(3);
});

test('아이템 추가 후 입력창 비워짐', async ({ page }) => {
  await page.fill('#itemInput', '오렌지');
  await page.press('#itemInput', 'Enter');
  await expect(page.locator('#itemInput')).toHaveValue('');
});

// ── 체크 기능 ────────────────────────────────────────────────
test('체크박스 클릭으로 완료 처리', async ({ page }) => {
  await page.fill('#itemInput', '우유');
  await page.press('#itemInput', 'Enter');

  await page.locator('input[type="checkbox"]').click();
  await expect(page.locator('.item-name')).toHaveClass(/done/);
  await expect(page.locator('input[type="checkbox"]')).toBeChecked();
});

test('완료 항목을 다시 클릭하면 미완료로 복원', async ({ page }) => {
  await page.fill('#itemInput', '계란');
  await page.press('#itemInput', 'Enter');

  const cb = page.locator('input[type="checkbox"]');
  await cb.click();
  await cb.click();

  await expect(cb).not.toBeChecked();
  await expect(page.locator('.item-name')).not.toHaveClass(/done/);
});

// ── 삭제 기능 ────────────────────────────────────────────────
test('✕ 버튼으로 아이템 삭제', async ({ page }) => {
  await page.fill('#itemInput', '빵');
  await page.press('#itemInput', 'Enter');

  await page.locator('.del-btn').click();
  await expect(page.locator('li')).toHaveCount(0);
  await expect(page.locator('#empty')).toBeVisible();
});

test('여러 아이템 중 특정 항목만 삭제', async ({ page }) => {
  for (const name of ['우유', '계란', '빵']) {
    await page.fill('#itemInput', name);
    await page.press('#itemInput', 'Enter');
  }

  // 두 번째 항목(계란) 삭제 — 최신순이므로 위쪽부터: 빵, 계란, 우유
  await page.locator('.del-btn').nth(1).click();
  await expect(page.locator('li')).toHaveCount(2);
  await expect(page.locator('.item-name').nth(0)).toHaveText('빵');
  await expect(page.locator('.item-name').nth(1)).toHaveText('우유');
});

// ── 완료 항목 일괄 삭제 ──────────────────────────────────────
test('완료 항목 모두 삭제', async ({ page }) => {
  for (const name of ['우유', '계란', '빵']) {
    await page.fill('#itemInput', name);
    await page.press('#itemInput', 'Enter');
  }

  // 첫 번째 항목(빵) 체크
  await page.locator('input[type="checkbox"]').first().click();
  await page.click('button.clear-done');

  await expect(page.locator('li')).toHaveCount(2);
  const names = await page.locator('.item-name').allTextContents();
  expect(names).not.toContain('빵');
});

// ── 필터 기능 ────────────────────────────────────────────────
test('미완료 필터', async ({ page }) => {
  for (const name of ['우유', '계란']) {
    await page.fill('#itemInput', name);
    await page.press('#itemInput', 'Enter');
  }
  // 계란(최신순 첫 번째) 체크
  await page.locator('input[type="checkbox"]').first().click();

  await page.click('[data-filter="pending"]');
  await expect(page.locator('li')).toHaveCount(1);
  await expect(page.locator('.item-name')).toHaveText('우유');
});

test('완료 필터', async ({ page }) => {
  for (const name of ['우유', '계란']) {
    await page.fill('#itemInput', name);
    await page.press('#itemInput', 'Enter');
  }
  await page.locator('input[type="checkbox"]').first().click();

  await page.click('[data-filter="done"]');
  await expect(page.locator('li')).toHaveCount(1);
  await expect(page.locator('.item-name')).toHaveText('계란');
});

test('전체 필터 복귀', async ({ page }) => {
  for (const name of ['우유', '계란']) {
    await page.fill('#itemInput', name);
    await page.press('#itemInput', 'Enter');
  }
  await page.click('[data-filter="pending"]');
  await page.click('[data-filter="all"]');
  await expect(page.locator('li')).toHaveCount(2);
});

// ── localStorage 영속성 ──────────────────────────────────────
test('페이지 새로고침 후 데이터 유지', async ({ page }) => {
  await page.fill('#itemInput', '망고');
  await page.press('#itemInput', 'Enter');

  await page.reload();
  await expect(page.locator('.item-name')).toHaveText('망고');
});

test('체크 상태 새로고침 후 유지', async ({ page }) => {
  await page.fill('#itemInput', '포도');
  await page.press('#itemInput', 'Enter');
  await page.locator('input[type="checkbox"]').click();

  await page.reload();
  await expect(page.locator('input[type="checkbox"]')).toBeChecked();
  await expect(page.locator('.item-name')).toHaveClass(/done/);
});

// ── 요약 카운터 ──────────────────────────────────────────────
test('요약 카운터 정확성', async ({ page }) => {
  for (const name of ['우유', '계란', '빵']) {
    await page.fill('#itemInput', name);
    await page.press('#itemInput', 'Enter');
  }
  await page.locator('input[type="checkbox"]').first().click();

  const summary = await page.locator('#summary').textContent();
  expect(summary).toContain('전체 3개');
  expect(summary).toContain('완료 1개');
});
