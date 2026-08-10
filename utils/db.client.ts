import * as fs from 'fs';
import * as path from 'path';

export interface RwaUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  balance: number;
  defaultPrivacyLevel: string;
  createdAt: string;
  modifiedAt: string;
}

export interface RwaTransaction {
  id: string;
  uuid: string;
  source: string;
  amount: number;
  description: string;
  privacyLevel: string;
  receiverId: string;
  senderId: string;
  balanceAtCompletion: number;
  status: string;
  requestStatus: string;
  requestResolvedAt: string;
  createdAt: string;
  modifiedAt: string;
}

export interface RwaBankAccount {
  id: string;
  uuid: string;
  userId: string;
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  isDeleted: boolean;
  createdAt: string;
  modifiedAt: string;
}

export interface RwaDatabase {
  users: RwaUser[];
  contacts: Array<{ id: string; uuid: string; userId: string; contactUserId: string }>;
  bankaccounts: RwaBankAccount[];
  transactions: RwaTransaction[];
  likes: unknown[];
  comments: unknown[];
  notifications: unknown[];
  banktransfers: unknown[];
}

const DB_PATH = process.env.RWA_DB_PATH || path.join(process.cwd(), 'rwa-app', 'data', 'database.json');

export class DbClient {
  private dbPath: string;

  constructor(dbPath: string = DB_PATH) {
    this.dbPath = dbPath;
  }

  private read(): RwaDatabase {
    return JSON.parse(fs.readFileSync(this.dbPath, 'utf-8')) as RwaDatabase;
  }

  users(): RwaUser[] {
    return this.read().users;
  }

  user(id: string): RwaUser | undefined {
    return this.read().users.find((u) => u.id === id);
  }

  userByUsername(username: string): RwaUser | undefined {
    return this.read().users.find((u) => u.username === username);
  }

  transactions(): RwaTransaction[] {
    return this.read().transactions;
  }

  transaction(id: string): RwaTransaction | undefined {
    return this.read().transactions.find((t) => t.id === id);
  }

  transactionsForUser(userId: string): RwaTransaction[] {
    return this.read().transactions.filter(
      (t) => t.senderId === userId || t.receiverId === userId,
    );
  }

  bankAccounts(userId: string): RwaBankAccount[] {
    return this.read().bankaccounts.filter((a) => a.userId === userId && !a.isDeleted);
  }

  contacts(): RwaDatabase['contacts'] {
    return this.read().contacts;
  }

  dispose(): void {
    // no-op for JSON file, kept for interface compat
  }
}
