import type { Page } from '@playwright/test';
import { SideNavComponent } from './components/sidenav.component';
import { TopNavComponent } from './components/topnav.component';

export abstract class BasePage {
  readonly sidenav: SideNavComponent;
  readonly topnav: TopNavComponent;

  constructor(public readonly page: Page) {
    this.sidenav = new SideNavComponent(page);
    this.topnav = new TopNavComponent(page);
  }

  abstract readonly path: string;
  abstract waitForLoaded(): Promise<void>;

  async open(): Promise<void> {
    // 'domcontentloaded' rather than the default 'load': waitForLoaded() below is
    // the real readiness gate, so blocking on every subresource first is redundant.
    // Note this does NOT make the suite dev-server-safe on its own — Vite's HMR
    // connection stops Firefox ever firing 'load', and other navigations (link
    // clicks, helper gotos) still wait for it. For local cross-browser runs, start
    // RWA the way CI does: `yarn build && yarn start:ci`.
    await this.page.goto(this.path, { waitUntil: 'domcontentloaded' });
    await this.waitForLoaded();
  }

  currentUrl(): string {
    return this.page.url();
  }
}
