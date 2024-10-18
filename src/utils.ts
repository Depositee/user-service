export type UserRegisterSchema = {
  username: string;
  password: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  roomNumber: string;
  salt?: string;
  registeredOn: bigint;
  lastLogInOn: bigint;
};
export type UserGeneralSchema = {
  username?: string;
  firstName?: string;
  email?: string;
  lastName?: string;
  password?: string;
  salt?: string;
  phoneNumber?: string;
  roomNumber?: string;
  role?: number;
  profileImage?: string;
  registeredOn?: bigint;
  lastLogInOn?: bigint;
  id?: string;
};
export type UserUpdateScheme = {
  username?: string;
  firstName?: string;
  email?: string;
  lastName?: string;
  password?: string;
  newPassword?: string;
  confirmNewPassword?: string;
  profileImage?: string;
  phoneNumber?: string;
  roomNumber?: string;
  lastLogInOn?: bigint;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isUserRegisterSchema = (obj: any): obj is UserRegisterSchema => {
  return (
    obj &&
    obj.username &&
    obj.password &&
    obj.email &&
    obj.firstName &&
    obj.lastName &&
    obj.phoneNumber &&
    obj.roomNumber
  );
};
export type UserLoginSchema = {
  username: string;
  password: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isUserLoginSchema = (obj: any): obj is UserLoginSchema => {
  return obj && obj.email && obj.password;
};

export const commonHeaders = {
  "X-Powered-By": "Elysia",
  "X-Who-Is-Aikoyori": "Nobody",
};

export function usernameValidator(username: string): boolean {
  return (
    username.length >= 4 &&
    username.length <= 32 &&
    /^[a-z0-9_]+$/.test(username)
  );
}

export function criteriaCount(criteria: PasswordCriteria): number {
  return (
    criteria!.toString(2).match(/1/g)!.length &&
    criteria & PasswordCriteria.LENGTH
  );
}

export enum RegisterFailReason {
  NONE = 0,
  USERNAME = 1,
  PASSWORD = 2,
  EMAIL = 4,
  PHONE_NUMBER = 8,
}

export enum PasswordCriteria {
  NONE = 0,
  LOWER = 1,
  UPPER = 2,
  NUMBER = 4,
  SYMBOL = 8,
  LENGTH = 16,
  NO_SPACE = 32,
}

export function isUserSchemaValid(obj: UserRegisterSchema): {
  result: boolean;
  reason: RegisterFailReason;
  password?: PasswordCriteria;
} {
  const passwordValidation = passwordValidator(obj.password);
  return {
    result:
      usernameValidator(obj.username) &&
      criteriaCount(passwordValidation) >= 3 &&
      ((passwordValidation >> 4) & 11) == 3 &&
      emailValidator(obj.email) &&
      phoneNumberValidator(obj.phoneNumber),
    reason:
      (usernameValidator(obj.username) ? 0 : RegisterFailReason.USERNAME) |
      (criteriaCount(passwordValidation) >= 3
        ? 0
        : RegisterFailReason.PASSWORD) |
      (((passwordValidation >> 4) & 11) == 3
        ? 0
        : RegisterFailReason.PASSWORD) |
      (emailValidator(obj.email) ? 0 : RegisterFailReason.EMAIL) |
      (phoneNumberValidator(obj.phoneNumber)
        ? 0
        : RegisterFailReason.PHONE_NUMBER),
    password: passwordValidation,
  };
}

export function passwordValidator(password: string): PasswordCriteria {
  let criteria: PasswordCriteria = 32;
  if (password.length >= 8) criteria |= PasswordCriteria.LENGTH;
  if (/[a-z]/.test(password)) criteria |= PasswordCriteria.LOWER;
  if (/[A-Z]/.test(password)) criteria |= PasswordCriteria.UPPER;
  if (/\d+/.test(password)) criteria |= PasswordCriteria.NUMBER;
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+/.test(password))
    criteria |= PasswordCriteria.SYMBOL;
  if (/\s/.test(password)) criteria &= PasswordCriteria.NO_SPACE;
  return criteria;
}

export function emailValidator(email: string): boolean {
  const tested = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(email);
  return tested;
}
export function phoneNumberValidator(phoneNumber: string): boolean {
  return /^[0-9-]{10}$/.test(phoneNumber);
}

import { Database } from "bun:sqlite";
import { MongoClient, Db } from "mongodb";

let db: Db | null = null;

export async function connectToDatabase() {
  // const db = new Database(DATABASE_NAME);\
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI environment variable is not defined");
  }
  const uri = process.env.MONGO_URI;
  const client = new MongoClient(uri);
  try {
    await client.connect();
    db = client.db("test"); // Specify the database here
    console.log("Connected to MongoDB, using database 'test'.");
  } catch (error) {
    console.error("Failed to connect to MongoDB", error);
    throw error;
  }
}

export function getDb() {
  if (!db) throw new Error("Database not connected");
  return db;
}
