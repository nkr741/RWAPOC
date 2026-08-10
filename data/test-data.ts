import { faker } from '@faker-js/faker';
import { ENV } from '../config/env';

export const TestUsers = {
  default: {
    username: ENV.user.username,
    password: ENV.user.password,
    firstName: 'Neha',
    lastName: 'Hilpert',
  },
  invalid: {
    username: faker.internet.username(),
    password: faker.internet.password(),
  },
} as const;

export const BankAccountData = {
  valid: {
    bankName: `${faker.company.name()} Bank`,
    routingNumber: faker.finance.routingNumber(),
    accountNumber: faker.finance.accountNumber(9),
  },
  invalidRouting: {
    bankName: faker.company.name(),
    routingNumber: '123',
    accountNumber: faker.finance.accountNumber(9),
  },
} as const;

export const TransactionData = {
  payment: {
    amount: faker.number.int({ min: 1, max: 50 }).toString(),
    description: `Payment ${faker.word.adjective()} ${faker.word.noun()}`,
  },
  request: {
    amount: faker.number.int({ min: 10, max: 100 }).toString(),
    description: `Request ${faker.word.adjective()} ${faker.word.noun()}`,
  },
  quickPay: {
    amount: '1',
    description: `QuickPay ${faker.string.nanoid(6)}`,
  },
} as const;

export const SignupData = {
  newUser: () => ({
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    username: faker.internet.username().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
    password: faker.internet.password({ length: 12 }),
  }),
} as const;
