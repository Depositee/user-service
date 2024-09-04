export const mailRegex = /^[^@]+@[^@]+\.[^@]+$/g;

export interface userRegisterSchema {
  username: string;
  password: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  roomNumber: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isUserRegisterSchema = (obj: any): obj is userRegisterSchema => {
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
export interface userLoginSchema {
  username: string;
  password: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isUserLoginSchema = (obj: any): obj is userLoginSchema => {
  return obj && obj.username && obj.password;
};

export const commonHeaders = {
  "X-Powered-By": "Elysia",
  "X-Who-Is-Aikoyori": "Nobody",
};

export function usernameValidator(username: string): boolean {
  return (
    username.length >= 4 &&
    username.length <= 20 &&
    /^[a-zA-Z0-9_]+$/.test(username)
  );
}

export function criteriaCount(criteria: PasswordCriteria): number {
  if (criteria <= 0) return 0;
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

export function isUserSchemaValid(obj: userRegisterSchema): {
  result: boolean;
  reason: RegisterFailReason;
  password?: PasswordCriteria;
} {
  return {
    result:
      usernameValidator(obj.username) &&
      criteriaCount(passwordValidator(obj.password)) > 3 &&
      ((passwordValidator(obj.password) >> 5) & 1) == 1 &&
      emailValidator(obj.email) &&
      phoneNumberValidator(obj.phoneNumber),
    reason:
      (usernameValidator(obj.username) ? 0 : RegisterFailReason.USERNAME) |
      (criteriaCount(passwordValidator(obj.password)) > 3
        ? 0
        : RegisterFailReason.PASSWORD) |
      (passwordValidator(obj.password) & PasswordCriteria.LENGTH
        ? 0
        : RegisterFailReason.PASSWORD) |
      (emailValidator(obj.email) ? 0 : RegisterFailReason.EMAIL) |
      (phoneNumberValidator(obj.phoneNumber)
        ? 0
        : RegisterFailReason.PHONE_NUMBER),
    password: passwordValidator(obj.password),
  };
}

export function passwordValidator(password: string): PasswordCriteria {
  let criteria: PasswordCriteria = 0;
  if (password.length > 8) criteria += PasswordCriteria.LENGTH;
  if (/[a-z]/.test(password)) criteria += PasswordCriteria.LOWER;
  if (/[A-Z]/.test(password)) criteria += PasswordCriteria.UPPER;
  if (/[0-9]/.test(password)) criteria += PasswordCriteria.NUMBER;
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+/.test(password))
    criteria += PasswordCriteria.SYMBOL;
  if (!/\s/.test(password)) criteria += PasswordCriteria.NO_SPACE;
  return criteria;
}

export function emailValidator(email: string): boolean {
  return mailRegex.test(email);
}
export function phoneNumberValidator(phoneNumber: string): boolean {
  return /^[0-9-]{10}$/.test(phoneNumber);
}
