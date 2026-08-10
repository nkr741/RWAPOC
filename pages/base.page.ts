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
    await this.page.goto(this.path);
    await this.waitForLoaded();
  }

  currentUrl(): string {
    return this.page.url();
  }
}
